import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeState,addPlayer,startShift,tick,act,setInput,disconnect,complete,totalScore,STEP} from '../src/engine.mjs';
import {ORDERS,BRIDGES,ROOFS,dist,blocked,cargoBlocked,floorAt} from '../src/world.mjs';
function game(n=1){const s=makeState('TEST');for(let i=0;i<n;i++)addPlayer(s,'p'+i,'Bird '+i);startShift(s);return s;}
function frames(s,n,input){for(let i=0;i<n;i++){for(const p of s.players){p.input=input??{x:0,z:0,jump:false};p.lastInput=s.t;}tick(s);}return s;}
test('server normalizes inputs, rejects nonfinite/stale values and ignores arbitrary positions',()=>{
  const s=game(),p=s.players[0];assert(setInput(s,p,{seq:1,x:1e9,z:1e9,jump:true,y:999}));assert(Math.hypot(p.input.x,p.input.z)<=1.001);assert.equal(p.y,0);assert(!setInput(s,p,{seq:1,x:0,z:0}));assert(!setInput(s,p,{seq:2,x:Infinity,z:0}));
});
test('jump is buffered, flap is bounded, and landing refills stamina',()=>{
  const s=game(),p=s.players[0];frames(s,30,{x:0,z:0,jump:true});assert(p.y>1);frames(s,240,{x:0,z:0,jump:true});assert(p.y<.1);assert(p.stamina>.95);frames(s,1);frames(s,4,{x:0,z:0,jump:true});assert(p.vy>0);
});
test('unreceived inputs time out without drifting across a roof',()=>{
  const s=game(),p=s.players[0];setInput(s,p,{seq:1,x:1,z:0});for(let i=0;i<120;i++)tick(s);assert(p.x<2);assert(Math.abs(p.vx)<.1);
});
test('shared grips are exclusive, release on disconnect, and cargo scales to solo',()=>{
  const s=game(4);s.players.forEach((p,i)=>{p.x=1;p.z=i<2?0:1;p.y=0;});
  for(const p of s.players)act(s,p,'grab');assert.equal(s.players.filter(p=>p.grip!==null).length,2);assert.equal(new Set(s.players.filter(p=>p.grip!==null).map(p=>p.grip)).size,2);
  disconnect(s,'p0');assert.equal(s.players[0].grip,null);assert.equal(s.host,'p1');frames(s,3);assert(Number.isFinite(s.cargo.x));
});
test('range and height validate grabs; remote actions cannot claim cargo',()=>{
  const s=game(),p=s.players[0];p.x=40;assert(!act(s,p,'grab'));p.x=1;p.y=20;frames(s,15);assert(!act(s,p,'grab'));assert.equal(p.grip,null);
});
test('rotation tests cargo geometry against the bakery gate',()=>{
  const s=game();s.order=1;const o=ORDERS[1],c={x:19.8,z:0,y:2.8,a:Math.PI/2};assert(cargoBlocked(c,o,0,0));assert(!cargoBlocked({...c,a:0},o,0,0));assert(!cargoBlocked({...c,z:4.3,a:0},o,0,0));
});
test('throw and catch grant one handoff, with no duplicate score from repeated grabs',()=>{
  const s=game(2),[a,b]=s.players;a.x=1;a.z=0;b.x=1;b.z=0;assert(act(s,a,'grab'));frames(s,1);assert(act(s,a,'throw'));frames(s,1);b.x=s.cargo.x;b.z=s.cargo.z;b.y=s.cargo.y-.65;assert(act(s,b,'grab'));assert.equal(s.stats.handoffs,1);frames(s,15);act(s,b,'grab');frames(s,15);act(s,b,'grab');assert.equal(s.stats.handoffs,1);
});
test('gust has cone, range and cooldown; wind cargo gets predictable capped force',()=>{
  const s=game(),p=s.players[0];s.order=3;Object.assign(s.cargo,{x:2,y:.8,z:0});p.x=0;p.z=0;p.a=0;assert(act(s,p,'gust'));assert(s.cargo.vx>0);assert(!act(s,p,'gust'));frames(s,70);Object.assign(s.cargo,{x:-2,y:.8,z:0,vx:0,vz:0});act(s,p,'gust');assert.equal(s.cargo.vx,0);
});
test('falls and recall preserve previous deliveries and free every grip',()=>{
  const s=game(2);s.completed=[{total:700}];s.order=1;s.players[0].y=-9;frames(s,1);assert.equal(s.completed.length,1);assert(s.players[0].y>=1);s.cargo.y=-9;frames(s,1);assert(s.cargo.y>=1);assert.equal(s.completed.length,1);assert(s.players.every(p=>p.grip===null));
});
test('switches are tap based, scale down to one, and never remove permanent route',()=>{
  const s=game(2);s.players.forEach((p,i)=>Object.assign(p,{x:51,z:i?-2:2,y:4}));frames(s,1);assert(s.bridge>s.t);s.players.forEach(p=>p.x=48);frames(s,100);assert(s.bridge>s.t);assert.equal(BRIDGES.length,20);assert(floorAt(54,4.3,100,s.t,0)>4);
  const one=game();Object.assign(one.players[0],{x:51,z:2,y:4});frames(one,1);assert(one.bridge>one.t);
});
test('only resting cargo at the correct destination progresses exactly once',()=>{
  const s=game();Object.assign(s.cargo,{...ORDERS[0].to,y:1.45,ground:true});frames(s,30);assert.equal(s.order,1);assert.equal(s.completed.length,1);const score=totalScore(s);assert(!complete({...s,completed:[{},{}]}));assert.equal(totalScore(s),score);
});
test('fragile cargo impact loses care without blocking delivery',()=>{
  const s=game();s.order=2;Object.assign(s.cargo,{x:24,z:0,y:5,vy:-10});frames(s,45);assert(s.cargo.condition<100);assert(s.cargo.condition>=0);assert.equal(s.phase,'playing');
});
test('personal rescue works from any order and rematch resets progress',()=>{
  const s=game();for(let i=0;i<5;i++){s.order=i;act(s,s.players[0],'rescue');assert.equal(s.players[0].x,ORDERS[i].from.x-1);frames(s,125);}s.phase='results';s.completed=[{total:700}];assert(act(s,s.players[0],'rematch'));assert.equal(s.order,0);assert.equal(s.completed.length,0);assert.equal(s.phase,'playing');
});

