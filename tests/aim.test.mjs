import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeState,addPlayer,startShift,setInput,act,tick,STEP} from '../src/engine.mjs';
import {launch,predictThrow,readAim,readPower} from '../src/aim.mjs';
import {HEAD_LIMIT} from '../src/pose.mjs';
const game=()=>{const s=makeState('AIM');const p=addPlayer(s,'bird');startShift(s);p.x=.5;p.z=0;act(s,p,'grab');tick(s);return {s,p};};
test('aim varies continuously while walking remains independent',()=>{
  const {s,p}=game();setInput(s,p,{seq:1,x:1,z:0,jump:false,aim:.934,power:.42});tick(s);
  assert.equal(p.a,0);assert.equal(p.aim,.934);assert.equal(p.aimPower,.42);assert(p.vx>0);
  act(s,p,'throw',{aim:.934,power:.42});assert(Math.abs(Math.atan2(s.cargo.vz,s.cargo.vx)-.934)<1e-12);assert(Math.abs(Math.hypot(s.cargo.vx,s.cargo.vz)-8*.42)<1e-12);
});
test('server rejects malformed look directions and bounds launch strength',()=>{
  const {s,p}=game();p.a=.7;for(const value of [NaN,Infinity,-Infinity,'1',{},null])assert.equal(readAim(value,.7),.7);
  const strong=launch(s,p,{aim:Infinity,power:1000});assert.equal(strong.angle,.7);assert.equal(strong.speed,8);assert.equal(readPower(-10),.18);
  setInput(s,p,{seq:1,x:0,z:0,jump:false,aim:Infinity,power:-1});assert.equal(p.input.aim,null);assert.equal(p.input.power,.18);
});
test('stationary action can provide fresh mouse aim before the next input packet',()=>{
  const {s,p}=game();p.a=0;act(s,p,'throw',{aim:2.718,power:.7});assert(Math.abs(Math.atan2(s.cargo.vz,s.cargo.vx)-HEAD_LIMIT)<1e-12);
});
test('trajectory first impact matches actual authoritative fixed-step cargo',()=>{
  const {s,p}=game();const request={aim:.31,power:.47},preview=predictThrow(s,p,request);assert.equal(preview.hit,'roof');
  act(s,p,'throw',request);for(let i=0;i<180;i++){tick(s,STEP);if(s.cargo.ground)break;}
  assert(Math.hypot(s.cargo.x-preview.landing.x,s.cargo.z-preview.landing.z)<.02);assert(Math.abs(s.cargo.y-preview.landing.y)<.02);
});
test('gust cone follows free aim rather than WASD body angle',()=>{
  const {s,p}=game();p.grip=null;p.a=0;Object.assign(s.cargo,{x:p.x,z:3,y:.8,vx:0,vz:0});act(s,p,'gust',{aim:Math.PI/2});assert(s.cargo.vz>3);assert(Math.abs(Math.atan2(s.cargo.vz,s.cargo.vx)-HEAD_LIMIT)<1e-6);
});
