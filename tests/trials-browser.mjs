import assert from 'node:assert/strict';
import {chromium} from './browser-support.mjs';
import {writeFile} from 'node:fs/promises';
import {COURSES} from '../src/courses.mjs';
import {trialPilot} from './trial-pilot.mjs';
const base=process.env.CLIENT_URL||'http://127.0.0.1:5173',selected=process.env.COURSES?.split(',')||COURSES.map(c=>c.id),browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true,args:[]}),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const diag=()=>page.evaluate(()=>window.pigeonDiagnostics());
let held=[],pulse=0,heldJump=false;
async function release(){for(const k of held)await page.keyboard.up(k);held=[];if(heldJump)await page.keyboard.up('Space');heldJump=false;}
async function control(input){
  const sx=input.x*.903-input.z*.43,sz=input.x*.43+input.z*.903,n=Math.min(1,Math.hypot(sx,sz)),next=[];pulse+=n;
  if(pulse>=1){pulse-=1;const d=Math.max(.001,Math.hypot(sx,sz));if(Math.abs(sx/d)>.38)next.push(sx>0?'d':'a');if(Math.abs(sz/d)>.38)next.push(sz>0?'s':'w');}
  for(const k of held)if(!next.includes(k))await page.keyboard.up(k);for(const k of next)if(!held.includes(k))await page.keyboard.down(k);held=next;
  if(input.jump&&!heldJump){await page.keyboard.down('Space');heldJump=true;}else if(!input.jump&&heldJump){await page.keyboard.up('Space');heldJump=false;}
}
try{
 await page.goto(base);await page.getByRole('button',{name:'Solo practice',exact:true}).click();assert.equal(await page.locator('[data-course]').count(),7);await page.screenshot({path:'evidence/trial-course-menu.png'});
 for(const courseId of selected){
  const course=COURSES.find(c=>c.id===courseId);await page.getByRole('button',{name:'Start '+course.name,exact:true}).click();await page.waitForFunction(()=>window.pigeonDiagnostics().phase==='playing');await page.keyboard.down('Shift');pulse=0;
  const pilot=trialPilot('practice',0);let first=await diag(),started=Date.now(),lastCheckpoint=-1,record=process.env.RECORD&&results.length===0;
  if(record)await page.evaluate(()=>{window.qaChunks=[];window.qaRecorder=new MediaRecorder(document.querySelector('canvas').captureStream(30),{mimeType:'video/webm;codecs=vp9'});window.qaRecorder.ondataavailable=e=>window.qaChunks.push(e.data);window.qaRecorder.start();});
  while(Date.now()-started<140000){
    const s=await diag();if(s.phase==='results')break;
    const p=s.players[0],decision=pilot.decide(s,p);await control(decision.input);
    for(const action of new Set(decision.actions))await page.keyboard.press({grab:'e',gust:'q',rescue:'t'}[action],{delay:15});
    if(s.trial.checkpoint>lastCheckpoint){lastCheckpoint=s.trial.checkpoint;await page.screenshot({path:'evidence/trial-'+courseId+'-checkpoint-'+lastCheckpoint+'.png'});}
    await page.waitForTimeout(45);
  }
  await release();await page.keyboard.up('Shift');const final=await diag();assert.equal(final.phase,'results',JSON.stringify({course:courseId,pilotIndex:pilot.index,state:final}));assert.equal(final.trial.stamps.length,3);if(course.cargo)assert(final.trial.cargoDelivered);
  await page.screenshot({path:'evidence/trial-'+courseId+'-results.png'});results.push({course:courseId,...final.trial.result});console.log('PASS keyboard course '+course.name+': '+final.trial.result.time+'s, '+final.trial.falls+' falls, all stamps.');
  if(record){const bytes=await page.evaluate(()=>new Promise(r=>{window.qaRecorder.onstop=async()=>{const bytes=new Uint8Array(await new Blob(window.qaChunks).arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));r(btoa(s));};window.qaRecorder.stop();}));await writeFile('evidence/rooftop-trials-demo.webm',Buffer.from(bytes,'base64'));}
  const best=await page.evaluate(id=>JSON.parse(localStorage.getItem('pp-course-bests')||'{}')[id],courseId);assert(best&&best.medal);
  const next=COURSES[COURSES.indexOf(course)+1];if(next&&process.env.CHECK_NEXT){await page.getByRole('button',{name:'Next course',exact:true}).click();await page.waitForFunction(id=>{const s=window.pigeonDiagnostics();return s.phase==='playing'&&s.course===id;},next.id);assert.equal((await diag()).trial.stamps.length,0);await page.keyboard.press('Escape');await page.getByRole('button',{name:'Choose course',exact:true}).click();console.log('PASS Next course starts '+next.name+' with fresh progress.');}else await page.getByRole('button',{name:'Choose course',exact:true}).click();
 }
 assert.equal(errors.length,0,errors.join('\n'));if(!process.env.NO_REPORT)await writeFile('evidence/trials-browser-results.json',JSON.stringify({date:new Date().toISOString(),base,results,errors,input:'ordinary keyboard actions, read-only diagnostics; no position/state write hooks'},null,2));
 console.log('PASS course results, persistent bests, course selection and no runtime/geometry errors.');
}catch(error){console.error(JSON.stringify(await diag()));throw error;}finally{await browser.close();}
