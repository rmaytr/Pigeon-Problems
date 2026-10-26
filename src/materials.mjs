import * as T from 'three';
export const materialCache=new Map();
const brick=new Set(['#d28e78','#9bb78d','#e8b471','#a4b6c4','#d9a093','#8eb9ab','#d1a58d','#a0bab5','#d8bc91','#a5b5bd','#cd866f','#bd8572','#b89a85','#8eaba3']);
const tile=new Set(['#d8cbb2','#bbca9e','#dfc299','#b8bfbd','#d5b5a1','#bcd2c3']);
const wood=new Set(['#cfac7d','#bd9168','#eac969','#d8b67d','#bc956a','#bd8167']);
const cloth=new Set(['#fff3be','#fff3d5','#d36f65','#f2c8b3','#fff1cc','#85a7b3','#e9b7c3']);
const metal=new Set(['#647e85','#526a76','#445c67','#82989a']);
export const mat=(color,role=brick.has(color)?'brick':tile.has(color)?'tile':wood.has(color)?'wood':cloth.has(color)?'cloth':metal.has(color)?'metal':'paint')=>{
  const key=color+role;if(materialCache.has(key))return materialCache.get(key);
  const detailed=['brick','tile','wood','cloth','plaster','slate','pavement','metal'].includes(role);let texture=null,bump=null;
  if(detailed){
    const canvas=document.createElement('canvas'),height=document.createElement('canvas');canvas.width=canvas.height=height.width=height.height=512;
    const c=canvas.getContext('2d'),h=height.getContext('2d');c.fillStyle=color;c.fillRect(0,0,512,512);h.fillStyle='#888';h.fillRect(0,0,512,512);
    let seed=731;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    if(role==='brick'){
      for(let row=0;row<24;row++)for(let col=-1;col<13;col++){
        const x=col*43+(row%2)*21.5,y=row*21.4,v=random();
        c.fillStyle=v>.6?'rgba(255,238,211,.09)':v<.3?'rgba(62,59,52,.065)':'rgba(255,255,245,.015)';c.fillRect(x+1.8,y+1.4,40.4,18.7);
        c.fillStyle='rgba(238,233,211,.28)';c.fillRect(x,y,43,1.5);c.fillRect(x,y,1.5,21.4);
        c.fillStyle='rgba(44,61,63,.10)';c.fillRect(x+2,y+2,39,1);c.fillRect(x+1.6,y+2,1,18);
        h.fillStyle='#505050';h.fillRect(x,y,43,1.8);h.fillRect(x,y,1.8,21.4);h.fillStyle='#a2a2a2';h.fillRect(x+3,y+3,38,16);
      }
    }else if(role==='tile'||role==='pavement'||role==='slate'){
      const rows=role==='slate'?18:12,unit=512/rows;
      for(let row=0;row<rows;row++)for(let col=-1;col<=rows;col++){
        const x=col*unit+(row%2)*unit/2,y=row*unit,v=random();
        c.fillStyle=v>.6?'rgba(255,253,237,.08)':'rgba(48,64,64,.025)';c.fillRect(x+1.2,y+1.2,unit-2.4,unit-2.4);
        c.strokeStyle='rgba(42,58,59,.16)';c.lineWidth=1;c.strokeRect(x+.5,y+.5,unit-1,unit-1);c.fillStyle='rgba(255,255,244,.19)';c.fillRect(x+1.4,y+1.4,unit-2.8,.9);
        h.fillStyle='#555';h.fillRect(x,y,unit,1.4);h.fillRect(x,y,1.4,unit);
      }
    }else if(role==='wood'){
      for(let row=0;row<8;row++){const y=row*64;c.fillStyle='rgba(42,47,40,.18)';c.fillRect(0,y,512,2);h.fillStyle='#555';h.fillRect(0,y,512,3);for(let j=0;j<8;j++){c.strokeStyle='rgba(67,48,35,.075)';c.beginPath();c.moveTo(0,y+6+j*7);c.bezierCurveTo(180,y+j*8,310,y+7+j*6,512,y+6+j*7);c.stroke();}}
    }else if(role==='cloth'){
      c.strokeStyle='rgba(255,255,246,.07)';c.lineWidth=1;for(let i=0;i<512;i+=4){c.beginPath();c.moveTo(i,0);c.lineTo(i,512);c.moveTo(0,i);c.lineTo(512,i);c.stroke();}
    }else if(role==='metal'){
      for(let i=0;i<8;i++){const x=i*64;c.fillStyle='rgba(28,49,55,.15)';c.fillRect(x,0,1.2,512);c.fillStyle='rgba(237,252,242,.18)';c.fillRect(x+2,0,1,512);h.fillStyle='#555';h.fillRect(x,0,2,512);}
    }else{
      for(let i=0;i<65;i++){const x=random()*512,y=random()*512,r=25+random()*70,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(246,238,211,.025)');g.addColorStop(1,'rgba(246,238,211,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
    }
    texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=8;
    if(!['cloth','plaster'].includes(role)){bump=new T.CanvasTexture(height);bump.wrapS=bump.wrapT=T.RepeatWrapping;bump.anisotropy=4;}
  }
  const m=new T.MeshStandardMaterial({map:texture,bumpMap:bump,bumpScale:role==='brick'?.055:role==='wood'?.025:.018,color:texture?'#ffffff':color,roughness:role==='metal'?.48:role==='cloth'?.95:.82,metalness:role==='metal'?.42:0,flatShading:false,side:role==='cloth'?T.DoubleSide:T.FrontSide});m.userData.role=role;materialCache.set(key,m);return m;
};
export function disposeObject(root){
  const shared=new Set(materialCache.values());
  root.traverse(o=>{o.geometry?.dispose();if(o.material&&!shared.has(o.material)&&!o.material.userData.persistent){for(const prop of ['map','bumpMap','roughnessMap'])o.material[prop]?.dispose();o.material.dispose();}});
}
export const inkMaterial=new T.LineBasicMaterial({color:'#486266',transparent:true,opacity:.12});
export function inkEdges(parent,geometry,position){const line=new T.LineSegments(new T.EdgesGeometry(geometry,25),inkMaterial);line.position.copy(position);parent.add(line);return line;}
