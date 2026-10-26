import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {writeFile} from 'node:fs/promises';
import {COURSES} from '../src/courses.mjs';
import {trialPilot} from './trial-pilot.mjs';
const base=process.env.TEST_URL||'http://127.0.0.1:5173',count=Number(process.env.CREW_SIZE)||4,selected=process.env.COURSES?.split(',')||COURSES.map(c=>c.id),wait=ms=>new Promise(r=>setTimeout(r,ms)),clients=[],results=[];
const {code}=await fetch(base+'/api/rooms',{method:'POST'}).then(r=>r.json());
async function connect(index,token){
 const ws=new WebSocket(base.replace('http','ws')+'/ws?room='+code),c={ws,n:0,seq:0,lastAction:{}};
 await new Promise((resolve,reject)=>{ws.on('error',reject);ws.on('open',()=>ws.send(JSON.stringify({type:'join',name:'Course QA '+index,token})));ws.on('message',raw=>{const m=JSON.parse(raw);if(m.state)c.state=m.state;if(m.type==='welcome'){c.id=m.id;c.token=m.token;c.seq=m.seq;resolve();}if(m.type==='error')console.log('SERVER '+m.message);});});
 c.action=(action,value)=>ws.send(JSON.stringify({type:'action',action,value,n:++c.n}));c.input=input=>ws.send(JSON.stringify({type:'input',...input,seq:++c.seq}));return c;
}
async function until(predicate,timeout=5000){const start=Date.now();while(!predicate()){if(Date.now()-start>timeout)throw Error('Network state wait timed out');await wait(25);}}
try{
 for(let i=0;i<count;i++)clients.push(await connect(i));
 const lead=clients[0];lead.action('course',selected[0]);await until(()=>lead.state.course===selected[0]);if(clients[1]){clients[1].action('course',COURSES.find(c=>c.id!==selected[0]).id);await wait(100);assert.equal(lead.state.course,selected[0]);}
 for(const id of selected){
  lead.action('course',id);await until(()=>lead.state.phase==='lobby'&&lead.state.course===id);lead.action('start');await until(()=>lead.state.phase==='playing');
  const pilots=clients.map((c,i)=>trialPilot(c.id,i)),start=Date.now();
  while(Date.now()-start<130000&&lead.state.phase==='playing'){
   const s=lead.state;
   for(let i=0;i<clients.length;i++){const c=clients[i],p=s.players.find(p=>p.id===c.id);assert(c.ws.readyState===WebSocket.OPEN,'client remains connected');const d=pilots[i].decide(s,p);c.input(d.input);for(const a of new Set(d.actions))if(Date.now()-(c.lastAction[a]??0)>230){c.action(a);c.lastAction[a]=Date.now();}}
   await wait(33);
  }
  assert.equal(lead.state.phase,'results',JSON.stringify({course:id,state:lead.state,pilot:pilots.map(p=>p.index)}));await until(()=>clients.every(c=>c.state.phase==='results'));
  const result=lead.state.trial.result;for(const c of clients)assert.deepEqual(c.state.trial.result,result);assert.equal(lead.state.trial.stamps.length,3);results.push({...result});console.log('PASS '+count+'-client '+id+': '+result.time+'s, '+result.falls+' falls, identical crew results.');
 }
 const result=lead.state;lead.action('rematch');await until(()=>lead.state.phase==='playing');assert.equal(lead.state.trial.stamps.length,0);assert.equal(lead.state.trial.falls,0);assert.equal(lead.state.players.filter(p=>p.connected).length,count);
 if(!process.env.NO_REPORT)await writeFile('evidence/trials-network-'+count+'.json',JSON.stringify({date:new Date().toISOString(),base,room:code,count,results,rematch:true,input:'real WebSockets, server-owned positions, normal inputs/actions only'},null,2));
 console.log('PASS trial selection authority, crew completion, all stamps, results and rematch. Room '+code);
}finally{for(const c of clients)c.ws.close();}
