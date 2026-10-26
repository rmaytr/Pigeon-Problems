import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export function bakeStatic(root,{exclude=new Set(),freezeWorld=true}={}){
  root.updateMatrixWorld(true);const groups=new Map(),statics=[];
  const collect=node=>{if(exclude.has(node))return;if(node.isMesh)statics.push(node);for(const child of node.children)collect(child);};collect(root);
  for(const child of statics){
    const geo=(child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone()).applyMatrix4(child.matrixWorld),list=groups.get(child.material)??[];list.push(geo);groups.set(child.material,list);child.removeFromParent();child.geometry.dispose();
  }
  for(const [material,geos]of groups){const combined=mergeGeometries(geos,false);if(combined){const m=new T.Mesh(combined,material);m.castShadow=!material.transparent;m.receiveShadow=true;root.add(m);m.updateMatrixWorld(true);m.matrixAutoUpdate=false;m.matrixWorldAutoUpdate=!freezeWorld;}for(const g of geos)g.dispose();}
  const prune=node=>{for(const child of [...node.children]){if(exclude.has(child))continue;prune(child);if(child.isGroup&&!child.children.length)node.remove(child);}};prune(root);
}
