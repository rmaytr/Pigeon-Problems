import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
const base=process.env.TEST_URL||'http://127.0.0.1:5173';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(predicate){const start=Date.now();while(!predicate()){if(Date.now()-start>5000)throw Error('Network state wait timed out');await delay(25);}}
const room=await fetch(base+'/api/rooms',{method:'POST'}).then(r=>r.json());
async function connect(name,token){
  const ws=new WebSocket(base.replace('http','ws')+'/ws?room='+room.code);
  const client={ws,state:null,id:null,token:null,seq:0,n:0};
  await new Promise((resolve,reject)=>{ws.on('open',()=>ws.send(JSON.stringify({type:'join',name,token})));ws.on('error',reject);ws.on('message',raw=>{const m=JSON.parse(raw);if(m.state)client.state=m.state;if(m.type==='welcome'){Object.assign(client,{id:m.id,token:m.token,seq:m.seq});resolve();}});});
  client.action=action=>ws.send(JSON.stringify({type:'action',action,n:++client.n}));
  client.input=(x,z,jump=false)=>ws.send(JSON.stringify({type:'input',x,z,jump,seq:++client.seq}));
  return client;
}
const a=await connect('Test Courier A'),b=await connect('Test Courier B');
await delay(100);assert.equal(a.state.players.length,2);assert.equal(b.state.players.length,2);
a.action('start');await delay(100);
assert.equal(a.state.phase,'playing');
const start=a.state.players.find(p=>p.id===a.id).x;
for(let i=0;i<13;i++){a.input(1,0);b.input(1,0);await delay(32);}
a.input(0,0);b.input(0,0);await delay(120);
assert(a.state.players.find(p=>p.id===a.id).x>start+1,'real socket movement');
a.action('grab');b.action('grab');await delay(100);
assert(a.state.players.some(p=>p.grip!==null),'socket cargo ownership');
assert(new Set(a.state.players.filter(p=>p.grip!==null).map(p=>p.grip)).size===a.state.players.filter(p=>p.grip!==null).length,'unique grip endpoints');
const token=b.token,id=b.id;b.ws.close();await delay(100);
const re=await connect('Ignored rename',token);await delay(100);assert.equal(re.id,id);assert.equal(re.state.order,a.state.order);
const c=await connect('Test Courier C'),d=await connect('Test Courier D');await delay(100);assert.equal(a.state.players.filter(p=>p.connected).length,4);
const x=a.state.players.find(p=>p.id===a.id).x;
a.ws.send(JSON.stringify({type:'input',seq:++a.seq,x:999999,z:0,jump:false}));await delay(80);
assert(a.state.players.find(p=>p.id===a.id).x-x<1,'speed clamped');
a.ws.close();await until(()=>re.state.host===re.id);assert.equal(re.state.host,re.id,'host departure migration');
for(const client of [re,c,d])client.ws.close();
console.log('PASS: real WebSocket two-client movement/carrying, grip exclusivity, refresh identity, four clients, input clamp, host migration.');
