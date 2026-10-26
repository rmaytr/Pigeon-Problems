import {ORDERS,STEP,orderFor,clamp,floorAt,cargoBlocked,VENTS,dist,ventState} from './world.mjs';
import {beakPoint,angleDelta} from './pose.mjs';
export const cargoRadius=o=>o.cargo==='baguette'?.3:.45;
export function cargoPoint(c,o,d){const cp=Math.cos(c.pitch??0);return {x:c.x+Math.cos(c.a)*cp*d,y:c.y+Math.sin(c.pitch??0)*d,z:c.z+Math.sin(c.a)*cp*d};}
export const gripPoint=(c,o,slot)=>cargoPoint(c,o,(slot===0?-1:1)*o.length*.42);
function gripAnchor(s,p){const b=beakPoint(p);if(!p.grabFrom)return b;const t=clamp((s.t-(p.grabAt??-1))/.2,0,1),f=t*t*(3-2*t);return {x:p.grabFrom.x+(b.x-p.grabFrom.x)*f,y:p.grabFrom.y+(b.y-p.grabFrom.y)*f,z:p.grabFrom.z+(b.z-p.grabFrom.z)*f};}
export function supportHeight(s,c,o,maxY=100){
  let y=-100;const radius=cargoRadius(o),n=Math.ceil(o.length/.3);
  for(let i=0;i<=n;i++){const d=(i/n-.5)*o.length,p=cargoPoint(c,o,d),f=floorAt(p.x,p.z,maxY,s.t,s.bridge,.06,s);if(f>-50)y=Math.max(y,f+radius-Math.sin(c.pitch??0)*d);}
  return y;
}
export function carryLoad(s,carriers,dt){
  const c=s.cargo,o=orderFor(s),old={x:c.x,y:c.y,z:c.z,a:c.a,pitch:c.pitch??0};
  c.pitch??=0;c.wp??=0;c.wa??=0;c.targetA??=c.a;
  c.wa+=(angleDelta(c.targetA,c.a)*90-c.wa*19)*dt;c.a+=c.wa*dt;
  const h=o.length*.42;
  if(carriers.length===2){
    const left=carriers.find(p=>p.grip===0),right=carriers.find(p=>p.grip===1),a=gripAnchor(s,left),b=gripAnchor(s,right);
    c.x=(a.x+b.x)/2;c.z=(a.z+b.z)/2;
    const target=Math.asin(clamp((b.y-a.y)/(h*2),-.7,.7));c.wp+=((target-c.pitch)*65-c.wp*16)*dt;c.pitch+=c.wp*dt;
    c.y=(a.y+b.y)/2;c.dragging=false;
  }else{
    const p=carriers[0],anchor=gripAnchor(s,p),side=p.grip===0?-1:1;
    const long=o.length>3;
    const torque=side*(long?24/Math.max(1,o.length):3)*Math.cos(c.pitch);
    c.wp+=(torque-(long?0:c.pitch*24)-c.wp*7)*dt;
    let pitch=clamp(c.pitch+c.wp*dt,long?-.95:-.28,long?.95:.28);
    const place=q=>{c.pitch=q;const cp=Math.cos(q);c.x=anchor.x-Math.cos(c.a)*cp*h*side;c.z=anchor.z-Math.sin(c.a)*cp*h*side;c.y=anchor.y-Math.sin(q)*h*side;};
    place(pitch);
    // Contact constrains the gravity-driven rotation about the held end.
    const clearance=()=>c.y-supportHeight(s,c,o,anchor.y+Math.abs(Math.sin(c.pitch))*o.length+.08);
    if(clearance()<0){
      let lo=0,hi=Math.abs(pitch);const sign=Math.sign(pitch)||side;
      for(let i=0;i<12;i++){const mid=(lo+hi)/2;place(mid*sign);if(clearance()<0)hi=mid;else lo=mid;}
      pitch=lo*sign;place(pitch);c.wp=0;
      const support=supportHeight(s,c,o,anchor.y+.15);if(support>c.y)c.y=support;
    }
    const far=cargoPoint(c,o,-side*o.length*.5),floor=floorAt(far.x,far.z,far.y+.1,s.t,s.bridge,.06,s);
    c.dragging=long&&floor>-50&&far.y-cargoRadius(o)-floor<.045;
  }
  if(cargoBlocked(c,o,s.t,s.signUntil,s)){Object.assign(c,old);c.wp=c.wa=0;return false;}
  c.vx=clamp((c.x-old.x)/dt,-12,12);c.vz=clamp((c.z-old.z)/dt,-12,12);c.vy=clamp((c.y-old.y)/dt,-6,6);c.ground=false;c.rest=0;
  return true;
}
export function stepFreeLoad(s,c,o,dt=STEP){
  c.pitch??=0;c.wp??=0;c.wa??=0;
  const oldY=c.y;c.vy-=16*dt;c.pitch=clamp(c.pitch+c.wp*dt,-1.2,1.2);c.a+=c.wa*dt;
  if(o.wind){c.vx+=Math.sin(s.t*.7)*.8*dt;c.vz+=.45*dt;c.vy=Math.max(c.vy,-4.5);}
  const x=c.x+c.vx*dt,z=c.z+c.vz*dt;let hit=null;
  if(!cargoBlocked({...c,x,z},o,s.t,s.signUntil,s)){c.x=x;c.z=z;}else{c.vx*=-.2;c.vz*=-.2;c.wa*=-.2;hit='wall';}
  c.y+=c.vy*dt;
  const floor=supportHeight(s,c,o,Math.max(oldY,c.y)+.15);
  if((c.y<=floor||(c.ground&&c.y-floor<.15))&&c.vy<=0){
    const impact=Math.max(0,-c.vy-5);c.y=floor;c.vy=0;c.ground=true;c.air=0;c.rest=(c.rest??0)+dt;
    c.vx*=Math.exp(-dt*7);c.vz*=Math.exp(-dt*7);c.wp+=(-c.pitch*55-c.wp*14)*dt;c.wa*=Math.exp(-dt*7);
    if(Math.abs(c.pitch)<.003&&Math.abs(c.wp)<.04){c.pitch=c.wp=0;c.y=supportHeight(s,c,o,c.y+.15);}
    hit??='roof';return {hit,impact};
  }
  c.ground=false;c.rest=0;c.air=(c.air??0)+dt;
  if(s.mode!=='trials')for(const v of VENTS)if(dist(c,v)<1&&Math.abs(c.y-v.y)<2&&ventState(s.t,v)==='blowing'){c.vy=8;c.ground=false;}
  return {hit,impact:0};
}
