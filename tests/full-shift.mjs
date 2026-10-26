import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {ORDERS,dist} from '../src/world.mjs';
const base=process.env.TEST_URL||'http://127.0.0.1:5173',count=Number(process.env.CREW_SIZE||2),delay=ms=>new Promise(r=>setTimeout(r,ms));
const {code}=await fetch(base+'/api/rooms',{method:'POST'}).then(r=>r.json()),crew=[];
for(let i=0;i<count;i++){
  const ws=new WebSocket(base.replace('http','ws')+'/ws?room='+code),c={ws,seq:0,n:0};
  await new Promise((resolve,reject)=>{ws.on('open',()=>ws.send(JSON.stringify({type:'join',name:'Route QA '+(i+1)})));ws.on('error',reject);ws.on('message',r=>{const m=JSON.parse(r);if(m.state)c.state=m.state;if(m.type==='welcome'){c.id=m.id;resolve();}});});
  c.input=(x=0,z=0)=>ws.send(JSON.stringify({type:'input',seq:++c.seq,x,z,jump:false}));
  c.action=(action,value)=>ws.send(JSON.stringify({type:'action',n:++c.n,action,value}));crew.push(c);
}
const leader=crew[0];leader.action('start');await delay(150);
async function move(targets,max=550){
  for(let i=0;i<max;i++){
    let all=true;
    crew.forEach((c,k)=>{const p=c.state.players.find(p=>p.id===c.id),g=targets[k];if(!g){c.input();return;}const dx=g.x-p.x,dz=g.z-p.z,d=Math.hypot(dx,dz);if(d>.14)all=false;const l=Math.max(d,.01),speed=Math.min(1,d*3);c.input(dx/l*speed,dz/l*speed);});
    if(all){crew.forEach(c=>c.input());await delay(100);return;}
    await delay(35);
  }
  throw Error('Route stalled: '+JSON.stringify(leader.state.players.map(p=>({x:p.x,z:p.z,y:p.y,grip:p.grip})))+' target '+JSON.stringify(targets));
}
try{
  for(let n=0;n<5;n++){
    const o=ORDERS[n],state=leader.state,cargo=state.cargo;
    const points=[-1,1].map(v=>({x:cargo.x+Math.cos(cargo.a)*o.length*.42*v,z:cargo.z+Math.sin(cargo.a)*o.length*.42*v}));
    await move(crew.map((c,k)=>k<2?points[k]:{x:o.from.x-2,z:3+k*.4}));
    crew[0].action('grab');crew[1].action('grab');await delay(180);
    assert.equal(leader.state.players.filter(p=>p.grip!==null).length,2,`two grips on ${o.name}`);
    if(n===1){
      for(let turn=0;turn<2;turn++){
        const before=leader.state.cargo.a;
        for(let tries=0;tries<5&&leader.state.cargo.a===before;tries++){leader.action('rotate');await delay(450);}
        assert(leader.state.cargo.a!==before,'rotation accepted by server');
      }
    }
    const a=leader.state.cargo.a;
    const convoy=(x,z)=>crew.map((c,k)=>k<2?{x:x+Math.cos(a)*o.length*.42*(k===0?-1:1),z:z+Math.sin(a)*o.length*.42*(k===0?-1:1)}:{x:x-1-k*.4,z:4.6});
    if(count===4){crew[2].action('ping','Ready!');crew[3].action('emote');}
    await move(convoy(o.from.x,4.9));
    await move(convoy(o.to.x,4.9));
    await move(convoy(o.to.x,0));
    crew[0].action('grab');crew[1].action('grab');
    for(let wait=0;wait<30&&leader.state.completed.length<n+1;wait++)await delay(100);
    assert.equal(leader.state.completed.length,n+1,`${o.name} signed: ${JSON.stringify({cargo:leader.state.cargo,players:leader.state.players.map(p=>({x:p.x,y:p.y,z:p.z,grip:p.grip})),events:leader.state.events.slice(-3)})}`);
    console.log(`${count} players: ${o.name} delivered through normal network inputs.`);
  }
  assert.equal(leader.state.phase,'results');
  await delay(100);for(const c of crew)assert.deepEqual(c.state.completed,leader.state.completed);
  leader.action('rematch');await delay(200);assert.equal(leader.state.phase,'playing');assert.equal(leader.state.completed.length,0);
  console.log(`PASS: ${count}-player public/full shift, two-carrier convoy on every delivery, consistent results, rematch. Room ${code}`);
}finally{for(const c of crew)c.ws.close();}
