import * as T from 'three';
import {floorAt,clamp} from './world.mjs';
import {wrapAngle} from './aim.mjs';
import {HEAD_LIMIT} from './pose.mjs';
export {pigeon} from './pigeon-model.mjs';
const lerpAngle=(current,target,speed)=>current+wrapAngle(target-current)*speed;
export function animatePigeon(v,p,s,dt,now,reduced){
  const blend=1-Math.exp(-dt*15),speed=Math.hypot(p.vx??0,p.vz??0),carrying=p.grip!==null&&p.grip!==undefined;
  const aim=Number.isFinite(p.aim)?p.aim:p.a;
  const displacement=v.lastX===null?0:Math.hypot(p.x-v.lastX,p.z-v.lastZ);
  if(v.lastX===null||displacement>3)v.root.rotation.y=-p.a;
  else if(displacement>.0001)v.root.rotation.y=lerpAngle(v.root.rotation.y,-p.a,1-Math.exp(-dt*9));
  const look=clamp(wrapAngle(aim+v.root.rotation.y),-HEAD_LIMIT,HEAD_LIMIT);
  v.head.rotation.y=lerpAngle(v.head.rotation.y,-look,blend);
  v.head.rotation.z=T.MathUtils.lerp(v.head.rotation.z,0,blend);
  const distance=v.lastX===null?0:Math.min(.5,Math.hypot(p.x-v.lastX,p.z-v.lastZ));v.lastX=p.x;v.lastZ=p.z;v.gait+=distance*5.5;
  v.flight+=dt*(p.flapping?11:4.5);
  if(!p.ground&&v.lastGround)v.flight=0;
  if(p.ground&&!v.lastGround)v.land=1;v.lastGround=p.ground;v.land=Math.max(0,v.land-dt*6);
  const walk=p.ground?Math.sin(v.gait):0;
  const wobble=reduced?0:Math.abs(walk)*Math.min(1,speed/4);
  const stretch=!p.ground?clamp((p.vy??0)*.012,-.06,.08):0;
  v.body.scale.set(1+v.land*.05,1-v.land*.04+stretch,1+v.land*.08);
  v.body.position.y=reduced?0:wobble*.025-v.land*.025;
  const lean=carrying?-.07:-Math.min(.075,speed*.014);
  v.body.rotation.z=T.MathUtils.lerp(v.body.rotation.z,lean+(reduced?0:stretch),blend);
  const bank=reduced?0:clamp(wrapAngle((p.a??0)+v.root.rotation.y),-.4,.4)*Math.min(1,speed/4);
  v.body.rotation.x=T.MathUtils.lerp(v.body.rotation.x,bank,blend);
  v.neck.position.x=.2+(reduced?0:walk*.025*Math.min(1,speed/3));
  v.neck.position.y=T.MathUtils.lerp(v.neck.position.y,.91+(carrying?.02:0)-(reduced?0:wobble*.017),blend);
  const bow=p.emoteUntil>s.t&&!reduced?Math.sin((p.emoteUntil-s.t)*9)*.3:0;v.head.rotation.z+=bow;
  v.eyes.forEach(e=>e.visible=!reduced&&((now+v.slot*.9)%4.8)>.0&&((now+v.slot*.9)%4.8)<.12);
  for(let i=0;i<2;i++){
    const w=v.wings[i],side=w.sign;
    let spread=0,sweep=0;
    v.air??=0;if(i===0)v.air=T.MathUtils.lerp(v.air,p.ground?0:1,1-Math.exp(-dt*12));
    if(!p.ground){
      const cycle=(v.flight%(Math.PI*2))/(Math.PI*2);
      const stroke=p.flapping&&!reduced?(cycle<.38?Math.cos(cycle/.38*Math.PI):-Math.cos((cycle-.38)/.62*Math.PI)):.3;
      spread=side*(p.flapping?.12+stroke*.9:.12);sweep=side*.09;
    }
    if(p.gustUntil>s.t)spread=side*(reduced?.65:Math.sin((p.gustUntil-s.t)*14)*.65+.3);
    w.shoulder.rotation.x=T.MathUtils.lerp(w.shoulder.rotation.x,spread,blend);
    w.shoulder.rotation.y=T.MathUtils.lerp(w.shoulder.rotation.y,sweep,blend);
    w.folded.visible=v.air<.98;w.flight.visible=v.air>.02;
    w.folded.scale.setScalar(1-v.air*.75);w.flight.scale.set(1,.6+v.air*.4,Math.max(.01,v.air));
    w.tip.rotation.y=T.MathUtils.lerp(w.tip.rotation.y,side*(p.flapping?.08+Math.sin(v.flight-.45)*.1:0),blend);
    w.tip.rotation.x=T.MathUtils.lerp(w.tip.rotation.x,p.flapping?-spread*.18:0,blend);
    const foot=v.feet[i],phase=((v.gait/(2*Math.PI)+i*.5)%1+1)%1;
    if(p.ground){
      const inStance=phase<.62||speed<.15;
      const ahead=(inStance?.2: .2+Math.sin((phase-.62)/.38*Math.PI)*.08);
      const lx=ahead,lz=i===0?-.19:.19,cy=Math.cos(v.root.rotation.y),sy=Math.sin(v.root.rotation.y);
      const target={x:v.root.position.x+cy*lx+sy*lz,z:v.root.position.z-sy*lx+cy*lz};
      if(!v.plants[i]||(!v.stance[i]&&inStance)||Math.hypot(v.plants[i].x-p.x,v.plants[i].z-p.z)>.7)v.plants[i]=target;
      let world;if(inStance)world=v.plants[i];else{const q=(phase-.62)/.38;const f=1-Math.pow(1-q,2);world={x:v.plants[i].x+(target.x-v.plants[i].x)*f,z:v.plants[i].z+(target.z-v.plants[i].z)*f};}
      const dx=world.x-v.root.position.x,dz=world.z-v.root.position.z;foot.position.x=cy*dx-sy*dz;foot.position.z=sy*dx+cy*dz;foot.position.y=.22+(!inStance&&!reduced?Math.sin((phase-.62)/.38*Math.PI)*.14:0);foot.rotation.z=T.MathUtils.lerp(foot.rotation.z,0,blend);v.stance[i]=inStance;
    }else{foot.position.lerp(new T.Vector3(-.08,.37,i===0?-.22:.22),blend);foot.rotation.z=T.MathUtils.lerp(foot.rotation.z,-.8,blend);v.stance[i]=false;v.plants[i]=null;}

  }
  v.tail.rotation.z=T.MathUtils.lerp(v.tail.rotation.z,!p.ground?-.22:.05,blend);v.tail.scale.z=T.MathUtils.lerp(v.tail.scale.z,p.ground?1:1.4,blend);
  v.bag.rotation.x=reduced?0:Math.sin(v.gait)*Math.min(.16,speed*.03);
  const floor=floorAt(p.x,p.z,p.y+.1,s.t,s.bridge,.15,s),drop=floor>-50?Math.max(0,p.y-floor):0;
  v.shadow.position.y=(floor>-50?floor-p.y:0)+.025;v.shadow.scale.setScalar(1+Math.min(2,drop)*.17);v.shadow.material.opacity=.2/(1+drop*.22);
  v.ring.position.y=(floor>-50?floor-p.y:0)+.035;
  v.wind.visible=p.gustUntil>s.t;v.wind.rotation.y=-(p.gustAim??aim)-v.root.rotation.y;
  if(v.wind.visible&&!reduced)v.wind.scale.setScalar(1+(.4-(p.gustUntil-s.t))*.8);
}
