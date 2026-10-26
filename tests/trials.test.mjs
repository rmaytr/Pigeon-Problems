import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeState,addPlayer,act,setInput,tick,disconnect,snapshot} from '../src/engine.mjs';
import {COURSES,getCourse,coursePlatforms,coursePoint,courseSurface,checkpointPad,liftHeight} from '../src/courses.mjs';
import {makeTrialRun,solveTrial} from './trial-pilot.mjs';
import {Room} from '../server/room.mjs';
const frames=(s,n,input={x:0,z:0,jump:false})=>{for(let i=0;i<n;i++){for(const p of s.players)if(p.connected)setInput(s,p,{...input,seq:p.seq+1});tick(s);}return s;};
const put=(p,q)=>Object.assign(p,{x:q.x,y:q.y,z:q.z,ground:true,platformId:q.id,vx:0,vy:0,vz:0,respawnUntil:0});
for(const count of [1,4])for(const c of COURSES)test(c.name+' has a complete '+count+'-pigeon input-driven route',()=>{
  const {s}=solveTrial(c.id,count,100);assert.equal(s.phase,'results',JSON.stringify({course:c.id,checkpoint:s.trial.checkpoint,stamps:s.trial.stamps,falls:s.trial.falls}));assert.equal(s.trial.stamps.length,3);assert.equal(s.trial.ready.length,count);if(c.cargo)assert(s.trial.cargoDelivered);assert(s.trial.result.time>10);assert(Number.isFinite(s.trial.result.score));
});
test('walking alone cannot clear any rooftop trial',()=>{
  for(const c of COURSES){const s=makeTrialRun(c.id);frames(s,600,{x:1,z:0,jump:false});assert.equal(s.phase,'playing',c.id);assert.equal(s.trial.stamps.length,0,c.id);assert.equal(s.trial.checkpoint,0,c.id);}
});
test('only the host selects valid courses and selection is locked during a run',()=>{
  const s=makeState(),a=addPlayer(s,'a'),b=addPlayer(s,'b');assert(!act(s,b,'course','peak'));assert(!act(s,a,'course','missing'));assert(act(s,a,'course','peak'));assert.equal(s.mode,'trials');assert(act(s,a,'start'));assert(!act(s,a,'course','chimneys'));assert.equal(s.course,'peak');
});
test('a stationary rider follows horizontal moving-platform displacement',()=>{
  const s=makeTrialRun('laundry'),p=s.players[0];put(p,coursePlatforms(s).find(p=>p.id==='l2'));frames(s,100);const platform=coursePlatforms(s).find(p=>p.id==='l2');assert.equal(p.platformId,'l2');assert(Math.abs(p.z-platform.z)<.02);assert(Math.abs(p.y-platform.y)<.01);
});
test('the charged freight lift carries a rider upward without another jump',()=>{
  const s=makeTrialRun('freight'),p=s.players[0];put(p,getCourse(s).plate);frames(s,1);assert(s.trial.liftStart>=0);frames(s,181);const q=coursePlatforms(s).find(p=>p.id==='lift');put(p,q);const before=p.y;frames(s,100);assert(p.y>before+1);assert(Math.abs(p.y-liftHeight(s))<.01);assert(p.ground);
});
test('crumbling perches warn, disappear, and recover for another attempt',()=>{
  const s=makeTrialRun('clockwork'),p=s.players[0];put(p,coursePlatforms(s).find(p=>p.id==='k2'));frames(s,1);assert('k2' in s.trial.crumbles);frames(s,88);const q=coursePlatforms(s).find(p=>p.id==='k2');assert(!q.active);assert(q.warning);assert.equal(courseSurface(s,q.x,q.z,100),null);frames(s,240);assert(coursePlatforms(s).find(p=>p.id==='k2').active);
});

