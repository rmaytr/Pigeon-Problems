import {STEP,ORDERS,PADS,VENTS,dist,clamp,floorAt,blocked,cargoBlocked,ventState,orderFor} from './world.mjs';
import {COURSES,isTrial,getCourse,coursePlatforms,courseSurface,checkpointPad,windAt} from './courses.mjs';
import {startTrial,tickTrial,placeTrialPlayer,resetTrialPlayer,resetTrialCargo,useVane,gustTrial} from './trials.mjs';
import {readAim,readPower,launch} from './aim.mjs';
import {lookHeading} from './pose.mjs';
import {gripPoint,carryLoad,stepFreeLoad} from './cargo.mjs';
export {STEP,ORDERS};
export const emptyInput=()=>({x:0,z:0,jump:false,aim:null,power:1});
export function makeState(code='LOCAL',mode='shift'){
  return {code,mode,phase:'lobby',t:0,tick:0,players:[],host:null,order:0,cargo:null,completed:[],events:[],eventId:0,bridge:0,signUntil:0,pads:[-10,-10],stats:{handoffs:0,recoveries:0,gusts:0,shared:0},startedAt:0,orderStart:0};
}
export function emit(s,text,kind='info',p=null){s.events.push({id:++s.eventId,text,kind,p,t:s.t});s.events=s.events.slice(-12);}
export function addPlayer(s,id,name='Pigeon'){
  if(s.players.length>=4)throw Error('This crew already has four pigeons.');
  const f=isTrial(s)?checkpointPad(s):ORDERS[Math.min(s.order,4)].from;
  const p={id,name:String(name).replace(/[<>\x00-\x1f]/g,'').trim().slice(0,16)||'Pigeon',slot:[0,1,2,3].find(n=>!s.players.some(p=>p.slot===n)),x:f.x-1,z:f.z+1+s.players.length*.7,y:f.y,vx:0,vy:0,vz:0,a:Math.PI/2,stamina:1,ground:true,coyote:.12,jumpBuffer:0,lastJump:false,grip:null,connected:true,ready:false,seq:0,cooldowns:{},input:emptyInput(),lastInput:s.t,ping:null,steps:0,rescues:0};
  if(isTrial(s))placeTrialPlayer(s,p);s.players.push(p);if(!s.host)s.host=id;emit(s,`${p.name} clocked in.`);return p;
}
export function disconnect(s,id,remove=false){
  const p=s.players.find(p=>p.id===id);if(!p)return;
  p.connected=false;p.grip=null;p.input=emptyInput();
  if(remove)s.players=s.players.filter(p=>p.id!==id);
  if(s.host===id)s.host=s.players.find(p=>p.connected)?.id??null;
  emit(s,`${p.name} stepped out. Cargo is safe.`);
}
export function startShift(s){
  if(isTrial(s)){startTrial(s);return;}
  s.phase='playing';s.order=0;s.completed=[];s.stats={handoffs:0,recoveries:0,gusts:0,shared:0};s.startedAt=s.t;s.orderStart=s.t;s.bridge=0;s.signUntil=0;
  for(const p of s.players){Object.assign(p,{x:-1,z:1+p.slot*.7,y:0,vx:0,vy:0,vz:0,grip:null,stamina:1,ready:false,input:emptyInput(),lastJump:false});}
  spawnCargo(s);emit(s,'The morning shift is open. Five deliveries. Minimal qualifications.','start');
}
export function spawnCargo(s){
  const o=ORDERS[s.order];s.cargo={...o.from,y:o.from.y+.45,vx:0,vy:0,vz:0,a:o.cargo==='baguette'?Math.PI/2:0,pitch:0,wp:0,wa:0,dragging:false,condition:100,thrower:null,throwId:0,caughtId:-1,lastCarrier:null,ground:true,rest:0,air:0};
  for(const p of s.players)p.grip=null;
}
export function activeCount(s){return Math.max(1,s.players.filter(p=>p.connected).length);}
export function setInput(s,p,raw){
  if(!raw||!Number.isSafeInteger(raw.seq)||raw.seq<=p.seq||raw.seq>p.seq+10000)return false;
  if(!Number.isFinite(raw.x)||!Number.isFinite(raw.z))return false;
  const len=Math.max(1,Math.hypot(raw.x,raw.z));
  p.input={x:clamp(raw.x/len,-1,1),z:clamp(raw.z/len,-1,1),jump:raw.jump===true,aim:readAim(raw.aim,null),power:readPower(raw.power)};p.seq=raw.seq;p.lastInput=s.t;return true;
}
export function movePlayer(p,input,dt,s){
  const trial=isTrial(s);
  if(trial&&p.ground&&p.platformId){const now=coursePlatforms(s),before=coursePlatforms(s,s.t-dt),a=now.find(q=>q.id===p.platformId),b=before.find(q=>q.id===p.platformId);if(a?.active&&b?.active){p.x+=a.x-b.x;p.y+=a.y-b.y;p.z+=a.z-b.z;}}
  const held=p.grip!==null;
  const carriers=s.players.filter(q=>q.connected&&q.grip!==null).length;
  const mass=orderFor(s)?.mass??1;
  const weight=activeCount(s)===1?.85:carriers>1?1:mass;
  let speed=held?4.8/Math.max(1,weight*.9):5.2;if(held&&s.cargo?.dragging)speed*=.82;
  const n=Math.hypot(input.x,input.z);
  const targetX=input.x*speed,targetZ=input.z*speed;
  const f=1-Math.exp(-dt*(p.ground?24:11));
  p.vx+=(targetX-p.vx)*f;p.vz+=(targetZ-p.vz)*f;
  if(n>.12)p.a=Math.atan2(input.z,input.x);
  p.aim=Number.isFinite(input.aim)?lookHeading(p,input.aim):null;p.aimPower=readPower(input.power);p.flapping=!p.ground&&input.jump&&p.stamina>0;
  if(input.jump&&!p.lastJump)p.jumpBuffer=.13;
  else p.jumpBuffer=Math.max(0,p.jumpBuffer-dt);
  p.lastJump=input.jump;
  p.coyote=p.ground?.13:Math.max(0,p.coyote-dt);
  if(p.jumpBuffer>0&&p.coyote>0){p.vy=7;p.ground=false;p.coyote=0;p.jumpBuffer=0;}
  if(!p.ground&&input.jump&&p.stamina>0){
    p.vy+=13.5*dt*(held?.82:1);p.stamina=Math.max(0,p.stamina-(trial?getCourse(s).drain:.48)*dt);
    p.vy=Math.max(p.vy,-2.9);
  }
  p.vy-=19*dt;
  if(trial&&!p.ground)p.vz+=windAt(s,p.x)*dt;
  const oldY=p.y;
  let nx=p.x+p.vx*dt,nz=p.z+p.vz*dt;
  // Small step-up and independent axes make edges forgiving without climbing walls.
  const ground=floorAt(nx,nz,p.y+(p.ground?.56:.05),s.t,s.bridge,.12,s);
  if(p.ground&&ground>p.y&&ground-p.y<=.56)p.y=ground;
  const nextFloor=floorAt(nx,nz,100,s.t,s.bridge,0,s);
  if(nextFloor>p.y+.58&&(trial||p.y+1>nextFloor-5)){
    if(floorAt(nx,p.z,100,s.t,s.bridge,0,s)>p.y+.58)nx=p.x;
    if(floorAt(p.x,nz,100,s.t,s.bridge,0,s)>p.y+.58)nz=p.z;
  }
  if(blocked(nx,p.y,p.z,.32,s))nx=p.x;
  if(blocked(nx,p.y,nz,.32,s))nz=p.z;
  p.x=nx;p.z=nz;p.y+=p.vy*dt;p.steps+=n*dt;
  const floor=floorAt(p.x,p.z,Math.max(oldY,p.y)+.08,s.t,s.bridge,.15,s);
  if(p.y<=floor&&p.vy<=0){p.y=floor;p.vy=0;p.ground=true;p.stamina=Math.min(1,p.stamina+dt*1.5);if(trial)p.platformId=courseSurface(s,p.x,p.z,p.y+.08,.15)?.id;}
  else{p.ground=false;if(trial)p.platformId=null;}
}
export function gripPoints(s){return s.cargo?[0,1].map(slot=>gripPoint(s.cargo,orderFor(s),slot)):[];}
export function act(s,p,type,value){
  if(!p.connected)return false;
  if(type==='course'){
    if(p.id!==s.host||!['lobby','results'].includes(s.phase))return false;
    if(value==='deliveries'){s.mode='shift';delete s.trial;}else if(COURSES.some(c=>c.id===value)){s.mode='trials';s.course=value;delete s.trial;}else return false;
    s.phase='lobby';s.cargo=null;for(const q of s.players)q.grip=null;return true;
  }
  if(type==='next-course'){
    if(!isTrial(s)||s.phase!=='results'||p.id!==s.host)return false;const i=COURSES.findIndex(c=>c.id===s.course);if(i>=COURSES.length-1)return false;s.course=COURSES[i+1].id;startTrial(s);return true;
  }
  if(type==='start'||type==='rematch'||type==='express'){
    if(p.id!==s.host||!(s.phase==='lobby'||s.phase==='results'))return false;
    if(type==='express'){if(s.phase!=='results'||isTrial(s))return false;s.mode='express';}
    startShift(s);return true;
  }
  if(type==='ready'){p.ready=!p.ready;return true;}
  if(s.phase!=='playing')return false;
  if(s.t-(p.cooldowns[type]??-100)<({gust:1.1,grab:.22,rotate:.2,throw:.4,rescue:2,recall:3,ping:1,emote:1.5}[type]??.3))return false;
  p.cooldowns[type]=s.t;
  const c=s.cargo,o=orderFor(s);
  if(isTrial(s)&&type==='gust'){gustTrial(s,p,value);return true;}
  if(isTrial(s)&&type==='grab'&&useVane(s,p))return true;
  if(type==='grab'){
    if(!c)return false;
    if(p.grip!==null){p.grip=null;c.vx*=.3;c.vz*=.3;c.vy=Math.min(0,c.vy);emit(s,`${p.name} set it down.`,'place',p.id);return true;}
    const points=gripPoints(s);
    const free=[0,1].filter(i=>!s.players.some(q=>q.connected&&q.grip===i)).sort((a,b)=>dist(p,points[a])-dist(p,points[b]));
    const end=free[0];
    if(end===undefined||dist(p,points[end])>2.1||Math.abs(p.y+.65-c.y)>2.1){emit(s,'Move closer to a marked cargo end, then E.','hint',p.id);return false;}
    if(c.thrower&&c.thrower!==p.id&&c.caughtId!==c.throwId){s.stats.handoffs++;c.caughtId=c.throwId;emit(s,`${p.name}: signed, sealed, caught! +80 teamwork`,'catch',p.id);}
    p.grip=end;p.grabFrom={...points[end]};p.grabAt=s.t;c.targetA??=c.a;p.catchUntil=s.t+.4;c.lastCarrier=p.id;c.thrower=null;c.vx=c.vy=c.vz=0;return true;
  }
  if(type==='rotate'&&p.grip!==null){
    const next=(c.targetA??c.a)+Math.PI/4;if(cargoBlocked({...c,a:next},o,s.t,s.signUntil,s)){emit(s,'Bread meets architecture. Back up, then rotate.','hint',p.id);return false;}c.targetA=next;return true;
  }
  if(type==='throw'&&p.grip!==null){
    for(const q of s.players)q.grip=null;
    const shot=launch(s,p,value&&typeof value==='object'?value:{});
    c.vx=shot.vx;c.vz=shot.vz;c.vy=shot.vy;p.aim=shot.angle;p.throwUntil=s.t+.4;c.ground=false;c.thrower=p.id;c.throwId++;c.air=0;
    emit(s,`${p.name}: incoming!`,'throw',p.id);return true;
  }
  if(type==='gust'){
    s.stats.gusts++;p.gustUntil=s.t+.4;
    const aim=lookHeading(p,readAim(value?.aim,Number.isFinite(p.aim)?p.aim:p.a));p.aim=aim;p.gustAim=aim;
    const inCone=q=>{const d=dist(p,q);return d<6&&d>.1&&((q.x-p.x)*Math.cos(aim)+(q.z-p.z)*Math.sin(aim))/d>.55&&Math.abs(q.y-p.y)<3;};
    if(inCone(c)){
      const held=s.players.some(q=>q.grip!==null&&q.connected);
      const force=o.wind?8:4;
      if(!held){c.vx=clamp(c.vx+Math.cos(aim)*force,-14,14);c.vz=clamp(c.vz+Math.sin(aim)*force,-14,14);c.vy=Math.min(8,c.vy+(o.wind?5:2));c.ground=false;}
      else if(o.wind&&s.players.filter(q=>q.grip!==null).length===1)emit(s,'A second grip steadies this sail.','hint');
    }
    for(const q of s.players)if(q.id!==p.id&&inCone(q)&&!q.ground){q.vy=clamp(q.vy+3,-3,8);q.stamina=clamp(q.stamina+.2,0,1);}
    if(inCone({x:42,y:4,z:0})){s.signUntil=s.t+8;emit(s,'Express sign turned. Shortcut open for 8 seconds.','switch');}
    return true;
  }
  if(type==='rescue'){rescue(s,p);return true;}
  if(type==='recall'){recall(s);return true;}
  if(type==='ping'){
    const text=['Grab here','Ready!','Throw!','Help!'].includes(value)?value:'Grab here';p.ping={text,until:s.t+3};emit(s,`${p.name}: ${text}`,'ping',p.id);return true;
  }
  if(type==='emote'){p.emoteUntil=s.t+1.7;emit(s,`${p.name} performs a highly professional bow.`,'coo',p.id);return true;}
  return false;
}
export function rescue(s,p){
  if(isTrial(s)){resetTrialPlayer(s,p);return;}
  const f=ORDERS[s.order].from;p.grip=null;p.x=f.x-1;p.z=f.z+1;p.y=f.y;p.vx=p.vz=p.vy=0;p.stamina=1;p.input=emptyInput();p.rescues++;s.stats.recoveries++;
  emit(s,`${p.name} used the employee return service. Back at the checkpoint.`,'rescue',p.id);
}
export function recall(s){
  if(isTrial(s)){if(s.cargo&&!s.trial.cargoDelivered){resetTrialCargo(s);s.trial.falls++;emit(s,'Parcel recalled to the checkpoint.','rescue');}return;}
  const condition=Math.max(40,s.cargo.condition-12);spawnCargo(s);s.cargo.condition=condition;s.stats.recoveries++;
  emit(s,'Cargo returned to the checkpoint. Only this delivery loses 12 care.','rescue');
}
export function tick(s,dt=STEP){
  s.t+=dt;s.tick++;
  if(s.phase!=='playing')return;
  if(isTrial(s)){tickTrial(s,dt,movePlayer);return;}
  const o=ORDERS[s.order],c=s.cargo;
  const positions=new Map();
  for(const p of s.players){
    if(!p.connected)continue;
    positions.set(p.id,{x:p.x,z:p.z});
    movePlayer(p,s.t-p.lastInput<.35?p.input:emptyInput(),dt,s);
    if(p.y<-7||Math.abs(p.z)>25||p.x<-15||p.x>80)rescue(s,p);
    for(const v of VENTS)if(dist(p,v)<1&&Math.abs(p.y-v.y)<1.8&&ventState(s.t,v)==='blowing'){p.vy=Math.max(p.vy,8);p.ground=false;}
    for(let i=0;i<2;i++)if(dist(p,PADS[i])<.8&&Math.abs(p.y-4)<.5&&s.t-s.pads[i]>1)s.pads[i]=s.t;
  }
  if(s.pads.some(t=>s.t-t<.1)&&(activeCount(s)===1||s.pads.every(t=>s.t-t<4))){
    if(s.bridge<s.t)emit(s,'Express bridge open. Ten seconds. Mind the cake.','switch');
    s.bridge=s.t+10;
  }
  let carriers=s.players.filter(p=>p.connected&&p.grip!==null);
  for(const p of carriers)if(dist(p,c)>o.length/2+3||Math.abs(p.y+.65-c.y)>3){p.grip=null;emit(s,`${p.name} lost a grip. E to re-grab.`,'hint',p.id);}
  carriers=s.players.filter(p=>p.connected&&p.grip!==null);
  if(carriers.length){
    const stable=carryLoad(s,carriers,dt);
    if(carriers.length===2)s.stats.shared+=dt;
    if(!stable){for(const p of carriers){const oldP=positions.get(p.id);if(oldP){p.x=oldP.x;p.z=oldP.z;p.vx=p.vz=0;}}if(s.tick%90===0)emit(s,'Cargo met an obstacle. Back up, rotate, or lift the free end with a teammate.','hint');}
  }else{
    const {impact}=stepFreeLoad(s,c,o,dt);
    if(impact>0&&o.fragile){c.condition=Math.max(0,c.condition-clamp(impact*3,0,22));emit(s,'Bumpy landing. Try a catch or a gentle E placement.','bump');}
    if(c.y<-7||Math.abs(c.z)>25||c.x<-15||c.x>80)recall(s);
    if(c.ground&&dist(c,o.to)<1.65&&Math.abs(c.y-.45-o.to.y)<.25&&c.rest>.3)complete(s);
  }
}
export function complete(s){
  if(s.phase!=='playing'||s.completed.length!==s.order)return false;
  const o=ORDERS[s.order],elapsed=s.t-s.orderStart;
  const care=Math.round(s.cargo.condition*2),pace=Math.max(0,Math.round((o.par-elapsed)*2));
  s.completed.push({name:o.name,base:500,care,pace,time:Math.round(elapsed),condition:Math.round(s.cargo.condition),total:500+care+pace});
  emit(s,`${o.name}: delivered. +${500+care+pace}`,'deliver');
  if(s.order===ORDERS.length-1){s.phase='results';s.finishedAt=s.t;for(const p of s.players)p.grip=null;emit(s,'All deliveries signed for. Somehow.','finish');}
  else{s.order++;s.orderStart=s.t;spawnCargo(s);}
  return true;
}
export function totalScore(s){return s.completed.reduce((a,v)=>a+v.total,0)+s.stats.handoffs*80+Math.min(200,Math.round(s.stats.shared)*2)+Math.min(100,s.stats.recoveries*10);}
export function snapshot(s){
  return JSON.parse(JSON.stringify({...s,players:s.players.map(({input,cooldowns,...p})=>p)}));
}
