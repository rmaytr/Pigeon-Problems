import {WebSocket} from 'ws';
import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://127.0.0.1:5173',wait=ms=>new Promise(r=>setTimeout(r,ms));
const {code}=await fetch(base+'/api/rooms',{method:'POST'}).then(r=>r.json()),clients=[];
for(let i=0;i<2;i++){
  const ws=new WebSocket(base.replace('http','ws')+'/ws?room='+code),c={ws,seq:0,n:0};
  await new Promise((r,j)=>{ws.on('open',()=>ws.send(JSON.stringify({type:'join',name:'Aim QA '+i})));ws.on('error',j);ws.on('message',raw=>{const m=JSON.parse(raw);if(m.state)c.state=m.state;if(m.type==='welcome'){c.id=m.id;r();}});});
  c.action=(action,value)=>ws.send(JSON.stringify({type:'action',n:++c.n,action,value}));clients.push(c);
}
try{
  const [a,b]=clients;a.action('start');await wait(200);a.action('grab');await wait(200);assert.notEqual(a.state.players.find(p=>p.id===a.id).grip,null);
  for(let i=0;i<6;i++){a.ws.send(JSON.stringify({type:'input',seq:++a.seq,x:0,z:0,jump:false,aim:.631,power:.54}));await wait(35);}
  assert(Math.abs(b.state.players.find(p=>p.id===a.id).aim-.631)<1e-9);
  a.action('throw',{aim:.631,power:.54});await wait(100);const c=b.state.cargo;assert.equal(c.throwId,1);assert(Math.abs(Math.atan2(c.vz,c.vx)-.631)<1e-9);assert(Math.abs(Math.hypot(c.vx,c.vz)-8*.54)<1e-9);
  const body=a.state.players.find(p=>p.id===a.id).a;
  for(let i=0;i<6;i++){a.ws.send(JSON.stringify({type:'input',seq:++a.seq,x:0,z:0,jump:false,aim:body+Math.PI,power:1}));await wait(35);}
  const observed=b.state.players.find(p=>p.id===a.id),delta=Math.atan2(Math.sin(observed.aim-body),Math.cos(observed.aim-body));assert(Math.abs(delta)<=65*Math.PI/180+1e-9);assert.equal(observed.a,body);
  console.log('PASS server: continuous aim/power replicate, head remains within 65 degrees, stationary body never turns.');
}finally{for(const c of clients)c.ws.close();}
