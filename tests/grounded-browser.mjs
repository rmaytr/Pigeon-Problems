import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const base=process.env.CLIENT_URL||'http://127.0.0.1:5173',checks=[],errors=[];
const b=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true,args:process.env.CI?['--enable-unsafe-swiftshader']:[]}),p=await b.newPage({viewport:{width:1440,height:900}});
p.on('pageerror',e=>errors.push(e.message));const diag=()=>p.evaluate(()=>window.pigeonDiagnostics());
const check=(name,value)=>{assert(value,name);checks.push(name);console.log('PASS '+name);};
async function walk(x,z){let held=[];for(let i=0;i<400;i++){const d=await diag(),q=d.players[0],dx=x-q.x,dz=z-q.z;if(Math.hypot(dx,dz)<.22){for(const k of held)await p.keyboard.up(k);await p.waitForTimeout(140);return;}const sx=dx*.903-dz*.43,sz=dx*.43+dz*.903,l=Math.max(.01,Math.hypot(sx,sz)),next=[];if(Math.abs(sx/l)>.4)next.push(sx>0?'d':'a');if(Math.abs(sz/l)>.4)next.push(sz>0?'s':'w');for(const k of held)if(!next.includes(k))await p.keyboard.up(k);for(const k of next)if(!held.includes(k))await p.keyboard.down(k);held=next;await p.waitForTimeout(55);}throw Error('Route stalled');}
try{
  await p.goto(base);await p.getByRole('button',{name:'Solo practice',exact:true}).click();await p.getByRole('button',{name:'Delivery practice',exact:true}).click();await p.waitForTimeout(650);
  const initial=await diag();for(const [x,y]of [[950,500],[400,500],[720,400],[600,550]]){await p.mouse.move(x,y);await p.waitForTimeout(130);const d=await diag();assert(Math.abs(d.animation.bodyYaw-initial.animation.bodyYaw)<1e-6);assert(Math.abs(d.animation.headYaw)<=65*Math.PI/180+.001);}
  check('mouse never rotates a stationary body',true);check('head remains within 65 degrees',true);
  await p.keyboard.down('Shift');await walk(.4,0);await p.keyboard.press('e');await p.waitForTimeout(260);await walk(.4,4.9);await walk(12,4.9);await walk(12,0);await p.keyboard.press('e');await p.waitForFunction(()=>window.pigeonDiagnostics().order===1);
  check('first delivery remains playable with new grips',true);
  const d=await diag(),c=d.cargo;await walk(c.x-Math.cos(c.a)*1.848,c.z-Math.sin(c.a)*1.848);await p.keyboard.press('e');await p.waitForTimeout(1000);const held=await diag();check('long cargo sags and drags in actual gameplay',Math.abs(held.cargo.pitch)>.1&&held.cargo.dragging);
  await p.screenshot({path:'evidence/grounded-drag.png'});
  if(process.env.RECORD){await p.evaluate(()=>{const stream=document.querySelector('canvas').captureStream(30);window.qaChunks=[];window.qaRecorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9'});window.qaRecorder.ondataavailable=e=>window.qaChunks.push(e.data);window.qaRecorder.start();});}
  await p.keyboard.down('d');await p.waitForFunction(()=>window.pigeonDiagnostics().animation.footPositions.some(q=>q.y>.23),{},{timeout:1200});const moving=await diag();await p.screenshot({path:'evidence/grounded-walk.png'});await p.keyboard.up('d');check('walking animates foot lift',moving.animation.footPositions.some(q=>q.y>.23));await p.waitForTimeout(350);await p.keyboard.up('Shift');
  await p.mouse.move(950,470);await p.waitForTimeout(450);await p.mouse.move(400,520);await p.waitForTimeout(450);
  await p.keyboard.down('Space');await p.waitForFunction(y=>{const d=window.pigeonDiagnostics();return d.players[0].y>1.5&&d.cargo.y>y;},held.cargo.y,{timeout:2000});const flight=await diag();await p.screenshot({path:'evidence/grounded-flight.png'});await p.keyboard.up('Space');check('flight lifts pigeon and constrained load',flight.players[0].y>1.5&&flight.cargo.y>held.cargo.y);await p.waitForTimeout(1600);
  if(process.env.RECORD){const bytes=await p.evaluate(()=>new Promise(r=>{window.qaRecorder.onstop=async()=>{const data=new Uint8Array(await new Blob(window.qaChunks).arrayBuffer());let s='';for(let i=0;i<data.length;i+=8192)s+=String.fromCharCode(...data.subarray(i,i+8192));r(btoa(s));};window.qaRecorder.stop();}));await writeFile('evidence/grounded-demo.webm',Buffer.from(bytes,'base64'));}
  await p.keyboard.press('e');await p.waitForTimeout(1800);const settled=await diag();check('dropped load settles on roof',settled.cargo.ground&&Math.abs(settled.cargo.pitch)<.02);
  check('no uncaught browser errors',errors.length===0);if(!process.env.NO_REPORT)await writeFile('evidence/grounded-browser-results.json',JSON.stringify({date:new Date().toISOString(),base,checks,errors},null,2));
}finally{await b.close();}
