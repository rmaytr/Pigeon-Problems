import * as T from 'three';
import {ROOFS} from './world.mjs';
import {mat} from './materials.mjs';
import {softBox,tube,feather} from './art-geometry.mjs';

function mesh(parent,geometry,color,x=0,y=0,z=0,role){const m=new T.Mesh(geometry,mat(color,role));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
const box=(p,x,y,z,w,h,d,c,role,r=.035)=>mesh(p,softBox(w,h,d,r),c,x,y,z,role);
const cylinder=(p,x,y,z,r,h,c)=>mesh(p,new T.CylinderGeometry(r,r,h,12),c,x,y,z);
const sphere=(p,x,y,z,rx,ry,rz,c)=>{const m=mesh(p,new T.IcosahedronGeometry(1,2),c,x,y,z);m.scale.set(rx,ry,rz);return m;};
const pipe=(p,pts,r=.035,c='#647e85')=>mesh(p,tube(pts,r,18),c);
const cream='#dddbca',iron='#445c67',glass='#526f7d';
function plaque(parent,text,x,y,z,w=1.7,color='#355b65'){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle=color;c.fillRect(0,0,512,128);c.strokeStyle='#ded7b9';c.lineWidth=4;c.strokeRect(9,9,494,110);c.font='600 45px Georgia';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#f1edd9';c.fillText(text,256,65,460);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(w,w/4),new T.MeshStandardMaterial({map,roughness:.85}));m.position.set(x,y,z);parent.add(m);return m;
}
function painting(parent,x,y,z,index){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=384;const c=canvas.getContext('2d');
  c.fillStyle=['#e3c17d','#8fb0ab','#d3a09e'][index];c.fillRect(0,0,256,384);c.fillStyle=['#547b7e','#e3c794','#5f7c8c'][index];c.beginPath();c.moveTo(0,260);c.bezierCurveTo(70,100,110,350,256,180);c.lineTo(256,384);c.lineTo(0,384);c.fill();c.fillStyle='#eee3bb';c.beginPath();c.arc(175,90,35,0,Math.PI*2);c.fill();c.strokeStyle='#547571';c.lineWidth=8;c.beginPath();c.moveTo(55,320);c.bezierCurveTo(155,240,20,150,115,65);c.stroke();
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(.76,1.24),new T.MeshStandardMaterial({map,roughness:1}));m.position.set(x,y,z);m.rotation.y=.2+index*.3;parent.add(m);
}
function windowBay(parent,x,y,z,w=1.05,h=1.5,variant=0,side=0){
  const g=new T.Group();g.position.set(x,y,z);g.rotation.y=side;parent.add(g);
  box(g,0,0,0,w+.2,h+.2,.12,'#7b8986','paint',.012);
  box(g,0,0,.068,w,h,.035,'#304d5a','paint',.005);
  box(g,0,0,.09,w-.13,h-.13,.022,variant%4===0?'#7b9699':glass,'paint',.004);
  if(variant%3===0){box(g,-w*.28,0,.11,w*.2,h-.15,.012,'#c6c8b7','cloth',.003);box(g,w*.3,0,.11,w*.15,h-.15,.012,'#a9b8ac','cloth',.003);}
  for(const sx of [-1,1])box(g,sx*w/2,0,.15,.065,h+.1,.08,cream,'paint',.008);
  for(const sy of [-1,1])box(g,0,sy*h/2,.15,w+.12,.065,.08,cream,'paint',.008);
  box(g,0,0,.16,.042,h,.035,'#c6cebf','paint',.004);box(g,0,h*.05,.16,w,.045,.035,'#c6cebf','paint',.004);
  box(g,0,-h/2-.075,.12,w+.33,.11,.36,'#e1dbbf','paint',.016);
  box(g,0,h/2+.12,.05,w+.33,.11,.2,'#c9c9b6','paint',.014);
  if(variant%5===1){
    for(const side of [-1,1]){const shutter=box(g,side*(w/2+.2),0,.12,.28,h,.065,'#64887d','wood',.01);shutter.rotation.y=side*.16;for(let j=0;j<6;j++)box(g,side*(w/2+.2),-h*.38+j*h*.15,.17,.22,.028,.025,'#92a594','paint',.004);}
  }
  if(variant%7===2){
    box(g,0,-h/2-.14,.32,w+.5,.13,.65,'#a9b2aa','paint',.018);
    for(let i=0;i<7;i++)cylinder(g,-w*.55+i*w*1.1/6,-h*.26,.6,.017,h*.48,iron);
    box(g,0,-h*.04,.6,w+.35,.04,.04,iron,'paint',.008);box(g,0,-h*.47,.6,w+.35,.03,.03,iron,'paint',.005);
  }
}
function downpipe(parent,x,top,bottom,z){
  pipe(parent,[[x,top,z-.15],[x+.14,top-.2,z],[x+.14,bottom+.6,z],[x+.27,bottom+.4,z]],.045);
  for(let y=bottom+.8;y<top-.3;y+=1.8)box(parent,x+.14,y,z,.17,.065,.12,'#82989a','metal',.009);
}
function chimney(parent,x,y,z){
  box(parent,x,y+.62,z,.72,1.24,.74,'#bd8572','brick');box(parent,x,y+1.26,z,.91,.14,.9,cream);
  for(const dx of [-.2,.2]){cylinder(parent,x+dx,y+1.5,z,.12,.38,'#9b7762');cylinder(parent,x+dx,y+1.71,z,.15,.065,'#c7ac8c');}
}
function roof(parent,x,y,z,w,d,kind=0){
  const sh=new T.Shape(),half=d/2+.16;
  if(kind===1){sh.moveTo(-half,0);sh.lineTo(-half+.95,1.65);sh.lineTo(half-.95,1.65);sh.lineTo(half,0);}
  else{sh.moveTo(-half,0);sh.lineTo(0,1.85);sh.lineTo(half,0);}sh.closePath();
  const g=new T.ExtrudeGeometry(sh,{depth:w+.25,bevelEnabled:false,steps:1});g.rotateY(Math.PI/2);g.translate(-(w+.25)/2,0,0);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*.16,uv.getY(i)*.16);mesh(parent,g,kind===1?'#647e85':'#687b88',x,y,z,kind===1?'metal':'slate');
  box(parent,x,y-.05,z+half,w+.5,.16,.18,'#899b9a','metal');box(parent,x,y-.05,z-half,w+.5,.16,.18,'#899b9a','metal');
  if(kind!==1)box(parent,x,y+1.88,z,w+.4,.08,.1,'#8f9d9b','metal');
  else{
    for(const dx of [-w*.26,w*.26]){
      box(parent,x+dx,y+.73,z+half-.31,1.03,1.23,.58,'#d6d7c8','plaster');
      windowBay(parent,x+dx,y+.79,z+half+.01,.64,.86,3);
      box(parent,x+dx,y+1.39,z+half-.31,1.19,.1,.77,'#647e85','metal');
    }
  }
  chimney(parent,x-w*.28,y+.9,z-.8);
}
function tree(parent,x,y,z,scale=1){
  const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(scale);parent.add(g);
  pipe(g,[[0,0,0],[.02,1.1,.03],[-.09,2,0],[.04,2.6,0]],.085,'#7c7963');
  pipe(g,[[-.02,1.45,0],[-.48,2.2,.14],[-.59,2.6,.18]],.04,'#7c7963');
  pipe(g,[[0,1.75,0],[.48,2.4,-.1]],.045,'#7c7963');
  for(const [dx,dy,dz,rx,ry,rz,c]of [[0,2.9,0,.73,1.0,.7,'#77947c'],[-.55,2.53,.1,.6,.76,.62,'#698974'],[.52,2.6,-.1,.6,.75,.59,'#85a080'],[-.18,3.5,.03,.52,.63,.54,'#88a386']])sphere(g,dx,dy,dz,rx,ry,rz,c);
}
function streetlamp(parent,x,z){
  const y=-8.8;cylinder(parent,x,y+.08,z,.18,.16,iron);cylinder(parent,x,y+1.55,z,.046,3.1,iron);
  pipe(parent,[[x,y+2.9,z],[x,y+3.25,z],[x+.3,y+3.4,z],[x+.62,y+3.2,z]],.038,iron);
  box(parent,x+.62,y+3.1,z,.35,.08,.35,iron);box(parent,x+.62,y+2.91,z,.24,.34,.24,'#e8d9ae','paint');box(parent,x+.62,y+2.73,z,.34,.05,.34,iron);
}
function awning(parent,x,y,z,w,color){
  const g=new T.Group();g.position.set(x,y,z);g.rotation.x=.14;parent.add(g);
  for(let j=0;j<8;j++)box(g,-w/2+(j+.5)*w/8,0,.45,w/8,.06,1,color&&j%2===0?color:'#e1deca','cloth',.018);
  for(let j=0;j<8;j++)box(g,-w/2+(j+.5)*w/8,-.11,.94,w/8,.22,.06,color&&j%2===0?color:'#e1deca','cloth',.025);
}
function shop(parent,x,y,z,w,index){
  box(parent,x,y+1.2,z,w,2.4,.16,['#527b7b','#a57868','#77897b'][index%3],'paint');
  for(const dx of [-w*.28,w*.28])windowBay(parent,x+dx,y+1.18,z+.1,w*.32,1.8,index+3);
  awning(parent,x,y+2.57,z+.1,w+.24,['#698f83','#b98772','#7a8d9b'][index%3]);
  plaque(parent,['Daily bread','Flowers & stems','The corner shop','Cycles & repairs','Paper & things'][index%5],x,y+2.97,z+.23,w*.8);
}
function townhouse(parent,x,z,w,d,top,index,far=false){
  const height=top+9,palette=['#b89a85','#bd8572','#8eaba3','#c1b19a','#a8b9b2','#b6a4a1'],color=palette[index%palette.length];
  box(parent,x,-9+height/2,z,w,height,d,color,index%3===1?'brick':'plaster',.045);
  box(parent,x,top-.15,z,w+.24,.22,d+.26,cream);
  for(const offset of [-w/2+.1,w/2-.1])box(parent,x+offset,top-height/2,z+d/2+.04,.17,height-.3,.12,'#cfccba','plaster');
  if(!far){
    const floors=Math.max(2,Math.floor((height-1.7)/2.35));
    for(let row=0;row<floors;row++)for(let col=0;col<2;col++)windowBay(parent,x+(col-.5)*w*.44,top-1.25-row*2.25,z+d/2+.04,.88,1.28,index+col+row*2);
    downpipe(parent,x+w/2-.12,top,-8.8,z+d/2+.2);
    if(index%3===0)shop(parent,x,-8.8,z+d/2+.07,w*.85,index);
  }else{
    for(let row=0;row<3;row++)for(let col=0;col<2;col++)box(parent,x+(col-.5)*w*.44,top-1.2-row*2.2,z+d/2+.025,.75,1.18,.05,'#6e8b94','paint',.006);
  }
  roof(parent,x,top+.02,z,w,d,index%3===0?1:0);
}
export function planter(parent,s){
  const {x,y,z,w,h,d}=s;
  box(parent,x,y+h/2,z,w,h,d,'#ad8068','wood');
  for(const dz of [-d/2,d/2]){box(parent,x,y+h,z+dz,w+.1,.09,.11,'#c19c79','wood');for(let j=0;j<3;j++)box(parent,x,y+.12+j*(h-.12)/3,z+dz,w,.018,.035,'#785f50','paint',.002);}
  for(const dx of [-w/2,w/2])box(parent,x+dx,y+h,z,.11,.09,d+.1,'#c19c79','wood');
  box(parent,x,y+h-.03,z,w-.14,.07,d-.15,'#655e4b','paint',.005);
  for(let j=0;j<Math.max(3,Math.round(w/.4));j++){
    const px=x-w*.34+j*w*.68/(Math.round(w/.4)-1),py=y+h;
    cylinder(parent,px,py+.22,z,.022,.45,'#5c7e61');
    for(let k=0;k<5;k++){const angle=k*Math.PI*.8+j,leaf=mesh(parent,feather(.34,.16,.055),k%2?'#668a68':'#7a9d74',px,py+.23+k*.035,z);leaf.rotation.set(Math.sin(angle)*.8,angle,.45+Math.cos(angle)*.35);}
  }
}
export function decorateCity(root,{includeBackdrop=true}={}){
  for(let i=0;i<ROOFS.length;i++){
    const r=ROOFS[i],front=r.d/2,bottom=-8.85,height=r.y-bottom;
    // Recessed facade bays, continuous sill courses and two visible elevations.
    for(let y=r.y-1.35,row=0;y>-8.1;y-=2.3,row++){
      box(root,r.x,y-1.02,front+.06,r.w+.04,.095,.17,'#c8c9b6');
      for(let col=0;col<4;col++)windowBay(root,r.x+(col-1.5)*2.25,y,front+.06,1.03,1.43,i*3+col+row*2);
      for(let col=0;col<4;col++)windowBay(root,r.x+r.w/2+.05,y,-3.9+col*2.5,.95,1.43,i+col+row,Math.PI/2);
    }
    for(const dx of [-r.w/2+.13,0,r.w/2-.13])box(root,r.x+dx,bottom+height/2,front+.04,.2,height,.15,'#d0c9b2','plaster');
    for(const z of [-r.d/2,r.d/2]){
      box(root,r.x,r.y-.34,z,r.w+.27,.14,.32,'#b3b4a5');box(root,r.x,r.y-.12,z,r.w+.4,.16,.42,cream);
      box(root,r.x,r.y+.27,z,r.w+.15,.12,.35,'#dcd7c1');
    }
    downpipe(root,r.x+r.w/2-.3,r.y,-8.8,front+.33);
    box(root,r.x,r.y-7.35,front+.1,r.w,.35,.22,'#a5b2a8','plaster');
    shop(root,r.x,-8.75,front+.07,5.8,i);
    if(i%2===0){
      const tx=r.x+3.5,tz=-4.8;for(const dx of [-.36,.36])for(const dz of [-.3,.3])box(root,tx+dx,r.y+.5,tz+dz,.06,1,.06,iron);
      mesh(root,new T.CylinderGeometry(.55,.55,.9,24),'#a68d6e',tx,r.y+1.25,tz,'wood');
      for(const h of [.83,1.08,1.5,1.7]){const hoop=mesh(root,new T.TorusGeometry(.56,.025,6,32),iron,tx,r.y+h,tz);hoop.rotation.x=Math.PI/2;}
      mesh(root,new T.ConeGeometry(.66,.3,24),'#647e85',tx,r.y+1.87,tz,'metal');
      pipe(root,[[tx-.56,r.y+1.5,tz],[tx-.7,r.y+1.5,tz],[tx-.7,r.y+.15,tz]],.035,iron);
    }else{
      pipe(root,[[r.x+3.4,r.y,-5],[r.x+3.4,r.y+2.1,-5]],.025,iron);
      for(let k=-2;k<=2;k++)box(root,r.x+3.4+k*.24,r.y+1.75,-5,.035,.035,.9,iron);
      box(root,r.x+3.4,r.y+1.75,-5,1.3,.035,.035,iron);
    }
    if(i===0){plaque(root,'PIGEON POST',r.x-1.8,r.y+1.2,-1.84,1.7);box(root,r.x-2.0,r.y+.1,-1.82,2.4,.08,.28,'#b1bba8');for(const dx of [-3.4,-.6])box(root,dx,.98,-1.86,.075,1.8,.08,'#9cb2a5');box(root,-2,.5,-1.83,2.8,.09,.12,'#9cb2a5');box(root,-2,2.01,-3,3.25,.08,2.4,'#647e85','metal');}
    if(i===1){
      // Greenhouse at the back corner, outside the traversable center.
      const g=new T.Group();g.position.set(r.x-3.2,r.y,-5.25);root.add(g);
      for(const dx of [-.6,.6])for(const dz of [-.4,.4])box(g,dx,.7,dz,.045,1.4,.045,'#d4d5c3');
      for(const dy of [.1,.75,1.4])box(g,0,dy,.4,1.3,.04,.04,'#d4d5c3');
      box(g,0,.75,.38,1.2,1.2,.025,'#8aa9a5','paint');
      pipe(g,[[-.65,1.4,.4],[0,1.85,.4],[.65,1.4,.4]],.035,'#d4d5c3');
      box(g,0,1.58,0,1.25,.035,.9,'#9bb8af','paint');
    }
    if(i===2){
      for(const x of [22.9,25.1])windowBay(root,x,3.3,-2.37,.92,1.65,3);
      box(root,24,2.47,-2.23,3.7,.1,.3,'#ad8e69','wood');plaque(root,'Crumb & Co.',24,4.65,-2.28,2.15,'#826351');
      box(root,24,5.12,-3.4,4.4,.12,2.4,'#d8c6a2');
      for(let k=0;k<3;k++)box(root,22.4+k*.4,2.05,-1.7,.26,.1,.1,'#b9a580');
    }
    if(i===4){for(let k=0;k<3;k++){pipe(root,[[45.9+k*1.5,4,-3.15],[46.25+k*1.5,5.8,-3.15],[46.65+k*1.5,4,-3.15]],.032,'#9b8768');painting(root,46+k*1.5,5,-2.92,k);}}
    if(i===5){
      for(const dx of [-2.7,2.7])tree(root,r.x+dx,r.y,-4.5,.57);
      for(let k=0;k<4;k++)windowBay(root,59.3+k*1.1,7.8,-1.21,.67,1.55,k+3);
      for(const x of [58.58,63.42])box(root,x,7.7,-1.22,.15,3.1,.16,'#d3d5c0');
      box(root,61,6.17,-1.2,5,.16,.28,'#bac3b7');box(root,61,9.22,-1.18,5.35,.15,.26,cream);box(root,61,9.62,-2.8,5.5,.06,3.5,'#647e85','metal');
      const rooflight=box(root,61,9.85,-2.7,1.7,.4,1.1,'#829da1','metal');box(root,61,10.07,-2.7,1.55,.04,.95,'#9ab4b1');
    }
  }

  if(includeBackdrop)decorateBackdrop(root);
}
export function decorateBackdrop(root){
  // Streets and courts explain the height of the rooftops instead of a blue void.
  box(root,30,-9.08,0,210,.16,125,'#879991','paint',.005);
  box(root,30,-8.98,11.7,180,.08,6.4,'#73878a','paint',.005);
  box(root,30,-8.9,7.65,180,.2,2.7,'#bec3b2','pavement',.01);
  box(root,30,-8.9,16.7,180,.2,3.6,'#bcc3b4','pavement',.01);
  for(const z of [9.04,14.96])box(root,30,-8.8,z,180,.16,.18,'#cdd0bc','paint',.008);
  for(let x=-50;x<125;x+=4.2)box(root,x,-8.929,11.7,1.4,.012,.075,'#bfc5b5','paint',.002);
  for(let x=-12;x<90;x+=12){
    streetlamp(root,x,8.4);box(root,x+4,-8.77,16.6,1.45,.18,1.4,'#9ba99b','pavement');tree(root,x+4,-8.68,16.6,.83);
    for(let j=0;j<3;j++)box(root,x+7+j*.16,-8.77,8.5,.045,.025,.65,iron);
  }
  // An irregular street wall, then a quieter second layer with receding contrast.
  for(let i=0;i<17;i++){
    const x=-15+i*6.1,w=5.15+(i%3)*.22,d=6.4+(i%2)*1.1,top=.2+(i*7%5)*.72;
    townhouse(root,x,-17.8-(i%3)*.6,w,d,top,i);
    if(i%2===0)townhouse(root,x+1.4,-35,6.1,7.5,3+(i*3%7),i+3,true);
    if(i<14)townhouse(root,x+2,23,5.2,6.5,-4.8+(i%3)*.45,i+1,true);
  }
  townhouse(root,-10.8,-1.4,5.4,8,-1.65,4);townhouse(root,74,-1,6.2,9,3.6,1);
  // Courtyard trees and a small planted square behind the first row.
  box(root,20,-8.88,-28,23,.2,6,'#92aa8c','paint');for(let j=0;j<8;j++)tree(root,10+j*3,-8.75,-28+(j%2)*1.2,1.1);
  // A distant clock tower gives the neighborhood a recognizable skyline.
  box(root,42,1.6,-36,3.4,21,3.4,'#bcc0ad','plaster');box(root,42,12.25,-36,3.7,.3,3.7,cream);
  mesh(root,new T.ConeGeometry(2.7,4.4,4),'#647e85',42,14.6,-36,'metal').rotation.y=Math.PI/4;
  const clock=mesh(root,new T.CircleGeometry(.83,40),'#dedbc1',42,10.6,-34.27);pipe(root,[[42,10.6,-34.24],[42,11.18,-34.24]],.032,iron);pipe(root,[[42,10.6,-34.24],[42.45,10.36,-34.24]],.03,iron);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;box(root,42+Math.sin(a)*.69,10.6+Math.cos(a)*.69,-34.235,.045,.08,.012,iron,'paint',.002);}
}
export function skyTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d'),g=c.createLinearGradient(0,0,0,512);g.addColorStop(0,'#94b7c7');g.addColorStop(.62,'#c7d8d7');g.addColorStop(1,'#e0e3d8');c.fillStyle=g;c.fillRect(0,0,512,512);
  const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;return t;
}
