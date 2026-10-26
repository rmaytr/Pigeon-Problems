export const HEAD_LIMIT=65*Math.PI/180;
export const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function lookHeading(p,aim=p.aim){
  const body=Number.isFinite(p.a)?p.a:0;
  return body+Math.max(-HEAD_LIMIT,Math.min(HEAD_LIMIT,Number.isFinite(aim)?angleDelta(aim,body):0));
}
export function beakPoint(p){const a=lookHeading(p);return {x:p.x+Math.cos(p.a)*.33+Math.cos(a)*.465,y:p.y+1.065,z:p.z+Math.sin(p.a)*.33+Math.sin(a)*.465};}
