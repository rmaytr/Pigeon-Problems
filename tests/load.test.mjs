import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeState,addPlayer,startShift,spawnCargo,act,tick,disconnect} from '../src/engine.mjs';
import {ORDERS,floorAt} from '../src/world.mjs';
import {cargoPoint,cargoRadius,gripPoint} from '../src/cargo.mjs';
import {beakPoint,HEAD_LIMIT,lookHeading,angleDelta} from '../src/pose.mjs';
const simulate=(s,n)=>{for(let i=0;i<n;i++){for(const p of s.players)p.lastInput=s.t;tick(s);}};
function load(){const s=makeState(),p=addPlayer(s,'a');startShift(s);s.order=1;spawnCargo(s);s.cargo.a=s.cargo.targetA=0;Object.assign(p,{x:11,z:0,y:1,a:0});assert(act(s,p,'grab'));return {s,p,o:ORDERS[1]};}
test('one-ended long cargo sags under gravity, contacts floor, and stays attached to the beak',()=>{
  const {s,p,o}=load();simulate(s,180);assert(s.cargo.pitch<-.1);assert(s.cargo.dragging);const end=cargoPoint(s.cargo,o,o.length/2),floor=floorAt(end.x,end.z,100,s.t,s.bridge);assert(Math.abs(end.y-cargoRadius(o)-floor)<.025);const grip=gripPoint(s.cargo,o,p.grip),beak=beakPoint(p);assert(Math.hypot(grip.x-beak.x,grip.y-beak.y,grip.z-beak.z)<.06);
});
test('two carriers lift both ends and release/disconnect lets the unsupported end fall',()=>{
  const {s,p,o}=load();simulate(s,120);const q=addPlayer(s,'b');Object.assign(q,{x:p.x+o.length*.84,y:1,z:0,a:0,grip:1});simulate(s,120);assert(Math.abs(s.cargo.pitch)<.01);assert(!s.cargo.dragging);disconnect(s,q.id);simulate(s,120);assert(s.cargo.dragging);assert(s.cargo.pitch<-.1);assert(p.grip!==null);
});
test('carried endpoint reacts continuously after release of the other grip',()=>{
  const {s,p,o}=load();const q=addPlayer(s,'b');Object.assign(q,{x:p.x+o.length*.84,y:1,z:0,a:0,grip:1});simulate(s,60);const before=s.cargo.pitch;q.grip=null;simulate(s,1);assert(Math.abs(s.cargo.pitch-before)<.02);simulate(s,90);assert(s.cargo.pitch<-.1);
});
test('head and outgoing throws cannot rotate the stationary body or bypass the look limit',()=>{
  const {s,p}=load(),body=p.a;for(const target of [-10,-Math.PI,Math.PI,100]){const aim=lookHeading(p,target);assert(Math.abs(angleDelta(aim,p.a))<=HEAD_LIMIT+1e-9);assert.equal(p.a,body);}act(s,p,'throw',{aim:Math.PI});assert(Math.abs(angleDelta(Math.atan2(s.cargo.vz,s.cargo.vx),p.a))<=HEAD_LIMIT+1e-9);
});
test('dragging applies resistance while bounded drop/contact settles without losing the order',()=>{
  const {s,p}=load();simulate(s,90);p.input={x:1,z:0,jump:false};simulate(s,4);assert(p.vx<4.8);p.input={x:0,z:0,jump:false};act(s,p,'grab');simulate(s,240);assert.equal(s.order,1);assert(s.cargo.ground);assert(Math.abs(s.cargo.pitch)<.01);assert(Number.isFinite(s.cargo.y));
});
