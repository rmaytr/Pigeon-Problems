import {STEP,orderFor,clamp} from './world.mjs';

import {lookHeading} from './pose.mjs';
import {stepFreeLoad} from './cargo.mjs';
export const wrapAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
export function readAim(raw,fallback=0){return Number.isFinite(raw)&&Math.abs(raw)<1e6?wrapAngle(raw):fallback;}
export function readPower(raw){return Number.isFinite(raw)?clamp(raw,.18,1):1;}
export function launch(s,p,request={}){
  const o=orderFor(s),count=Math.max(1,s.players.filter(p=>p.connected).length);
  const angle=lookHeading(p,readAim(request.aim,Number.isFinite(p.aim)?p.aim:p.a));
  const power=readPower(request.power??p.aimPower);
  const speed=(count===1?8:8/Math.max(1,o.mass*.65))*power;
  return {vx:Math.cos(angle)*speed,vz:Math.sin(angle)*speed,vy:6.4,angle,power,speed};
}
export function powerForTarget(s,p,target){
  const c=s.cargo??{x:p.x,y:p.y+.85,z:p.z};
  const full=launch(s,p,{power:1});
  const dy=c.y-target.y;
  const time=(6.4+Math.sqrt(Math.max(0,6.4*6.4+32*dy)))/16;
  return clamp(Math.hypot(target.x-c.x,target.z-c.z)/Math.max(.1,time*full.speed),.18,1);
}
// Predict only the first impact, using the same fixed-step forces and cargo
// collision queries as free cargo. Other players can still catch/gust the throw.
export function predictThrow(s,p,request={}){
  const c={...s.cargo,...launch(s,p,request)},o=orderFor(s),points=[{x:c.x,y:c.y,z:c.z}];
  let hit='air';
  for(let i=1;i<=180;i++){
    const result=stepFreeLoad({...s,t:s.t+i*STEP},c,o,STEP);
    if(result.hit){hit=result.hit;points.push({x:c.x,y:c.y,z:c.z});break;}
    if(i%3===0)points.push({x:c.x,y:c.y,z:c.z});
    if(c.y<-7){hit='alley';points.push({x:c.x,y:c.y,z:c.z});break;}
  }
  return {points,landing:points.at(-1),hit};
}
