import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {mat,materialCache} from './materials.mjs';
import {contour,feather,tube,softBox,wingSurface} from './art-geometry.mjs';

function surface(name,options){const key='pigeon:'+name;if(!materialCache.has(key))materialCache.set(key,new T.MeshPhysicalMaterial(options));return materialCache.get(key);}
const plumage=()=>surface('plumage',{color:'#ffffff',vertexColors:true,roughness:.78});
const neckPaint=()=>surface('neck',{color:'#ffffff',vertexColors:true,metalness:.08,roughness:.46,iridescence:.8,iridescenceIOR:1.36,iridescenceThicknessRange:[160,360]});
function wingPaint(){
  const key='pigeon:wing';if(materialCache.has(key))return materialCache.get(key);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#ffffff';c.fillRect(0,0,256,256);
  for(const u of [.48,.68]){c.fillStyle='#65717e';c.beginPath();for(let y=0;y<=256;y+=4){const x=(u+.013*Math.sin(y/256*Math.PI*2))*256;y?c.lineTo(x,y):c.moveTo(x,y);}for(let y=256;y>=0;y-=4)c.lineTo((u+.062+.013*Math.sin(y/256*Math.PI*2))*256,y);c.closePath();c.fill();}
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;const m=new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,map,roughness:.78});materialCache.set(key,m);return m;
}
function shape(parent,geometry,color,x=0,y=0,z=0,material=null){
  const m=new T.Mesh(geometry,material??mat(color));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;
}
const ellipsoid=(p,x,y,z,rx,ry,rz,c)=>{const m=shape(p,new T.SphereGeometry(1,28,18),c,x,y,z);m.scale.set(rx,ry,rz);return m;};
const box=(p,x,y,z,w,h,d,c,r=.02)=>shape(p,softBox(w,h,d,r),c,x,y,z);
function bakeParts(group){
  const batches=new Map();
  for(const child of [...group.children])if(child.isMesh&&!child.userData.articulated){
    child.updateMatrix();const g=(child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone()).applyMatrix4(child.matrix);let material=child.material;
    // Paint colors share a draw inside each articulated joint; mapped feathers
    // and the iridescent neck retain their own physically shaded materials.
    if(!material.map&&!material.iridescence&&!material.metalness&&!material.transparent){
      const previous=material.vertexColors?g.getAttribute('color'):null,colors=[],base=material.color;
      for(let i=0;i<g.attributes.position.count;i++)colors.push(base.r*(previous?.getX(i)??1),base.g*(previous?.getY(i)??1),base.b*(previous?.getZ(i)??1));
      g.setAttribute('color',new T.Float32BufferAttribute(colors,3));material=plumage();
    }
    const list=batches.get(material)??[];list.push(g);batches.set(material,list);group.remove(child);child.geometry.dispose();
  }
  for(const [material,geometries]of batches){const g=mergeGeometries(geometries,false);if(g){const m=new T.Mesh(g,material);m.castShadow=m.receiveShadow=true;group.add(m);}for(const g of geometries)g.dispose();}
}
export function pigeon(color,slot,label){
  const root=new T.Group(),body=new T.Group();root.add(body);
  shape(body,contour([[-.77,.56,.005,.005],[-.63,.6,.15,.16],[-.4,.65,.31,.3],[-.13,.68,.4,.365],[.14,.7,.4,.34],[.35,.76,.3,.255],[.43,.86,.14,.17],[.4,.91,.005,.005]],{top:'#7d8c9d',bottom:'#b7bdc3'}),null,0,0,0,plumage());

  const neck=new T.Group();neck.position.set(.2,.91,0);body.add(neck);
  const neckCurve=new T.SplineCurve([[0,-.30],[.24,-.24],[.27,-.12],[.245,.0],[.196,.14],[.156,.24],[0,.26]].map(p=>new T.Vector2(...p)));
  const neckGeometry=new T.LatheGeometry(neckCurve.getPoints(36),32);
  const colors=[],pos=neckGeometry.attributes.position;
  for(let i=0;i<pos.count;i++){const height=pos.getY(i),z=pos.getZ(i),c=new T.Color('#577e79').lerp(new T.Color('#736785'),T.MathUtils.smoothstep(-z,-.18,.18));c.lerp(new T.Color('#8799a8'),T.MathUtils.smoothstep(height,.025,.22));pos.setX(i,pos.getX(i)+T.MathUtils.smoothstep(height,-.23,.24)*.09);colors.push(c.r,c.g,c.b);}neckGeometry.computeVertexNormals();
  neckGeometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));shape(neck,neckGeometry,null,0,0,0,neckPaint());

  const head=new T.Group();head.position.set(.13,.2,0);neck.add(head);
  shape(head,contour([[-.205,-.005,.005,.005],[-.14,.012,.18,.16],[0,.018,.21,.19],[.13,-.005,.16,.15],[.21,-.035,.065,.085],[.225,-.04,.005,.005]],{steps:30,top:'#8799a8',bottom:'#a2aeb7'}),null,0,0,0,plumage());
  // Tapered upper/lower mandibles share the simulation's exact beak-tip position.
  shape(head,contour([[.155,-.037,.005,.005],[.215,-.037,.034,.048],[.34,-.045,.024,.027],[.465,-.048,.002,.002]],{steps:18,sides:16}), '#4e5354');
  shape(head,contour([[.19,-.081,.002,.002],[.26,-.082,.015,.043],[.405,-.071,.009,.017],[.46,-.052,.001,.001]],{steps:16,sides:12}),'#777b78');
  ellipsoid(head,.217,-.005,0,.075,.032,.058,'#d7d7cc');
  for(const side of [-1,1]){
    ellipsoid(head,.251,-.008,side*.049,.014,.007,.005,'#53646b');
    ellipsoid(head,.092,.043,side*.178,.037,.04,.015,'#b98a49');
    ellipsoid(head,.104,.045,side*.19,.022,.027,.01,'#18252c');
    ellipsoid(head,.111,.059,side*.198,.006,.007,.004,'#f6f7ed');
    const lid=ellipsoid(head,.092,.043,side*.199,.041,.044,.012,'#899da9');lid.visible=false;lid.userData.articulated=true;
  }
  const eyes=head.children.filter(o=>o.userData.articulated);

  const wings=[];
  for(const side of [-1,1]){
    const shoulder=new T.Group();shoulder.position.set(.02,.78,side*.295);body.add(shoulder);
    const folded=new T.Group();shoulder.add(folded);
    shape(folded,contour([[-.88,-.13,.003,.003],[-.7,-.08,.085,.055],[-.41,.01,.21,.095],[-.08,.04,.245,.12],[.15,.03,.16,.075],[.21,.0,.003,.003]],{steps:30,sides:24,top:'#8c9daa',bottom:'#647b90'}),null,0,0,side*.018,wingPaint());
    for(let j=0;j<7;j++){
      const f=shape(folded,feather(.51+j*.022,.105,.012),j%2?'#546d82':'#607a90',-.17-j*.048,-.07-j*.016,side*(.09-j*.004));f.rotation.set(side*1.18,side*(.015+j*.018),-.03-j*.015);
    }
    const flight=new T.Group();shoulder.add(flight);const wing=shape(flight,wingSurface(side),null,0,0,0,surface('flight wing',{color:'#8c9daa',map:wingPaint().map,roughness:.78}));
    const tip=new T.Group();flight.add(tip);
    for(let j=0;j<10;j++){
      const f=shape(tip,feather(.66+Math.sin(j/10*Math.PI)*.25,.175,.025),j<3?'#5b7287':j%2?'#425a70':'#506a81',-.06-j*.061,.005,side*(.43+j*.045));
      f.rotation.y=side*(1.15-j*.058);
    }
    for(let j=0;j<6;j++){const f=shape(flight,feather(.24,.125,.012),'#899ba8',-.25-j*.025,.043,side*(.21+j*.093));f.rotation.y=side*.18;}
    bakeParts(folded);bakeParts(tip);bakeParts(flight);flight.visible=false;wings.push({shoulder,folded,flight,tip,sign:side,wing});
  }
  const tail=new T.Group();tail.position.set(-.61,.45,0);body.add(tail);
  for(let i=0;i<9;i++){
    const f=shape(tail,feather(.48,.115,.015),i%2?'#536b80':'#60778b',0,0,(i-4)*.047);f.rotation.y=(i-4)*.055;
    const band=shape(tail,feather(.11,.105,.002),'#304a61',-.33,-.002,(i-4)*.047);band.rotation.y=(i-4)*.055;
  }
  const feet=[];
  for(const side of [-1,1]){
    const foot=new T.Group();foot.position.set(.03,.22,side*.19);root.add(foot);
    shape(foot,tube([[0,.14,0],[-.026,-.04,0],[.015,-.15,0]],.023,10),'#b97871');
    for(let j=-1;j<=1;j++){
      shape(foot,tube([[.01,-.15,0],[.085,-.185,j*.031],[.19,-.19,j*.078],[.235,-.175,j*.095]],.016,10),'#ba8279');
      shape(foot,tube([[.22,-.177,j*.09],[.25,-.181,j*.103],[.26,-.194,j*.106]],.008,6),'#62666a');
    }
    shape(foot,tube([[.0,-.15,0],[-.07,-.18,side*.035],[-.12,-.185,side*.055]],.014,8),'#ba8279');
    shape(foot,new T.CylinderGeometry(.031,.031,.048,16),color,-.013,-.035,0);bakeParts(foot);feet.push(foot);
  }
  const bag=new T.Group();bag.position.set(-.25,.56,-.4);body.add(bag);
  box(bag,0,0,0,.22,.21,.07,color,.035);box(bag,.0,.08,-.025,.235,.08,.09,'#c7b58c',.025);box(bag,.03,.035,-.077,.035,.04,.012,'#b6a071',.006);
  shape(body,tube([[.12,.96,-.21],[-.02,1.02,0],[-.18,.92,.3]],.022,16),'#9d886a');
  bakeParts(body);bakeParts(head);bakeParts(neck);bakeParts(tail);bakeParts(bag);
  const shadow=new T.Mesh(new T.CircleGeometry(.57,32),new T.MeshBasicMaterial({color:'#203e4a',transparent:true,opacity:.18,depthWrite:false}));shadow.rotation.x=-Math.PI/2;root.add(shadow);
  const ring=new T.Mesh(new T.RingGeometry(.68,.713,48),new T.MeshBasicMaterial({color,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;root.add(ring);
  const number=label(String(slot+1),'#153b4c',color,.16);number.position.y=1.94;root.add(number);
  const wind=new T.Group();wind.visible=false;root.add(wind);for(let i=0;i<4;i++){const r=new T.Mesh(new T.TorusGeometry(.35+i*.17,.018,5,24),new T.MeshBasicMaterial({color:'#eafff5',transparent:true,opacity:.85}));r.rotation.y=Math.PI/2;r.position.set(1+i*.6,.8,0);wind.add(r);}
  const ping=label('Ready!');ping.position.y=2.8;ping.visible=false;root.add(ping);
  return {root,body,neck,head,eyes,wings,tail,feet,bag,shadow,ring,number,wind,ping,pingText:'',slot,gait:0,flight:slot*.7,air:0,lastGround:true,land:0,lastX:null,lastZ:null,plants:[null,null],stance:[false,false]};
}
