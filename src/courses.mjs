// Authored rooftop trials. All coordinates, moving surfaces and timing are shared
// by the authoritative server, client prediction, collision and scene rendering.
const pad=(id,x,y,z,w=3,d=3,extra={})=>({id,x,y,z,w,d,...extra});
const stamp=(platform,extra={})=>({platform,...extra});
export const COURSES=[
  {id:'chimneys',name:'Chimney Hop',difficulty:'Tricky',par:35,color:'#bd8572',description:'Seven climbing jumps. No walking bridge. Rest on the chimney caps between flights.',tip:'Tap Space to hop; hold briefly to extend the jump. Release before landing so the next hop is ready.',drain:.93,
    platforms:[pad('start',0,0,0,6,5),pad('c1',6.5,1.3,-2.4),pad('c2',13,2.7,2.4,2.8,2.8),pad('c3',19.5,3.8,-1.8,4.3,4,{checkpoint:1}),pad('c4',26,5.3,2.5,2.7,2.7),pad('c5',32.5,6.7,-2.3,2.6,2.6),pad('c6',39,7.8,1.8,4,3.5,{checkpoint:2}),pad('finish',45.5,9.1,0,5,4)],
    stamps:[stamp('c1'),stamp('c4'),stamp('c6')],fans:[],vanes:[],sweepers:[],wind:[]},
  {id:'laundry',name:'Laundry Leap',difficulty:'Tricky',par:45,color:'#8eaba3',description:'Catch the moving laundry lifts, then time the shutter bridge. The wind catches airborne pigeons.',tip:'Wait for a moving platform to come close. Land on it to ride; amber shutters are about to close.',drain:1,
    platforms:[pad('start',0,0,0,6,5),pad('l1',6,1.2,-1.5),pad('l2',12.5,2.1,0,3.2,3.2,{motion:{axis:'z',amp:2.2,period:5.5}}),pad('l3',19,3.4,2,4.4,4,{checkpoint:1}),pad('l4',25.5,4.5,-1.4,3,3,{shutter:{period:5,on:3.2,phase:0}}),pad('l5',32,5.6,1,3.2,3.2,{motion:{axis:'x',amp:1.7,period:5.8}}),pad('l6',39,6.8,-1.5,4.2,3.7,{checkpoint:2}),pad('finish',45.5,8,1.3,5,4)],
    stamps:[stamp('l2'),stamp('l3'),stamp('l6')],fans:[],vanes:[],sweepers:[],wind:[{from:20,to:37,strength:1.4,period:5}]},
  {id:'gusts',name:'Gust Works',difficulty:'Hard',par:50,color:'#82989a',description:'Ride timed updrafts to the upper roofs. Turn the weather vane to reveal a temporary bridge.',tip:'A green fan is blowing. Stand over its grille and hold flap. E near the vane (or a well-aimed gust) opens the blue bridge.',drain:1.05,
    platforms:[pad('start',0,0,0,6,5),pad('g1',6.5,1,0,4.2,4.2),pad('g2',13,6.5,-.5,4.3,4.2,{checkpoint:1}),pad('g3',19.5,7.7,1.7,4.2,4),pad('g4',26.5,9,-1.3,3.5,3.5,{gate:'vane'}),pad('g5',33.5,10.2,1.3,4.2,4,{checkpoint:2}),pad('g6',40,11.5,-1.5,3,3),pad('finish',46.5,12.7,0,5,4)],
    stamps:[stamp('g1'),stamp('g3'),stamp('g6')],fans:[{platform:'g1',period:5,on:2.7,phase:0,force:11}],vanes:[{id:'vane',platform:'g3',dx:.6,dz:-.65,duration:14}],sweepers:[],wind:[]},
  {id:'clockwork',name:'Clockwork Crossing',difficulty:'Hard',par:45,color:'#b89a85',description:'Crumbling ledges do not wait for you. Jump the spinning mail sorter and keep moving.',tip:'Cracked roofs flash amber before they collapse. Rest briefly, then hop. Jump over the low rotating arm.',drain:1.04,
    platforms:[pad('start',0,0,0,6,5),pad('k1',6.2,1.1,-1,3.2,3.2),pad('k2',12.4,2.2,2,3,3,{crumble:1.35}),pad('k3',18.8,3.3,-1,3.4,3.4,{motion:{axis:'z',amp:1.4,period:5.2}}),pad('k4',25.2,4.4,1.4,4.4,4,{checkpoint:1}),pad('k5',31.6,5.4,-1.5,3,3,{crumble:1.3}),pad('k6',38,6.5,-.7,4.3,4.3),pad('k7',44.5,7.6,2,3,3,{crumble:1.3}),pad('finish',51,8.8,0,5,4,{checkpoint:2})],
    stamps:[stamp('k2'),stamp('k4'),stamp('k6',{dz:-1.1})],fans:[],vanes:[],sweepers:[{platform:'k6',dz:.65,radius:1.75,speed:1.55}],wind:[]},
  {id:'freight',name:'Freight Expectations',difficulty:'Hard',par:55,color:'#bd9168',description:'Charge the freight lift, board before it departs, and carry one awkward parcel across the upper roofs.',tip:'Step on the brass plate to start the lift. It waits 3 seconds, then rises. Bring the parcel to the finish and set it down with E.',drain:1,
    platforms:[pad('start',0,0,0,6,5),pad('lift',6.2,.5,0,4,4,{lift:true}),pad('f2',12.5,5.2,0,4.5,4,{checkpoint:1}),pad('f3',18.8,6.3,-1.8,3.6,3.6),pad('f4',25.1,7.4,1.7,3.6,3.6),pad('f5',31.4,8.4,-1,4.2,4,{checkpoint:2}),pad('finish',37.7,9.5,0,5.5,4.5)],
    stamps:[stamp('lift'),stamp('f3'),stamp('f5')],fans:[],vanes:[],sweepers:[],wind:[],plate:{x:.6,y:0,z:1.15,r:1},cargo:true},
  {id:'peak',name:'Pigeon Peak',difficulty:'Expert',par:65,color:'#647e85',description:'The final ascent: moving perches, collapsing caps, a fan climb, wind and a last weather-vane crossing.',tip:'Plan the next landing before leaving the roof. Use the updraft, open the vane bridge, and refill at each checkpoint.',drain:1.1,
    platforms:[pad('start',0,0,0,6,5),pad('p1',6.2,1.3,-1.8,3,3,{crumble:1.4}),pad('p2',12.8,2.6,1,3.3,3.3,{motion:{axis:'z',amp:1.5,period:5.5}}),pad('p3',19.4,3.8,-1,4.4,4.2,{checkpoint:1}),pad('p4',26,9.2,-1.3,4,4),pad('p5',32.6,10.4,1.7,4,4),pad('p6',39.2,11.6,-1.5,3,3,{gate:'peak-vane'}),pad('p7',45.8,12.7,.6,4.3,4.2,{checkpoint:2}),pad('p8',52.4,13.9,-1,2.7,2.7,{crumble:1.35}),pad('finish',59,15.1,1.5,5,4)],
    stamps:[stamp('p2'),stamp('p4'),stamp('p8')],fans:[{platform:'p3',period:5.5,on:3,phase:.4,force:11}],vanes:[{id:'peak-vane',platform:'p5',dx:.6,dz:-.6,duration:15}],sweepers:[{platform:'p7',dz:1.1,radius:1.35,speed:1.6}],wind:[{from:28,to:44,strength:1.7,period:5.5}]},
];
export const isTrial=s=>s?.mode==='trials';
export const getCourse=value=>COURSES.find(c=>c.id===(typeof value==='string'?value:value?.course))??COURSES[0];
export const courseEnd=s=>getCourse(s).platforms.at(-1);
export const trialOrder=s=>{const course=getCourse(s),end=course.platforms.at(-1),cp=checkpointPad(s);return {name:course.name,cargo:'parcel',label:'One parcel. Several poor decisions.',length:1.2,mass:1.1,par:course.par,from:{x:cp.x,y:cp.y,z:cp.z},to:{x:end.x,y:end.y,z:end.z}};};
export const checkpointPad=s=>getCourse(s).platforms.find(p=>(p.checkpoint??0)===(s.trial?.checkpoint??0)&&((s.trial?.checkpoint??0)>0||p.id==='start'))??getCourse(s).platforms[0];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function liftHeight(s,time=s.t){
  const age=time-(s.trial?.liftStart??-100);
  if(age<0||age>12)return .5;
  if(age<3)return .5;
  if(age<6)return .5+4*clamp((age-3)/3,0,1);
  if(age<10)return 4.5;
  return 4.5-4*clamp((age-10)/2,0,1);
}
const cache=new WeakMap();
export function coursePlatforms(s,time=s.t){
  const key=time+':'+(s.trial?.revision??0)+':'+s.course,old=cache.get(s);if(old?.key===key)return old.value;
  const value=getCourse(s).platforms.map(p=>{
    const q={...p,active:true};
    if(p.motion){const m=p.motion;q[m.axis]+=Math.sin(time/m.period*Math.PI*2+(m.phase??0))*m.amp;}
    if(p.lift)q.y=liftHeight(s,time);
    if(p.gate)q.active=(s.trial?.gates?.[p.gate]??0)>time;
    if(p.shutter){const a=(time+(p.shutter.phase??0))%p.shutter.period;q.active=a<p.shutter.on;q.warning=a>p.shutter.on-.75&&a<p.shutter.on;}
    const broke=s.trial?.crumbles?.[p.id];if(broke!==undefined){q.crumbleAge=time-broke;q.warning=q.crumbleAge>p.crumble*.45;q.active=q.crumbleAge<p.crumble||q.crumbleAge>p.crumble+3.5;}
    return q;
  });cache.set(s,{key,value});return value;
}
export function courseSurface(s,x,z,maxY=100,radius=0,time=s.t){
  let best=null;
  for(const p of coursePlatforms(s,time))if(p.active&&p.y<=maxY+.001&&Math.abs(x-p.x)<=p.w/2+radius&&Math.abs(z-p.z)<=p.d/2+radius&&(!best||p.y>best.y))best=p;
  return best;
}
export function coursePoint(s,feature,time=s.t){
  const p=coursePlatforms(s,time).find(p=>p.id===feature.platform);
  return p?{x:p.x+(feature.dx??0),y:p.y+(feature.dy??0),z:p.z+(feature.dz??0)}:feature;
}
export function fanState(s,fan,time=s.t){const a=(time+(fan.phase??0))%fan.period;return a<fan.on?'blowing':a>fan.period-.8?'warning':'rest';}
export function windAt(s,x,time=s.t){return getCourse(s).wind.reduce((a,w)=>a+(x>=w.from&&x<=w.to?Math.sin(time/w.period*Math.PI*2)*w.strength:0),0);}
export function sweeperSegment(s,hazard,time=s.t){
  const p=coursePoint(s,hazard,time),a=time*hazard.speed;return {x:p.x,y:p.y+.4,z:p.z,ex:p.x+Math.cos(a)*hazard.radius,ez:p.z+Math.sin(a)*hazard.radius};
}
export function segmentDistance(p,a){const dx=a.ex-a.x,dz=a.ez-a.z,t=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);}
export function courseMedal(course,time,falls){return time<=course.par&&falls===0?'Gold':time<=course.par*1.55&&falls<=3?'Silver':'Bronze';}
