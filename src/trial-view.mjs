import * as T from 'three';
import {mat,disposeObject} from './materials.mjs';
import {softBox} from './art-geometry.mjs';
import {bakeStatic} from './art-batch.mjs';
import {getCourse,coursePlatforms,coursePoint,fanState,sweeperSegment} from './courses.mjs';
const mesh=(p,g,c,x=0,y=0,z=0,role)=>{const m=new T.Mesh(g,mat(c,role));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;p.add(m);return m;};
const box=(p,x,y,z,w,h,d,c,role)=>mesh(p,softBox(w,h,d,.035),c,x,y,z,role);
const cylinder=(p,x,y,z,r,h,c)=>mesh(p,new T.CylinderGeometry(r,r,h,20),c,x,y,z);
const ring=(p,r,c)=>{const m=mesh(p,new T.TorusGeometry(r,.028,6,40),c);m.rotation.x=-Math.PI/2;return m;};
function numberBadge(n){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle='#42626c';g.beginPath();g.arc(64,64,57,0,Math.PI*2);g.fill();g.strokeStyle='#dce4ca';g.lineWidth=4;g.stroke();g.fillStyle='#fff9e8';g.textAlign='center';g.textBaseline='middle';g.font='700 68px Trebuchet MS';g.fillText(String(n),64,67);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const s=new T.Sprite(new T.SpriteMaterial({map,depthTest:false}));s.scale.set(.45,.45,1);return s;}
function platformModel(def,course,index,label){
  const g=new T.Group(),temporary=def.motion||def.lift||def.crumble||def.gate||def.shutter;
  const color=def.gate?'#79a8b2':def.crumble?'#bd9168':def.motion||def.lift?'#647e85':course.color;
  if(!temporary){
    const h=def.y+9;box(g,0,-h/2-.16,0,def.w-.15,h,def.d-.15,color,'brick');
    for(let y=-1.45;y>-Math.min(h,8);y-=2.1)for(const x of [-def.w*.23,def.w*.23]){
      box(g,x,y,def.d/2-.065,.46,.86,.08,'#395b6b');for(const sy of [-.48,.48])box(g,x,y+sy,def.d/2,.62,.08,.17,'#dcd7bf');
      box(g,x-.27,y,def.d/2,.055,.92,.08,'#dcd7bf');box(g,x+.27,y,def.d/2,.055,.92,.08,'#dcd7bf');
    }
    for(const z of [-def.d/2,def.d/2])box(g,0,-.31,z,def.w+.15,.14,.2,'#bec1ae');
  }else{
    box(g,0,-.32,0,def.w,.28,def.d,'#526a76');
    for(const z of [-def.d/2,def.d/2])box(g,0,-.18,z,def.w+.1,.16,.12,color);
    if(def.crumble){for(const x of [-def.w*.44,def.w*.44])for(const z of [-def.d*.44,def.d*.44])box(g,x,-1.3,z,.08,2.4,.08,'#647e85');}
  }
  box(g,0,-.1,0,def.w+.1,.2,def.d+.1,'#dfd9bf');
  box(g,0,.012,0,def.w-.12,.035,def.d-.12,temporary?'#bd9168':'#c3c7b4',temporary?'wood':'tile');
  for(const z of [-def.d/2+.06,def.d/2-.06])box(g,0,.055,z,def.w,.035,.09,def.checkpoint?'#77b99b':temporary?'#8fb9b5':'#e8bc55');
  if(def.crumble)for(let j=0;j<3;j++){const crack=box(g,(j-1)*.55,.045,0,.025,.012,def.d*.7,'#716b5b');crack.rotation.y=.2+j*.23;}
  if(def.checkpoint){cylinder(g,0,.055,0,.66,.06,'#77b99b');ring(g,.72,'#d8edc5').position.y=.09;}
  if(def.id==='start'){const arrow=new T.Mesh(new T.ConeGeometry(.32,.68,3),mat('#fff9e8'));arrow.rotation.z=-Math.PI/2;arrow.scale.z=.03;arrow.position.set(.3,.06,0);g.add(arrow);}
  bakeStatic(g,{freezeWorld:false});
  const warning=box(g,0,.06,def.d/2-.18,def.w-.2,.035,.18,'#e8bc55');warning.visible=false;
  const number=numberBadge(index+1);number.position.set(-def.w/2+.35,.43,def.d/2-.3);g.add(number);
  const ghost=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(def.w,.12,def.d)),new T.LineDashedMaterial({color:'#77adbb',transparent:true,opacity:.48,dashSize:.2,gapSize:.14}));ghost.computeLineDistances();
  return {root:g,warning,number,ghost};
}
export class TrialView{
  constructor(scene,label){this.scene=scene;this.label=label;this.root=null;this.id=null;}
  build(s){
    if(this.root){this.scene.remove(this.root);disposeObject(this.root);}
    const c=getCourse(s),root=this.root=new T.Group();this.scene.add(root);this.id=c.id;this.platforms=new Map();this.fans=[];this.vanes=[];this.sweepers=[];this.stamps=[];
    c.platforms.forEach((p,i)=>{const v=platformModel(p,c,i,this.label);root.add(v.root);root.add(v.ghost);this.platforms.set(p.id,v);
      if(p.motion){const anchor=new T.Group();root.add(anchor);for(const side of [-1,1])box(anchor,p.x+side*(p.w/2+.7),p.y+2.8,p.z,.08,5.6,.08,'#647e85');box(anchor,p.x,p.y+5.5,p.z,p.w+1.7,.08,.08,'#647e85');bakeStatic(anchor);}
      if(p.lift){const rails=new T.Group();root.add(rails);for(const x of [-1.85,1.85])for(const z of [-1.85,1.85])box(rails,p.x+x,2.5,p.z+z,.09,5.3,.09,'#647e85');box(rails,p.x,5.2,p.z,4,.1,.12,'#e8bc55');bakeStatic(rails);}
    });
    for(const f of c.fans){
      const g=new T.Group();root.add(g);cylinder(g,0,.09,0,.96,.18,'#647e85');for(let j=0;j<7;j++)box(g,-.65+j*.21,.2,0,.06,.045,1.35,'#bdc9be');
      const light=box(g,0,.24,.74,.9,.07,.08,'#77b99b'),rings=[];
      for(let j=0;j<4;j++){const r=new T.Mesh(new T.TorusGeometry(.61,.027,6,40),new T.MeshBasicMaterial({color:'#c9f6df',transparent:true,opacity:.7}));r.rotation.x=-Math.PI/2;g.add(r);rings.push(r);}
      const sign=this.label('Timed updraft','#234c5c','#ecedcf',.55);sign.position.set(0,1.1,-1.45);g.add(sign);this.fans.push({def:f,root:g,light,rings});
    }
    for(const v of c.vanes){
      const g=new T.Group();root.add(g);cylinder(g,0,.54,0,.04,1.08,'#647e85');cylinder(g,0,.08,0,.22,.15,'#c5b18b');
      const arrow=new T.Group();arrow.position.y=1.04;g.add(arrow);box(arrow,0,0,0,1,.09,.08,'#e8bc55');const tip=mesh(arrow,new T.ConeGeometry(.18,.35,3),'#e8bc55',.56,0,0);tip.rotation.z=-Math.PI/2;
      const sign=this.label('E · weather vane','#153b4c','#fff1bf',.55);sign.position.y=1.7;g.add(sign);this.vanes.push({def:v,root:g,arrow});
    }
    for(const h of c.sweepers){const g=new T.Group();root.add(g);cylinder(g,0,-.1,0,.22,.28,'#647e85');box(g,h.radius/2,0,0,h.radius,.16,.2,'#cb9273');const bag=mesh(g,new T.CapsuleGeometry(.22,.35,4,12),'#c89b71',h.radius,0,0);bag.rotation.z=Math.PI/2;box(g,h.radius,.02,0,.15,.45,.44,'#ead6aa');this.sweepers.push({def:h,root:g});}
    for(let i=0;i<c.stamps.length;i++){
      const g=new T.Group();root.add(g);const ticket=box(g,0,.95,0,.42,.55,.065,'#e8bc55');box(ticket,0,0,.042,.3,.41,.014,'#f4e6ba');const emblem=mesh(ticket,new T.TorusGeometry(.083,.018,6,20),'#477c86',0,0,.06);
      const halo=ring(g,.32,'#e8bc55');halo.position.y=.08;this.stamps.push({def:c.stamps[i],root:g,ticket,index:i});
    }
    if(c.plate){this.plate=new T.Group();this.plate.position.set(c.plate.x,c.plate.y+.04,c.plate.z);root.add(this.plate);cylinder(this.plate,0,0,0,c.plate.r,.09,'#a78053');this.plateLight=cylinder(this.plate,0,.06,0,c.plate.r*.78,.05,'#e8bc55');const sign=this.label('Charge lift','#153b4c','#fff1bf',.5);sign.position.y=.9;this.plate.add(sign);}else this.plate=null;
    const title=this.label(c.name,'#fff9e8','#42626c',.75);title.position.set(-.6,2.4,-2.4);root.add(title);
  }
  update(s,dt,now,reduced,local){
    if(this.id!==s.course)this.build(s);this.root.visible=true;const c=getCourse(s),all=coursePlatforms(s);
    for(const q of all){
      const v=this.platforms.get(q.id),age=q.crumbleAge??0,fall=q.crumble&&!q.active&&!reduced?Math.min(5,(age-q.crumble)*12):0;
      v.root.position.set(q.x,q.y-fall,q.z);v.root.visible=q.active||fall>0&&fall<5;
      v.ghost.position.set(q.x,q.y+.02,q.z);v.ghost.visible=!q.active||!!q.shutter||!!q.gate;v.warning.visible=!!q.warning&&(reduced||Math.sin(now*17)>0);
      v.number.visible=q.active&&(!local||Math.hypot(local.x-q.x,local.z-q.z)<14);
    }
    for(const v of this.fans){const p=coursePoint(s,v.def),state=fanState(s,v.def);v.root.position.set(p.x,p.y,p.z);v.light.material=mat(state==='blowing'?'#77b99b':state==='warning'?'#e8bc55':'#7d9294');for(let j=0;j<v.rings.length;j++){const r=v.rings[j];r.visible=state==='blowing';r.position.y=.35+(reduced?j*.55:(now*1.7+j*.5)%2.2);r.scale.setScalar(1+r.position.y*.12);}}
    for(const v of this.vanes){const p=coursePoint(s,v.def);v.root.position.set(p.x,p.y,p.z);v.arrow.rotation.y+=( ((s.trial.gates[v.def.id]??0)>s.t?Math.PI/2:0)-v.arrow.rotation.y)*(1-Math.exp(-dt*12));}
    for(const v of this.sweepers){const p=sweeperSegment(s,v.def);v.root.position.set(p.x,p.y,p.z);v.root.rotation.y=-s.t*v.def.speed;}
    for(const v of this.stamps){const p=coursePoint(s,v.def);v.root.position.set(p.x,p.y,p.z);v.root.visible=!s.trial.stamps.includes(v.index);v.ticket.rotation.y=reduced?0:now*.8;v.ticket.position.y=.95+(reduced?0:Math.sin(now*2+v.index)*.055);}
    if(this.plate)this.plateLight.material=mat(s.trial.plate?'#77b99b':'#e8bc55');
  }
  hide(){if(this.root)this.root.visible=false;}
}
