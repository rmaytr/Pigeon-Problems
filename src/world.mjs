import {isTrial,coursePlatforms,courseSurface,trialOrder} from './courses.mjs';
export const STEP = 1 / 60;
export const PALETTE = ['#ffcf54', '#7dddc9', '#e99ac8', '#91b7ff'];
export const ROOFS = [
  {x:0,z:0,w:10,d:11,y:0,color:'#d28e78',name:'Dispatch'},
  {x:12,z:0,w:10,d:12,y:1,color:'#9bb78d',name:'Roof gardens'},
  {x:24,z:0,w:10,d:12,y:2,color:'#e8b471',name:'Crumb & Co.'},
  {x:36,z:0,w:10,d:12,y:3,color:'#a4b6c4',name:'Laundry lane'},
  {x:48,z:0,w:10,d:12,y:4,color:'#d9a093',name:'Breeze terrace'},
  {x:60,z:0,w:10,d:11,y:6,color:'#8eb9ab',name:'Upper management'},
];
export const BRIDGES = [];
for(let i=0;i<5;i++){
  const end=ROOFS[i].x+5, next=ROOFS[i+1];
  const rise=next.y-ROOFS[i].y;
  // Broad stepped detours are always available, including when a shortcut closes.
  for(let j=0;j<4;j++) BRIDGES.push({x:end+(j+.5)*.5,z:4.8,w:.55,d:2.4,y:ROOFS[i].y+rise*(j+1)/4,safe:true});
}
export const SOLIDS = [
  {x:19.8,z:-2.5,w:1,d:2.7,y:2,h:2.4,kind:'gate'},
  {x:19.8,z:2.5,w:1,d:2.7,y:2,h:2.4,kind:'gate'},
  {x:10,z:-4,w:2.5,d:1.1,y:1,h:.65,kind:'planter'},
  {x:14,z:-4,w:2.5,d:1.1,y:1,h:.65,kind:'planter'},
  {x:25,z:-4.4,w:3,d:1.2,y:2,h:1.5,kind:'oven'},
  {x:49,z:-4,w:2,d:1.3,y:4,h:1,kind:'planter'},
];
export const VENTS = [{x:27,z:0,y:2,phase:0},{x:39,z:-2,y:3,phase:2.2}];
export const PADS = [{x:51,z:-2,y:4},{x:51,z:2,y:4}];
export const ORDERS = [
  {name:'Probationary post',cargo:'parcel',label:'One very important stamp',tip:'Take the parcel to the glowing ring in the roof garden. E grabs and gently sets down.',from:{x:1,z:0,y:0},to:{x:12,z:0,y:1},length:1.2,mass:1,par:60},
  {name:'Bread of unusual size',cargo:'baguette',label:'Please do not fold the bread',tip:'Two marked ends. R turns the baguette through the bakery posts. The back bridge is wider.',from:{x:12,z:0,y:1},to:{x:24,z:0,y:2},length:4.4,mass:1.6,par:75},
  {name:'Extremely normal eggs',cargo:'eggs',label:'Six eggs. One shared responsibility.',tip:'A second carrier steadies the box. Watch the vent lights; the yellow back bridges are safer.',from:{x:24,z:0,y:2},to:{x:36,z:0,y:3},length:1.8,mass:1.5,par:80,fragile:true},
  {name:'A small breeze',cargo:'sail',label:'The customer ordered some atmosphere',tip:'Q or right mouse sends wind along your aim. Gust the sail or an airborne teammate. E catches nearby cargo.',from:{x:36,z:0,y:3},to:{x:48,z:0,y:4},length:2.5,mass:2,par:85,wind:true},
  {name:'Upper management',cargo:'cake',label:'A promotion. And a very tall cake.',tip:'Tap both terrace pads within 4 seconds to open the short bridge. Solo needs one. Back stairs always work.',from:{x:48,z:0,y:4},to:{x:60,z:0,y:6},length:2,mass:2.3,par:100,fragile:true},
];
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const orderFor=s=>isTrial(s)?trialOrder(s):ORDERS[s.order];
export function platforms(t, bridge=0,s=null){
  if(isTrial(s))return coursePlatforms(s,t).filter(p=>p.active);
  const p=[...ROOFS,...BRIDGES];
  p.push({x:30,z:Math.sin(t*.65)*2,w:2.15,d:2.3,y:2.5+Math.sin(t*.65)*.35,moving:true});
  if(bridge>t)p.push({x:54,z:0,w:2.3,d:2.5,y:5,temporary:true});
  return p;
}
export function floorAt(x,z,maxY=100,t=0,bridge=0,radius=0,s=null){
  if(isTrial(s))return courseSurface(s,x,z,maxY,radius,t)?.y??-100;
  let y=-100;
  for(const p of platforms(t,bridge))if(Math.abs(x-p.x)<=p.w/2+radius&&Math.abs(z-p.z)<=p.d/2+radius&&p.y<=maxY+.001)y=Math.max(y,p.y);
  return y;
}
export function blocked(x,y,z,r=.32,state=null){if(isTrial(state))return false;return SOLIDS.some(s=>Math.abs(x-s.x)<s.w/2+r&&Math.abs(z-s.z)<s.d/2+r&&y<s.y+s.h&&y+1>s.y+.05);}
export function cargoBlocked(c,order,t,signUntil,state=null){
  if(isTrial(state))return false;
  const n=Math.ceil(order.length/.4);
  for(let i=0;i<=n;i++){
    const d=(i/n-.5)*order.length;
    const x=c.x+Math.cos(c.a)*Math.cos(c.pitch??0)*d,z=c.z+Math.sin(c.a)*Math.cos(c.pitch??0)*d,y=c.y+Math.sin(c.pitch??0)*d;
    if(blocked(x,y-.25,z,.24))return true;
    if(signUntil<t&&Math.abs(x-42)<.35&&Math.abs(z)<1.7&&y<5.6&&y>3)return true;
  }
  return false;
}
export function ventState(t,v){const p=(t+v.phase)%6;return p>4.7?'blowing':p>3.5?'warning':'rest';}
