import {makeState,addPlayer,act,setInput,tick} from '../src/engine.mjs';
import {getCourse,coursePlatforms,coursePoint,checkpointPad,fanState} from '../src/courses.mjs';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function makeTrialRun(id,count=1){
  const s=makeState('TRIALQA');for(let i=0;i<count;i++)addPlayer(s,'p'+i,'Pilot '+i);if(!act(s,s.players[0],'course',id)||!act(s,s.players[0],'start'))throw Error('Could not start '+id);return s;
}
export function trialPilot(id,slot=0){
  return {id,slot,index:1,seq:0,flight:false,landAt:0,lastFalls:0,charged:false,finished:false,
    decide(s,p){
      const c=getCourse(s),cp=checkpointPad(s);
      if(this.lastFalls!==p.rescues&&p.respawnUntil>s.t){this.index=c.platforms.findIndex(q=>q.id===cp.id)+1;this.flight=false;this.landAt=s.t;this.charged=s.trial.checkpoint>0;}
      this.lastFalls=p.rescues;
      const input={x:0,z:0,jump:false,aim:null,power:1},actions=[];
      const steer=(x,z,scale=1)=>{input.x=clamp(((x-p.x)*3-(p.vx??0)*.45)/5.2,-1,1)*scale;input.z=clamp(((z-p.z)*3-(p.vz??0)*.45)/5.2,-1,1)*scale;const n=Math.max(1,Math.hypot(input.x,input.z));input.x/=n;input.z/=n;};
      if(c.cargo&&this.slot===0&&p.grip===null&&!s.trial.cargoDelivered&&Math.hypot(p.x-s.cargo.x,p.z-s.cargo.z)<2)actions.push('grab');
      if(c.plate&&!this.charged&&s.trial.checkpoint===0){
        steer(c.plate.x,c.plate.z);if(s.t-s.trial.liftStart<3){this.charged=true;this.landAt=s.t;}return {input,actions};
      }
      const all=coursePlatforms(s),target=all[Math.min(this.index,all.length-1)],def=c.platforms[this.index];
      let point=target;
      const st=c.stamps.find(f=>f.platform===target.id);if(st)point={...target,...coursePoint(s,st)};
      if(target.id==='finish'&&c.cargo&&this.slot===0)point={...target,x:target.x-1.29,z:target.z};
      const targetFan=c.fans.find(f=>f.platform===target.id);
      if(targetFan&&p.vy>7&&p.y>target.y+.4&&Math.hypot(p.x-target.x,p.z-target.z)<1.4){this.index++;this.flight=true;this.landAt=0;return {input:{...input,x:1,jump:true},actions};}
      if(p.ground&&p.platformId===target.id){
        if(!this.landAt)this.landAt=s.t;this.flight=false;steer(point.x,point.z);
        for(const v of c.vanes)if(v.platform===target.id)actions.push('grab');
        if(target.id==='finish'){
          if(c.cargo&&this.slot===0&&!s.trial.cargoDelivered&&p.grip!==null&&Math.hypot(p.x-point.x,p.z-point.z)<.25&&Math.hypot(p.vx,p.vz)<.7){actions.push('grab');this.finished=true;}
          if(this.finished||!c.cargo||this.slot!==0)actions.splice(0,actions.length);return {input,actions:this.finished&&p.grip!==null?['grab']:actions};
        }
        const enough=p.stamina>.92&&s.t-this.landAt>.3,waitLift=target.lift&&target.y<4.2;
        if(enough&&!waitLift&&Math.hypot(p.x-point.x,p.z-point.z)<.55){this.index++;this.landAt=0;this.flight=false;}return {input,actions};
      }
      if(this.flight&&!p.ground){
        const future=coursePlatforms(s,s.t+.25)[this.index],moving=def?.motion?future:point;steer(moving.x,moving.z);
        input.jump=true;return {input,actions};
      }
      if(!p.ground){
        // An updraft can lift a pigeon as it reaches the fan's roof.
        const previous=c.platforms[Math.max(0,this.index-1)],fan=c.fans.find(f=>f.platform===previous.id);
        if(fan&&p.vy>5&&p.y>previous.y+.5){this.flight=true;steer(point.x,point.z);input.jump=true;return {input,actions};}
        steer(point.x,point.z);input.jump=true;return {input,actions};
      }
      for(const v of c.vanes)if(v.platform===p.platformId)actions.push('grab');
      if(def?.gate&&(s.trial.gates[def.gate]??0)<s.t+3)return {input,actions};
      if(def?.shutter&&!coursePlatforms(s,s.t+1.35)[this.index].active)return {input,actions};
      if(p.stamina<.92)return {input,actions};
      this.flight=true;this.landAt=0;steer(point.x,point.z);input.jump=true;return {input,actions};
    }
  };
}
export function solveTrial(id,count=1,maxSeconds=180){
  const s=makeTrialRun(id,count),pilots=s.players.map((p,i)=>trialPilot(p.id,i));
  for(let n=0;n<maxSeconds*60&&s.phase==='playing';n++){
    for(let i=0;i<s.players.length;i++){const p=s.players[i],pilot=pilots[i],decision=pilot.decide(s,p);for(const a of decision.actions)act(s,p,a);setInput(s,p,{...decision.input,seq:++pilot.seq});}tick(s);
  }
  return {s,pilots};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('trial-pilot.mjs')){
  const ids=process.argv.slice(2);for(const id of ids.length?ids:['chimneys','laundry','gusts','clockwork','freight','peak']){
    const {s,pilots}=solveTrial(id,Number(process.env.CREW_SIZE)||1);console.log(JSON.stringify({id,phase:s.phase,time:Math.round(s.t),stamps:s.trial.stamps,falls:s.trial.falls,checkpoint:s.trial.checkpoint,platforms:s.players.map(p=>({x:+p.x.toFixed(2),y:+p.y.toFixed(2),z:+p.z.toFixed(2),ground:p.ground,platform:p.platformId,stamina:p.stamina,grip:p.grip})),indices:pilots.map(p=>p.index),cargo:s.cargo,result:s.trial.result}));
  }
}