test('stepping on the freight plate again cannot restart an active lift cycle',()=>{
  const s=makeTrialRun('freight'),p=s.players[0],plate=getCourse(s).plate;put(p,plate);frames(s,1);const started=s.trial.liftStart;
  put(p,coursePlatforms(s).find(p=>p.id==='start'));frames(s,240);put(p,plate);frames(s,1);assert.equal(s.trial.liftStart,started);assert(liftHeight(s)>1);
  frames(s,500);assert(s.trial.liftStart>started+12);
});
test('the timed fan lifts a pigeon while a resting fan does not',()=>{
  const s=makeTrialRun('gusts'),p=s.players[0];put(p,coursePlatforms(s).find(p=>p.id==='g1'));frames(s,1);assert(p.vy>9);s.t=3.5;s.trial.revision++;put(p,coursePlatforms(s).find(p=>p.id==='g1'));frames(s,1);assert.equal(p.vy,0);assert(p.ground);
});
test('vane interaction is range-validated and the temporary floor really expires',()=>{
  const s=makeTrialRun('gusts'),p=s.players[0],c=getCourse(s);assert(!act(s,p,'grab'));frames(s,20);const v=coursePoint(s,c.vanes[0]);put(p,{...v,id:'g3'});assert(act(s,p,'grab'));assert(coursePlatforms(s).find(p=>p.id==='g4').active);frames(s,850);assert(!coursePlatforms(s).find(p=>p.id==='g4').active);
});
test('stamps collect once and falls/late joins preserve the latest checkpoint',()=>{
  const s=makeTrialRun('chimneys'),p=s.players[0];put(p,coursePlatforms(s).find(p=>p.id==='c1'));frames(s,2);assert.deepEqual(s.trial.stamps,[0]);put(p,coursePlatforms(s).find(p=>p.id==='c3'));frames(s,2);assert.equal(s.trial.checkpoint,1);assert(act(s,p,'rescue'));assert.deepEqual(s.trial.stamps,[0]);assert.equal(s.trial.falls,1);assert(Math.abs(p.x-checkpointPad(s).x)<1);const b=addPlayer(s,'late');assert.equal(b.platformId,'c3');assert(Math.abs(b.y-p.y)<.01);assert.deepEqual(snapshot(s).trial.stamps,[0]);
});
test('a crew needs all stamps and all connected pigeons at the finish',()=>{
  const s=makeTrialRun('chimneys',2),[a,b]=s.players,end=getCourse(s).platforms.at(-1);put(a,end);frames(s,1);assert.equal(s.phase,'playing');s.trial.stamps=[0,1,2];frames(s,1);assert.equal(s.phase,'playing');disconnect(s,b.id);frames(s,1);assert.equal(s.phase,'results');assert.equal(s.trial.ready.length,1);
});
test('freight completion additionally requires the parcel placed and resting',()=>{
  const s=makeTrialRun('freight'),p=s.players[0],end=getCourse(s).platforms.at(-1);s.trial.stamps=[0,1,2];put(p,end);frames(s,5);assert.equal(s.phase,'playing');Object.assign(s.cargo,{x:end.x,y:end.y+.45,z:end.z,ground:true});frames(s,30);assert.equal(s.phase,'results');assert(s.trial.cargoDelivered);
});
test('the low mail sorter hits a grounded pigeon but can be jumped over',()=>{
  const s=makeTrialRun('clockwork'),p=s.players[0],q=coursePlatforms(s).find(p=>p.id==='k6');put(p,{...q,z:q.z+.65});frames(s,1);assert.equal(s.trial.falls,1);put(p,{...q,z:q.z+.65,y:q.y+1.8});p.ground=false;frames(s,1);assert.equal(s.trial.falls,1);
});
test('trial flight requires earlier landings than delivery practice',()=>{
  const a=makeTrialRun('chimneys'),b=makeState();addPlayer(b,'classic');act(b,b.players[0],'start');frames(a,54,{x:0,z:0,jump:true});frames(b,54,{x:0,z:0,jump:true});assert(a.players[0].stamina<b.players[0].stamina-.25);
});
test('next course and retries reset run state without removing the crew',()=>{
  const s=makeTrialRun('chimneys',2),[a,b]=s.players;s.phase='results';assert(!act(s,b,'next-course'));assert(act(s,a,'next-course'));assert.equal(s.course,'laundry');assert.equal(s.players.length,2);assert.equal(s.phase,'playing');assert.deepEqual(s.trial.stamps,[]);assert.equal(s.trial.falls,0);s.phase='results';assert(act(s,a,'rematch'));assert.equal(s.course,'laundry');
});
test('a higher shared checkpoint does not kill a teammate on a lower roof',()=>{
  const s=makeTrialRun('peak',2),[a,b]=s.players;s.trial.checkpoint=2;put(a,getCourse(s).platforms.find(p=>p.id==='p7'));put(b,getCourse(s).platforms[0]);frames(s,30);assert.equal(s.trial.falls,0);assert.equal(b.platformId,'start');assert.equal(b.y,0);
});
test('earlier roofs remain safe for backtracking to a missed stamp',()=>{
  const s=makeTrialRun('chimneys'),p=s.players[0];s.trial.checkpoint=2;put(p,getCourse(s).platforms.find(p=>p.id==='c1'));frames(s,3);assert.equal(s.trial.falls,0);assert.deepEqual(s.trial.stamps,[0]);assert.equal(p.platformId,'c1');
});

test('serialized room restoration preserves trial progress, mechanisms and return tickets',()=>{
  const room=new Room('TRIALS'),socket={messages:[],send(v){this.messages.push(JSON.parse(v));},close(){}};
  const id=room.join(socket,{type:'join',name:'Returning bird'}),ticket=socket.messages.find(m=>m.type==='welcome').token,p=room.s.players[0];
  act(room.s,p,'course','gusts');act(room.s,p,'start');room.s.trial.checkpoint=1;room.s.trial.stamps=[0,1];room.s.trial.gates.vane=room.s.t+8;room.s.trial.falls=2;
  const restored=new Room('TRIALS','shift',JSON.parse(JSON.stringify(room.save()))),next={messages:[],send(v){this.messages.push(JSON.parse(v));},close(){}};
  assert.equal(restored.join(next,{type:'join',token:ticket}),id);assert.equal(restored.s.course,'gusts');assert.equal(restored.s.phase,'playing');assert.deepEqual(restored.s.trial.stamps,[0,1]);assert.equal(restored.s.trial.checkpoint,1);assert.equal(restored.s.trial.falls,2);assert.equal(restored.s.trial.gates.vane,8);assert.equal(restored.s.host,id);assert(!JSON.stringify(snapshot(restored.s)).includes(ticket));
});
