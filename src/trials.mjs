import {getCourse,courseEnd,checkpointPad,coursePlatforms,courseSurface,coursePoint,fanState,sweeperSegment,segmentDistance,courseMedal} from './courses.mjs';
import {carryLoad,stepFreeLoad} from './cargo.mjs';
import {orderFor,dist,clamp} from './world.mjs';
import {lookHeading} from './pose.mjs';
const empty=()=>({x:0,z:0,jump:false,aim:null,power:1});
const emit=(s,text,kind='info')=>{s.events.push({id:++s.eventId,text,kind,t:s.t});s.events=s.events.slice(-12);};
export function placeTrialPlayer(s,p){
  const cp=checkpointPad(s);Object.assign(p,{x:cp.x-.65,y:cp.y,z:cp.z+(p.slot-1.5)*.42,vx:0,vy:0,vz:0,a:0,aim:null,ground:true,platformId:cp.id,fallFloor:cp.y,stamina:1,grip:null,lastJump:false,jumpBuffer:0,coyote:.12,input:empty(),lastInput:s.t,respawnUntil:s.t+.8});
}
export function resetTrialCargo(s){
  const c=getCourse(s);if(!c.cargo){s.cargo=null;return;}
  const cp=checkpointPad(s);s.cargo={x:cp.x+.45,y:cp.y+.45,z:cp.z-.3,vx:0,vy:0,vz:0,a:0,pitch:0,wp:0,wa:0,condition:100,thrower:null,throwId:0,caughtId:-1,lastCarrier:null,ground:true,rest:0,air:0};
  for(const p of s.players)p.grip=null;
}
export function startTrial(s){
  const c=getCourse(s);s.course=c.id;s.phase='playing';s.order=0;s.completed=[];s.startedAt=s.t;s.orderStart=s.t;delete s.finishedAt;
  s.stats={handoffs:0,recoveries:0,gusts:0,shared:0};s.trial={checkpoint:0,stamps:[],crumbles:{},gates:{},revision:0,falls:0,ready:[],liftStart:-100,plate:false,cargoDelivered:false};
  for(const p of s.players){placeTrialPlayer(s,p);p.cooldowns={};p.ready=false;}
  resetTrialCargo(s);emit(s,c.name+': collect all three stamps, then reach the finish.','start');
}
export function resetTrialPlayer(s,p,reason='Back to the checkpoint.'){
  const lost=p.grip!==null;p.grip=null;s.trial.falls++;s.stats.recoveries++;p.rescues++;
  if(lost&&!s.players.some(q=>q.id!==p.id&&q.connected&&q.grip!==null))resetTrialCargo(s);
  placeTrialPlayer(s,p);emit(s,reason+' Stamps are safe.','rescue');
}
export function useVane(s,p,aim=null){
  for(const v of getCourse(s).vanes){
    const point=coursePoint(s,v),d=dist(p,point),facing=aim===null||d<.2||((point.x-p.x)*Math.cos(aim)+(point.z-p.z)*Math.sin(aim))/d>.5;
    if(d<(aim===null?1.75:5)&&Math.abs(p.y-point.y)<2.1&&facing){s.trial.gates[v.id]=s.t+v.duration;s.trial.revision++;emit(s,'Vane turned. Blue bridge open for '+v.duration+' seconds.','switch');return true;}
  }return false;
}
export function gustTrial(s,p,value){
  const aim=lookHeading(p,Number.isFinite(value?.aim)?value.aim:Number.isFinite(p.aim)?p.aim:p.a);p.aim=aim;p.gustAim=aim;p.gustUntil=s.t+.4;s.stats.gusts++;useVane(s,p,aim);
  for(const q of s.players){const d=dist(p,q);if(q.id!==p.id&&q.connected&&!q.ground&&d>.1&&d<5&&Math.abs(q.y-p.y)<3&&((q.x-p.x)*Math.cos(aim)+(q.z-p.z)*Math.sin(aim))/d>.5){q.vy=Math.min(10,q.vy+3);q.stamina=clamp(q.stamina+.2,0,1);}}
}
export function finishTrial(s){
  const course=getCourse(s),time=Math.round((s.t-s.startedAt)*10)/10,falls=s.trial.falls,medal=courseMedal(course,time,falls);
  const score=1300+Math.max(0,Math.round((course.par*1.5-time)*4))-Math.min(600,falls*40);
  s.phase='results';s.finishedAt=s.t;s.trial.result={time,falls,medal,score,course:course.id};s.completed=[{name:course.name,total:score,time,condition:100}];for(const p of s.players)p.grip=null;emit(s,course.name+' complete. '+medal+' wings!','finish');
}
export function tickTrial(s,dt,movePlayer){
  const c=getCourse(s),tr=s.trial;if(!tr)return;
  for(const [id,start]of Object.entries(tr.crumbles)){const def=c.platforms.find(p=>p.id===id);if(def&&s.t-start>def.crumble+3.5){delete tr.crumbles[id];tr.revision++;}}
  const positions=new Map();
  for(const p of s.players){
    if(!p.connected)continue;positions.set(p.id,{x:p.x,z:p.z});movePlayer(p,s.t-p.lastInput<.35?p.input:empty(),dt,s);
    const cp=checkpointPad(s);
    if(p.ground)p.fallFloor=p.y;
    if(p.y<(p.fallFloor??cp.y)-6||Math.abs(p.z)>13||p.x<-7||p.x>courseEnd(s).x+9){resetTrialPlayer(s,p);continue;}
    for(const fan of c.fans){const point=coursePoint(s,fan);if(fanState(s,fan)==='blowing'&&dist(p,point)<1.25&&p.y>=point.y-.1&&p.y<point.y+2.5){p.vy=Math.max(p.vy,fan.force);p.stamina=Math.min(1,p.stamina+dt*.8);p.ground=false;}}
    const support=courseSurface(s,p.x,p.z,p.y+.06,.12);
    if(p.ground&&support){
      p.platformId=support.id;
      if(support.crumble&&tr.crumbles[support.id]===undefined){tr.crumbles[support.id]=s.t;tr.revision++;}
      if(support.checkpoint>tr.checkpoint&&(!c.cargo||dist(s.cargo,p)<4)){
        tr.checkpoint=support.checkpoint;tr.revision++;emit(s,'Checkpoint '+tr.checkpoint+' saved. Stamps stay with the crew.','checkpoint');
      }
    }
    if(s.t>(p.respawnUntil??0))for(const h of c.sweepers){const segment=sweeperSegment(s,h);if(Math.abs(p.y+.35-segment.y)<.65&&segmentDistance(p,segment)<.42){resetTrialPlayer(s,p,'Mail sorter got you.');break;}}
    for(let i=0;i<c.stamps.length;i++){
      if(tr.stamps.includes(i))continue;const point=coursePoint(s,c.stamps[i]);if(dist(p,point)<.95&&Math.abs(p.y+.7-(point.y+.9))<1){tr.stamps.push(i);emit(s,'Stamp '+tr.stamps.length+'/3 collected.','collect');}
    }
  }
  if(c.plate){
    const plate=c.plate,pressed=s.players.some(p=>p.connected&&p.ground&&dist(p,plate)<plate.r&&Math.abs(p.y-plate.y)<.4)||(s.cargo?.ground&&dist(s.cargo,plate)<plate.r);
    if(pressed&&s.t-tr.liftStart>12){tr.liftStart=s.t;tr.revision++;emit(s,'Freight lift charged. Board in 3 seconds.','switch');}tr.plate=!!pressed;
  }
  if(s.cargo&&!tr.cargoDelivered){
    const o=orderFor(s),carriers=s.players.filter(p=>p.connected&&p.grip!==null);
    if(carriers.length){
      const stable=carryLoad(s,carriers,dt);if(carriers.length===2)s.stats.shared+=dt;
      if(!stable)for(const p of carriers){const old=positions.get(p.id);if(old){p.x=old.x;p.z=old.z;p.vx=p.vz=0;}}
    }else{
      stepFreeLoad(s,s.cargo,o,dt);const end=courseEnd(s);
      if(s.cargo.ground&&dist(s.cargo,end)<1.65&&Math.abs(s.cargo.y-.45-end.y)<.3&&s.cargo.rest>.3){tr.cargoDelivered=true;emit(s,'Parcel signed for. Gather the crew at the finish.','deliver');}
    }
    const cp=checkpointPad(s);if(s.cargo.y<cp.y-5||Math.abs(s.cargo.z)>13||s.cargo.x<-7||s.cargo.x>courseEnd(s).x+9){resetTrialCargo(s);tr.falls++;emit(s,'Parcel returned to the checkpoint.','rescue');}
  }
  const end=courseEnd(s),connected=s.players.filter(p=>p.connected);
  tr.ready=connected.filter(p=>p.ground&&dist(p,end)<2&&Math.abs(p.y-end.y)<.5).map(p=>p.id);
  if(tr.stamps.length===3&&(!c.cargo||tr.cargoDelivered)&&connected.length&&tr.ready.length===connected.length)finishTrial(s);
}
