import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Longitudinal contours give the torso and wing covers a continuous silhouette.
export function contour(profiles,{sides=28,steps=32,top='#7e8d9b',bottom='#a7b0b7'}={}){
  const curves=[0,1,2,3].map(k=>new T.SplineCurve(profiles.map((p,i)=>new T.Vector2(i/(profiles.length-1),p[k]))));
  const positions=[],colors=[],uv=[],indices=[],a=new T.Color(top),b=new T.Color(bottom);
  for(let i=0;i<=steps;i++){
    const u=i/steps,[x,y,ry,rz]=curves.map(c=>c.getPoint(u).y);
    for(let j=0;j<=sides;j++){
      const v=j/sides,theta=v*Math.PI*2,s=Math.sin(theta);positions.push(x,y+s*Math.max(.002,ry),Math.cos(theta)*Math.max(.002,rz));
      const color=a.clone().lerp(b,T.MathUtils.smoothstep(-s,-.15,.95)*.8);colors.push(color.r,color.g,color.b);uv.push(u,v);
      if(i<steps&&j<sides){const k=i*(sides+1)+j;indices.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);}
    }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();smoothSeam(g,steps,sides);return g;
}
function smoothSeam(g,rows,sides){const normal=g.attributes.normal;for(let i=0;i<=rows;i++){const a=i*(sides+1),b=a+sides,n=new T.Vector3().fromBufferAttribute(normal,a).add(new T.Vector3().fromBufferAttribute(normal,b)).normalize();normal.setXYZ(a,n.x,n.y,n.z);normal.setXYZ(b,n.x,n.y,n.z);}}
export const softBox=(w,h,d,r=.04)=>Math.min(w,h,d)<.13?new T.BoxGeometry(w,h,d):new RoundedBoxGeometry(w,h,d,1,Math.min(r,w/4,h/4,d/4));
export function tube(points,r=.025,segments=16){return new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),segments,r,6,false);}

// Lenticular cross section, tapered asymmetric vanes and a pointed tip.
export function feather(length,width,bend=.04){
  const p=[],uv=[],ix=[],rows=12,sides=8;
  for(let i=0;i<=rows;i++){
    const t=i/rows,span=Math.max(.001,Math.pow(Math.sin(Math.PI*Math.pow(t,.72)),.65)*width/2),curve=Math.sin(t*Math.PI)*bend;
    for(let j=0;j<=sides;j++){
      const a=j/sides*Math.PI*2;p.push(-t*length,Math.sin(a)*span*.17+curve,Math.cos(a)*span*(Math.cos(a)>0?1:.82));uv.push(t,j/sides);
      if(i<rows&&j<sides){const k=i*(sides+1)+j;ix.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1);}
    }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();smoothSeam(g,rows,sides);return g;
}
export function wingSurface(side){
  const shape=new T.Shape();shape.moveTo(.16,0);shape.bezierCurveTo(.3,.28,.18,.65,-.08,.93);shape.bezierCurveTo(-.22,1.12,-.56,1.04,-.75,.8);shape.bezierCurveTo(-.91,.53,-.6,.11,-.42,0);shape.closePath();
  const g=new T.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:2,steps:1,curveSegments:16});g.rotateX(side*Math.PI/2);g.translate(0,0,side*.04);const p=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)+.9)/1.2,Math.abs(p.getZ(i))/1.2);return g;
}
