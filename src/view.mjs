import * as T from 'three';
import {bakeStatic} from './art-batch.mjs';
import {ROOFS,BRIDGES,SOLIDS,VENTS,PADS,ORDERS,PALETTE,ventState,platforms,orderFor} from './world.mjs';
import {mat,disposeObject} from './materials.mjs';
import {pigeon as createPigeon,animatePigeon} from './pigeon.mjs';
import {decorateCity,decorateBackdrop,skyTexture,planter} from './scenery.mjs';
import {softBox} from './art-geometry.mjs';
import {predictThrow,powerForTarget} from './aim.mjs';
import {HEAD_LIMIT,lookHeading} from './pose.mjs';
import {isTrial} from './courses.mjs';
import {TrialView} from './trial-view.mjs';
function mesh(geo,color,parent,x=0,y=0,z=0){const m=new T.Mesh(geo,mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const box=(p,x,y,z,w,h,d,c)=>mesh(softBox(w,h,d,.035),c,p,x,y,z);
const sphere=(p,x,y,z,rx,ry,rz,c)=>{const m=mesh(new T.SphereGeometry(1,12,8),c,p,x,y,z);m.scale.set(rx,ry,rz);return m;};
const cylinder=(p,x,y,z,r,h,c,n=12)=>mesh(new T.CylinderGeometry(r,r,h,n),c,p,x,y,z);
function label(text,color='#153b4c',bg='#fff9e8',size=1){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const c=canvas.getContext('2d');
  c.fillStyle=bg;c.beginPath();c.roundRect(4,4,504,88,24);c.fill();c.font='800 35px Trebuchet MS, sans-serif';c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.fillText(text,256,50,480);
  const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
  const s=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:false}));s.scale.set(4*size,.75*size,1);return s;
}
const pigeon=(color,slot)=>createPigeon(color,slot,label);
function cargoModel(kind){
  const g=new T.Group();
  if(kind==='baguette'){
    const bread=mesh(new T.CapsuleGeometry(.3,3.8,4,12),'#e7ae58',g);bread.rotation.z=Math.PI/2;
    for(let x=-1.5;x<1.7;x+=.6){const m=box(g,x,.27,0,.13,.025,.4,'#ffe1a1');m.rotation.y=.5;}
    box(g,-.5,0,0,.8,.69,.68,'#eee0b4');
  }else if(kind==='sail'){
    box(g,0,0,0,2.4,.7,1.4,'#bd9168');cylinder(g,0,1,0,.045,2,'#7b6753');
    const sail=mesh(new T.ConeGeometry(1.2,1.8,3),'#fff3be',g,0,1.15,0);sail.scale.z=.06;sail.rotation.z=-.18;
    box(g,0,.38,0,2.7,.12,.14,'#719f9e');
  }else if(kind==='cake'){
    cylinder(g,0,0,0,.95,.5,'#fff7de');cylinder(g,0,.5,0,.65,.5,'#f1bad0');cylinder(g,0,.95,0,.35,.4,'#fff7de');
    for(let i=0;i<8;i++)sphere(g,Math.cos(i*.8)*.77,.28,Math.sin(i*.8)*.77,.08,.09,.08,'#c96575');
    const tiny=pigeon('#ffcf54',0);tiny.root.scale.setScalar(.18);tiny.root.position.y=1.14;g.add(tiny.root);
  }else{
    box(g,0,0,0,kind==='eggs'?1.75:1.2,.75,1,'#cfac7d');
    box(g,0,.39,0,.18,.025,1.03,'#fff4d2');box(g,0,0,.51,.18,.78,.02,'#fff4d2');
    box(g,.3,.395,.05,.42,.03,.45,'#fff9e8');
    if(kind==='eggs')for(let i=0;i<3;i++)sphere(g,-.5+i*.5,.48,0,.15,.2,.15,'#fff9e8');
    else {const stamp=box(g,.3,.414,.05,.22,.01,.22,'#6a929b');stamp.rotation.y=.2;}
  }
  const o=ORDERS.find(o=>o.cargo===kind);
  for(const v of [-1,1]){
    const point=sphere(g,v*o.length*.42,.1,0,.075,.075,.075,'#e8bc55');
    const ring=new T.Mesh(new T.TorusGeometry(.14,.02,6,20),mat('#fff9e8'));ring.rotation.y=Math.PI/2;point.add(ring);
  }
  return g;
}
export class View {
  constructor(container,{reduced=false}={}){
    this.reduced=reduced;this.scene=new T.Scene();this.scene.background=skyTexture();this.scene.fog=new T.Fog('#bdcfd0',38,105);
    try{this.renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch{throw Error('This browser could not start WebGL. Enable hardware acceleration, then reload.');}
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.92;container.append(this.renderer.domElement);
    this.camera=new T.OrthographicCamera();this.camera.near=.1;this.camera.far=220;this.target=new T.Vector3(15,1,0);this.home=true;
    this.scene.add(new T.HemisphereLight('#ecf5ff','#87978c',1.65));
    this.sun=new T.DirectionalLight('#fff0d6',3.1);this.sun.position.set(-15,35,15);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);this.sun.shadow.camera.left=-27;this.sun.shadow.camera.right=27;this.sun.shadow.camera.top=25;this.sun.shadow.camera.bottom=-25;this.sun.shadow.normalBias=.028;this.sun.shadow.bias=-.00015;this.sun.shadow.radius=2;this.scene.add(this.sun);this.scene.add(this.sun.target);
    this.crew=new Map();this.decor=new T.Group();this.scene.add(this.decor);this.buildWorld();this.trialView=new TrialView(this.scene,label);
    this.goal=new T.Group();this.scene.add(this.goal);
    const ring=new T.Mesh(new T.RingGeometry(1.4,1.62,64),new T.MeshBasicMaterial({color:'#ffda64',side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;this.goal.add(ring);
    const inner=new T.Mesh(new T.CircleGeometry(1.4,48),new T.MeshBasicMaterial({color:'#ffda64',transparent:true,opacity:.15,depthWrite:false}));inner.rotation.x=-Math.PI/2;inner.position.y=-.005;this.goal.add(inner);
    cylinder(this.goal,1.8,1,0,.045,2,'#fff9e8');box(this.goal,2.3,1.6,0,1,.6,.06,'#ffcf54');
    this.goalLabel=label('Deliver here · E');this.goalLabel.position.set(0,2.5,0);this.goal.add(this.goalLabel);
    this.trail=new T.Group();this.scene.add(this.trail);for(let i=0;i<60;i++)sphere(this.trail,0,0,0,.065,.065,.065,'#fff9e8');
    this.aimMarker=new T.Group();this.scene.add(this.aimMarker);const stamp=new T.Mesh(new T.RingGeometry(.35,.43,32),new T.MeshBasicMaterial({color:'#fff0af',side:T.DoubleSide,depthTest:false}));stamp.rotation.x=-Math.PI/2;this.aimMarker.add(stamp);
    this.aimLine=new T.Line(new T.BufferGeometry(),new T.LineDashedMaterial({color:'#fff2b2',dashSize:.18,gapSize:.1,transparent:true,opacity:.8}));this.scene.add(this.aimLine);this.aimMarker.visible=this.aimLine.visible=false;this.aimStatus=label('Landing preview','#153b4c','#fff9e8',.45);this.aimStatus.position.y=.65;this.aimMarker.add(this.aimStatus);this.lastAimStatus='';
    this.raycaster=new T.Raycaster();this.rayPoint=new T.Vector3();this.rayPlane=new T.Plane();this.mouse=new T.Vector2();
    this.carryLines=new T.LineSegments(new T.BufferGeometry(),new T.LineBasicMaterial({color:'#ffda64'}));this.scene.add(this.carryLines);
    this.demo=[pigeon(PALETTE[0],0),pigeon(PALETTE[1],1),pigeon(PALETTE[2],2)];for(const p of this.demo)this.scene.add(p.root);
    this.demo[0].root.position.set(8.15,1,1.3);this.demo[1].root.position.set(13.45,1,1.3);this.demo[2].root.position.set(23,2,1);this.demo[1].root.rotation.y=Math.PI;
    this.demoCargo=cargoModel('baguette');this.demoCargo.position.set(10.8,2.065,1.3);this.scene.add(this.demoCargo);
    this.resize=()=>{const w=innerWidth,h=innerHeight;this.renderer.setSize(w,h);const half=this.home?12.7:8.6;this.camera.left=-half*w/h;this.camera.right=half*w/h;this.camera.top=half;this.camera.bottom=-half;this.camera.updateProjectionMatrix();};window.addEventListener('resize',this.resize);this.resize();
  }
  buildWorld(){
    const root=this.decor;
    for(let i=0;i<ROOFS.length;i++){
      const r=ROOFS[i],height=r.y+9;box(root,r.x,-9+height/2,r.z,r.w,height,r.d,r.color);box(root,r.x,r.y-.12,r.z,r.w+.2,.24,r.d+.2,'#e9d1ac');
      box(root,r.x,r.y+.05,r.z,r.w-.25,.1,r.d-.25,['#d8cbb2','#bbca9e','#dfc299','#b8bfbd','#d5b5a1','#bcd2c3'][i]);
      // Low edging leaves the playable route and silhouettes readable.
      box(root,r.x,r.y+.16,-r.d/2,r.w,.26,.23,r.color);box(root,r.x,r.y+.16,r.d/2,r.w,.26,.23,r.color);
      const name=label(r.name,'#fff9e8','#234c5c',.8);name.position.set(r.x,r.y+1.1,-r.d/2+.3);root.add(name);
    }
    for(const b of BRIDGES){box(root,b.x,b.y-.16,b.z,b.w,.32,b.d,'#eac969');box(root,b.x,b.y+.01,b.z,.06,.02,b.d,'#ad8b56');}
    this.lift=new T.Group();box(this.lift,0,-.15,0,2.15,.3,2.3,'#d8b67d');for(let z=-1;z<1.1;z+=.3)box(this.lift,0,.02,z,2,.025,.04,'#fff1bc');root.add(this.lift);
    this.shortBridge=box(root,54,4.85,0,2.3,.3,2.5,'#ffcf54');
    for(const s of SOLIDS){
      if(s.kind==='planter'){
        planter(root,s);
      }else{box(root,s.x,s.y+s.h/2,s.z,s.w,s.h,s.d,s.kind==='gate'?'#cd866f':'#997f70');if(s.kind==='gate')box(root,s.x,s.y+s.h,s.z,1.15,.15,s.d+.2,'#f8dfb5');}
    }
    // Headquarters with a pigeon-size dispatch hatch.
    box(root,-2,1,-3,3,2,2.2,'#427681');box(root,-2,2.13,-3,3.5,.25,2.6,'#ffcf54');box(root,-2,1,-1.87,1.4,.8,.03,'#234c5c');const hq=label('Pigeon Post','#153b4c','#ffcf54',.65);hq.position.set(-2,2.8,-3);root.add(hq);
    for(let k=0;k<3;k++)box(root,-3+k*.6,.25,2.9,.5,.5,.5,'#bc956a');
    // Oversized bakery awning, oven, bread display.
    box(root,24,3.6,-3.4,4,3.2,2,'#f5d6a1');box(root,24,4.9,-2.1,4.6,.18,1.5,'#fff3d5');
    for(let k=0;k<6;k++)box(root,22.1+k*.76,4.8,-1.6,.38,.22,1.4,'#d36f65');
    const bread=label('Crumb & Co.','#6b4b3e','#fff1d2',.75);bread.position.set(24,5.6,-2.7);root.add(bread);
    for(let k=0;k<4;k++){const b=cargoModel('baguette');b.scale.setScalar(.23);b.position.set(22.7+k*.85,3,-2);root.add(b);}
    // Laundry lines and wind socks.
    this.laundry=[];
    for(let row=0;row<2;row++){
      for(const x of [32.5,39.5])cylinder(root,x,5,-3+row*5,.05,4,'#7a877e');
      const points=[new T.Vector3(32.5,6.8,-3+row*5),new T.Vector3(36,6.5,-3+row*5),new T.Vector3(39.5,6.8,-3+row*5)];
      root.add(new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:'#5b7680'})));
      for(let k=0;k<6;k++){const g=new T.Group(),x=33.2+k*1.1,y=6.5+(x-36)**2*.024;g.position.set(x,y,-3+row*5);const fabric=mesh(new T.PlaneGeometry(.7,1,8,10),['#f2c8b3','#fff1cc','#85a7b3','#e9b7c3'][k%4],g,0,-.5,0);g.userData.fabric=fabric;for(const dx of [-.23,.23])box(root,x+dx,y+.02,-3+row*5,.035,.09,.035,'#b69977');root.add(g);this.laundry.push(g);}
    }
    // Wind sign turns when gusted.
    cylinder(root,42,4.6,-1.8,.06,2.5,'#4e7180');this.sign=new T.Group();this.sign.position.set(42,4.4,0);box(this.sign,0,.4,0,.18,.65,3.3,'#66a8a3');root.add(this.sign);
    const sign=label('Gust opens express','#fff9e8','#356e78',.65);sign.position.set(42,6,0);root.add(sign);
    this.vents=VENTS.map(v=>{const g=new T.Group();g.position.set(v.x,v.y+.05,v.z);root.add(g);box(g,0,.08,0,1.4,.16,1.4,'#6e8491');for(let k=0;k<5;k++)box(g,-.5+k*.25,.18,0,.08,.035,1.1,'#b6c5bf');const glow=box(g,0,.2,.62,1,.06,.08,'#77b99b');const winds=new T.Group();g.add(winds);for(let k=0;k<4;k++){const r=new T.Mesh(new T.TorusGeometry(.4,.025,5,24),mat('#e7ffff'));r.rotation.x=Math.PI/2;r.position.y=.5+k*.5;winds.add(r);}return {g,glow,winds};});
    this.pads=PADS.map((p,i)=>{const g=new T.Group();g.position.set(p.x,p.y+.04,p.z);root.add(g);cylinder(g,0,.05,0,.75,.1,'#537d8c');cylinder(g,0,.12,0,.6,.05,PALETTE[i]);const n=label(String(i+1),'#153b4c',PALETTE[i],.2);n.position.y=.2;g.add(n);return g;});
    // Artist's terrace and elevated destination.
    for(let k=0;k<3;k++){const canvas=box(root,46+k*1.5,5,-3,.9,1.4,.12,['#e6b563','#81b5ab','#cd878b'][k]);canvas.rotation.y=.2+k*.3;}
    box(root,61,7.7,-2.8,5,3.4,3,'#f1e4c3');box(root,61,9.5,-2.8,5.5,.25,3.5,'#528a91');
    const chief=label('Upper management','#153b4c','#ffcf54',.8);chief.position.set(60,10.4,-2.8);root.add(chief);
    decorateCity(root,{includeBackdrop:false});
    this.backdrop=new T.Group();this.scene.add(this.backdrop);decorateBackdrop(this.backdrop);bakeStatic(this.backdrop);
    // Batch static architectural geometry by material. Moving mechanisms and
    // character groups stay independent; hundreds of window meshes become a few draws.
    bakeStatic(root,{exclude:new Set([this.lift,this.shortBridge,this.sign,...this.vents.map(v=>v.g),...this.laundry])});
  }
  setHome(home){this.home=home;this.stageKey=null;this.resize();for(const p of this.demo)p.root.visible=home;this.demoCargo.visible=home;}
  aimAt(x,y,p,s){
    this.mouse.set(x/innerWidth*2-1,1-y/innerHeight*2);this.raycaster.setFromCamera(this.mouse,this.camera);
    let target=null,nearest=Infinity;
    for(const roof of platforms(s.t,s.bridge,s)){this.rayPlane.set(new T.Vector3(0,1,0),-roof.y);const point=this.raycaster.ray.intersectPlane(this.rayPlane,this.rayPoint);if(point&&Math.abs(point.x-roof.x)<=roof.w/2&&Math.abs(point.z-roof.z)<=roof.d/2){const d=point.distanceTo(this.raycaster.ray.origin);if(d<nearest){nearest=d;target={x:point.x,y:roof.y+.45,z:point.z};}}}
    if(!target){this.rayPlane.set(new T.Vector3(0,1,0),-p.y);const q=this.raycaster.ray.intersectPlane(this.rayPlane,this.rayPoint);if(q)target={x:q.x,y:p.y+.45,z:q.z};}
    if(!target)return null;const origin=p.grip!==null&&s.cargo?s.cargo:p;const desired=Math.atan2(target.z-origin.z,target.x-origin.x);return {aim:lookHeading(p,desired),power:powerForTarget(s,p,target),target,limited:Math.abs(Math.atan2(Math.sin(desired-p.a),Math.cos(desired-p.a)))>HEAD_LIMIT};
  }
  render(s,localId,dt,now){
    const t=s?.t??now,trial=isTrial(s)&&!!s.trial&&!this.home;this.decor.visible=!trial;if(trial)this.trialView.update(s,dt,now,this.reduced,s.players.find(p=>p.id===localId));else this.trialView.hide();
    this.lift.position.set(30,2.5+Math.sin(t*.65)*.35,Math.sin(t*.65)*2);
    this.shortBridge.visible=!!s&&s.bridge>t;this.sign.rotation.y=s?.signUntil>t?Math.PI/2:0;
    for(let i=0;i<this.vents.length;i++){const v=this.vents[i],state=ventState(t,VENTS[i]);v.glow.material=mat(state==='warning'?'#ffcf54':state==='blowing'?'#f18166':'#77b99b');v.winds.visible=state==='blowing';if(!this.reduced)v.winds.position.y=(now*1.5)%1;}
    for(let i=0;i<this.laundry.length;i++){const g=this.laundry[i];g.rotation.x=this.reduced?0:Math.sin(now*1.3+i)*.13;if(!this.reduced){const geometry=g.userData.fabric.geometry,p=geometry.attributes.position;for(let j=0;j<p.count;j++){const depth=.5-p.getY(j);p.setZ(j,Math.sin(p.getX(j)*4+now*2.2+i+depth*3)*.05*depth);}p.needsUpdate=true;geometry.computeVertexNormals();}}
    if(this.home){
      this.target.lerp(new T.Vector3(14,1,0),Math.min(1,dt*3));this.goal.visible=false;this.trail.visible=false;this.carryLines.visible=false;this.aimMarker.visible=this.aimLine.visible=false;
      for(const p of this.demo)animatePigeon(p,{x:p.root.position.x,y:p.root.position.y,z:p.root.position.z,a:p.slot===1?Math.PI:0,aim:(p.slot===1?Math.PI:0)+Math.sin(now*.5+p.slot)*.04,ground:true,vx:0,vz:0,grip:p.slot<2?p.slot:null}, {t:now,bridge:0,cargo:{x:10.8,z:1.3}},dt,now,this.reduced);
    }else if(s){
      const local=s.players.find(p=>p.id===localId);
      const stageKey=(trial?s.course:'deliveries')+':'+s.startedAt;
      if(stageKey!==this.stageKey&&local){this.stageKey=stageKey;this.target.set(local.x+2.5,local.y+.4,local.z);for(const p of s.players){const v=this.crew.get(p.id);if(v){v.root.position.set(p.x,p.y,p.z);v.lastX=null;}}if(this.cargo&&s.cargo)this.cargo.position.set(s.cargo.x,s.cargo.y,s.cargo.z);}
      if(local)this.target.lerp(new T.Vector3(local.x+2.5,local.y+.4,local.z),Math.min(1,dt*(this.reduced?15:6)));
      const ids=new Set(s.players.map(p=>p.id));for(const [id,v]of this.crew)if(!ids.has(id)){this.scene.remove(v.root);disposeObject(v.root);this.crew.delete(id);}
      for(const p of s.players){
        if(!this.crew.has(p.id)){const v=pigeon(PALETTE[p.slot],p.slot);v.root.position.set(p.x,p.y,p.z);this.crew.set(p.id,v);this.scene.add(v.root);}
        const v=this.crew.get(p.id);v.root.visible=true;const position=new T.Vector3(p.x,p.y,p.z);if(v.root.position.distanceTo(position)>5)v.root.position.copy(position);else v.root.position.lerp(position,Math.min(1,dt*(p.id===localId?28:15)));
        v.root.traverse(o=>{if(o.isMesh)o.visible=p.connected||o===v.ring;});
        animatePigeon(v,p,s,dt,now,this.reduced);v.ring.scale.setScalar(p.id===localId?1:.8);
        if(p.ping?.until>t){
          if(v.pingText!==p.ping.text){v.root.remove(v.ping);disposeObject(v.ping);v.ping=label(p.ping.text,'#153b4c',PALETTE[p.slot],.7);v.ping.position.y=2.8;v.root.add(v.ping);v.pingText=p.ping.text;}v.ping.visible=true;
        }else v.ping.visible=false;
      }
      const order=orderFor(s);
      const goalText=trial?'Finish · 3 stamps'+(s.cargo?' + parcel':''):'Deliver here · E';if(goalText!==this.goalText){this.goal.remove(this.goalLabel);disposeObject(this.goalLabel);this.goalLabel=label(goalText);this.goalLabel.position.set(0,2.5,0);this.goal.add(this.goalLabel);this.goalText=goalText;}
      this.goal.visible=s.phase==='playing';this.goal.position.set(order.to.x,order.to.y+.15,order.to.z);
      this.trail.visible=this.aimMarker.visible=this.aimLine.visible=false;if(this.cargo&&!s.cargo)this.cargo.visible=false;
      if(s.cargo){
        if(this.cargoKind!==order.cargo){if(this.cargo){this.scene.remove(this.cargo);disposeObject(this.cargo);}this.cargo=cargoModel(order.cargo);this.scene.add(this.cargo);this.cargoKind=order.cargo;this.cargo.position.set(s.cargo.x,s.cargo.y,s.cargo.z);}
        this.cargo.visible=s.phase==='playing';this.cargo.position.lerp(new T.Vector3(s.cargo.x,s.cargo.y,s.cargo.z),Math.min(1,dt*22));this.cargo.rotation.set(0,-s.cargo.a,s.cargo.pitch??0,'YXZ');
        this.carryLines.visible=false;
        this.trail.visible=local?.grip!==null&&local?.grip!==undefined;
        this.aimMarker.visible=this.aimLine.visible=this.trail.visible;
        if(this.trail.visible){const preview=predictThrow(s,local);this.preview=preview;const pts=preview.points;this.trail.children.forEach((d,i)=>{d.visible=i<pts.length;if(pts[i])d.position.set(pts[i].x,pts[i].y,pts[i].z);});const landing=preview.hit==='alley'?(pts.filter(q=>q.y>=local.y+.2).at(-1)??pts[0]):preview.landing;this.aimMarker.position.set(landing.x,preview.hit==='alley'?local.y+.14:landing.y-.32,landing.z);const status=preview.hit==='roof'?'Landing preview':preview.hit==='wall'?'Blocked':'Alley · shorten throw';if(status!==this.lastAimStatus){this.aimMarker.remove(this.aimStatus);disposeObject(this.aimStatus);this.aimStatus=label(status,'#153b4c',preview.hit==='roof'?'#fff2be':'#efb99d',.45);this.aimStatus.position.y=.65;this.aimMarker.add(this.aimStatus);this.lastAimStatus=status;}this.aimMarker.children[0].material.color.set(preview.hit==='roof'?'#fff0af':'#ea9473');this.aimLine.geometry.dispose();this.aimLine.geometry=new T.BufferGeometry().setFromPoints(pts.map(p=>new T.Vector3(p.x,p.y,p.z)));this.aimLine.computeLineDistances();}

      }
    }
    this.camera.position.copy(this.target).add(new T.Vector3(10,17,21));this.camera.lookAt(this.target);
    this.sun.position.set(this.target.x-15,this.target.y+35,this.target.z+15);this.sun.target.position.set(this.target.x,0,this.target.z);
    this.renderer.render(this.scene,this.camera);
  }
}
