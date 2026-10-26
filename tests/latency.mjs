import assert from 'node:assert/strict';
import {WebSocketServer,WebSocket} from 'ws';
const target=process.env.TEST_URL||'http://127.0.0.1:5173',delay=ms=>new Promise(r=>setTimeout(r,ms));
const {code}=await fetch(target+'/api/rooms',{method:'POST'}).then(r=>r.json());
const proxy=new WebSocketServer({port:0});await new Promise(r=>proxy.on('listening',r));
proxy.on('connection',client=>{
  const upstream=new WebSocket(target.replace('http','ws')+'/ws?room='+code),queued=[];
  client.on('message',data=>{if(upstream.readyState===1)setTimeout(()=>{if(upstream.readyState===1)upstream.send(data.toString());},150);else queued.push(data.toString());});
  upstream.on('open',()=>{for(const d of queued)setTimeout(()=>{if(upstream.readyState===1)upstream.send(d);},150);});
  upstream.on('message',data=>setTimeout(()=>{if(client.readyState===1)client.send(data);},150));
  client.on('close',()=>upstream.close());upstream.on('close',()=>client.close());
});
const ws=new WebSocket('ws://127.0.0.1:'+proxy.address().port);let state,id,seq=0;
async function until(predicate){const start=Date.now();while(!predicate()){if(Date.now()-start>15000)throw Error('Delayed state wait timed out');await delay(25);}}
await new Promise((r,j)=>{const timeout=setTimeout(()=>j(Error('Delayed proxy join timed out')),10000);ws.on('open',()=>ws.send(JSON.stringify({type:'join',name:'Latency pigeon'})));ws.on('error',j);ws.on('message',raw=>{const m=JSON.parse(raw);if(m.state)state=m.state;if(m.type==='welcome'){clearTimeout(timeout);id=m.id;r();}});});
try{
  ws.send(JSON.stringify({type:'action',action:'start',n:1}));await until(()=>state.phase==='playing');assert.equal(state.phase,'playing');
  const before=state.players[0].x;
  // Stay on Dispatch: the previous 20-input route could walk off its edge and
  // mistake automatic fall recovery for failure of the stale-input timeout.
  for(let i=0;i<10;i++){ws.send(JSON.stringify({type:'input',seq:++seq,x:1,z:0,jump:false}));await delay(33);}
  await until(()=>state.players[0].seq===seq&&state.t-state.players[0].lastInput>.8);
  assert(state.players[0].x>before+2);assert(state.players[0].ground&&state.players[0].rescues===0,'timeout is observed on the roof without automatic rescue');
  const stopped=state.players[0].x,stoppedAt=state.t;
  await until(()=>state.t>stoppedAt+.5);assert(Math.abs(state.players[0].x-stopped)<.15,'input timeout stops a silent client');
  assert(Math.abs(state.players[0].vx)<.01,'silent client has stopped horizontal velocity');
  ws.send(JSON.stringify({type:'action',action:'rescue',n:2}));await until(()=>state.players.find(p=>p.id===id).rescues===1);assert.equal(state.players.find(p=>p.id===id).x,0);
  console.log('PASS: 300 ms added round-trip latency over WebSocket, movement, stale-input stop and checkpoint rescue.');
}finally{ws.close();proxy.close();}