// An input-driven route solver walks the exact permanent bridges. It never sets
// positions after spawn; assertions therefore exercise actual collision/movement.
function walk(s,p,x,z,max=1600){
  for(let i=0;i<max;i++){
    const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d<.12){frames(s,10);return;}
    p.input={x:dx/d*Math.min(1,d*2),z:dz/d*Math.min(1,d*2),jump:false};p.lastInput=s.t;tick(s);
  }
  throw Error(`Route stalled at ${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)} towards ${x},${z}; cargo ${s.cargo.x.toFixed(2)},${s.cargo.z.toFixed(2)}`);
}
test('all five solo deliveries have a real input-driven safe route through to results',()=>{
  const s=game(),p=s.players[0];
  for(let order=0;order<5;order++){
    const o=ORDERS[order];walk(s,p,o.from.x-1,o.from.z);assert(act(s,p,'grab'),`pickup ${order}`);frames(s,2);
    if(order===1){assert(act(s,p,'rotate'));frames(s,15);assert(act(s,p,'rotate'));frames(s,2);}
    walk(s,p,p.x,4.3);walk(s,p,o.to.x-2,4.3);walk(s,p,o.to.x,4.3);walk(s,p,o.to.x,0);
    frames(s,3);assert(act(s,p,'grab'),`place ${order}`);frames(s,45);
    // The offset from the marked grip is less than the delivery radius for small
    // parcels, but long bread must be deliberately centered before placement.
    if(s.order===order&&s.phase==='playing'){
      frames(s,20);assert(act(s,p,'grab'));frames(s,3);const dx=o.to.x-s.cargo.x,dz=o.to.z-s.cargo.z;walk(s,p,p.x+dx,p.z+dz);frames(s,2);assert(act(s,p,'grab'));frames(s,45);
    }
    assert.equal(s.completed.length,order+1,`order ${order} should deliver`);
  }
  assert.equal(s.phase,'results');assert(totalScore(s)>2500);
});
