import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.CLIENT_URL||'http://127.0.0.1:5173',out=new URL('../evidence/',import.meta.url);
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true,args:[...(process.env.CI?['--enable-unsafe-swiftshader']:[]),'--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required']});
const results=[],errors=[];
const check=(name,value)=>{assert(value,name);results.push(name);console.log('PASS '+name);};
const a=await browser.newContext({viewport:{width:1440,height:900},permissions:['microphone','clipboard-write']});
const p=await a.newPage();p.on('pageerror',e=>errors.push(e.message));
const diag=page=>page.evaluate(()=>window.pigeonDiagnostics());
async function wait(page,predicate,timeout=10000){await page.waitForFunction(predicate,{},{timeout});}
async function walk(page,x,z){
  let held=[];
  for(let i=0;i<250;i++){
    const d=await diag(page),me=d.players.find(p=>p.id===d.id),dx=x-me.x,dz=z-me.z;
    if(Math.hypot(dx,dz)<.25){for(const k of held)await page.keyboard.up(k);await page.waitForTimeout(140);return;}
    const sx=dx*.903-dz*.43,sz=dx*.43+dz*.903,l=Math.max(.01,Math.hypot(sx,sz));
    const next=[];if(Math.abs(sx/l)>.38)next.push(sx>0?'d':'a');if(Math.abs(sz/l)>.38)next.push(sz>0?'s':'w');
    for(const k of held)if(!next.includes(k))await page.keyboard.up(k);for(const k of next)if(!held.includes(k))await page.keyboard.down(k);held=next;
    await page.waitForTimeout(65);
  }
  for(const k of held)await page.keyboard.up(k);throw Error('Browser movement stalled at '+JSON.stringify(await diag(page)));
}
try{
  await p.goto(base);await wait(p,()=>!!window.pigeonDiagnostics);await p.screenshot({path:new URL('homepage.png',out).pathname.replace(/^\/(\w:)/,'$1')});
  check('homepage has a rendered 3D scene', (await diag(p)).renderer.triangles>10000);
  await p.getByRole('button',{name:'Solo practice',exact:true}).click();await p.getByRole('button',{name:'Delivery practice',exact:true}).click();await wait(p,()=>window.pigeonDiagnostics().phase==='playing');
  check('solo practice begins playable tutorial',(await diag(p)).solo);
  await p.keyboard.down('Space');await p.waitForTimeout(300);await p.keyboard.up('Space');check('keyboard hop produces lift',(await diag(p)).players[0].y>1);
  await p.waitForTimeout(1700);await walk(p,.4,0);await p.keyboard.press('e');await p.waitForTimeout(120);check('keyboard grabs actual cargo',(await diag(p)).players[0].grip!==null);
  await walk(p,.4,4.9);await walk(p,12,4.9);await walk(p,12,0);await p.keyboard.press('e');await wait(p,()=>window.pigeonDiagnostics().order===1);
  check('browser delivery completes using only keyboard movement and placement',(await diag(p)).completed.length===1);
  await p.screenshot({path:new URL('gameplay.png',out).pathname.replace(/^\/(\w:)/,'$1')});
  await p.keyboard.press('y');await p.waitForTimeout(100);check('cargo recall preserves checkpoint',(await diag(p)).order===1);
  await p.getByRole('button',{name:'Open sound, controls and accessibility settings'}).click();await p.locator('#motion').check();await p.locator('[data-remap="gust"]').click();await p.keyboard.press('g');await p.getByRole('button',{name:'Close dialog',exact:true}).click();check('key remapping works',(await diag(p)).keys.gust==='KeyG');
  await p.keyboard.press('Escape');await p.getByRole('button',{name:'Leave shift',exact:true}).click();
  await p.getByRole('button',{name:'Clock in with friends'}).click();await p.locator('#pigeon-name').fill('Browser A');await p.getByRole('button',{name:'Create private crew',exact:true}).click();await wait(p,()=>window.pigeonDiagnostics().phase==='lobby');
  const room=(await diag(p)).code;
  const b=await browser.newContext({viewport:{width:1280,height:800},permissions:['microphone']}),q=await b.newPage();q.on('pageerror',e=>errors.push(e.message));
  await q.goto(base+'/?room='+room);await q.locator('#pigeon-name').fill('Browser B');await q.getByRole('button',{name:'Join crew',exact:true}).click();await wait(q,()=>window.pigeonDiagnostics().phase==='lobby');await wait(p,()=>window.pigeonDiagnostics().players.length===2);
  check('invite link joins a separate browser context',(await diag(q)).players.length===2);
  await p.getByRole('button',{name:'Enable room voice (optional)',exact:true}).click();await p.waitForTimeout(300);check('voice enters muted',(await diag(p)).voice.enabled&&(await diag(p)).voice.muted&&(await diag(p)).voice.tracks.every(t=>!t.enabled));
  await q.getByRole('button',{name:'Enable room voice (optional)',exact:true}).click();await q.waitForTimeout(800);
  check('voice creates peer audio elements',await p.locator('audio').count()>0);
  await p.getByRole('button',{name:'Voice enabled · Mic muted',exact:true}).click();check('microphone toggle enables track',(await diag(p)).voice.tracks.some(t=>t.enabled));
  const id=(await diag(p)).id;await p.reload();await wait(p,()=>window.pigeonDiagnostics().connection==='online');check('refresh returns same pigeon',(await diag(p)).id===id);check('mute preference survives refresh',(await diag(p)).voice.muted===false);
  // Refresh transfers dispatch lead to the surviving crew, preserving the room.
  await q.getByRole('button',{name:'Start the shift',exact:true}).click();await wait(p,()=>window.pigeonDiagnostics().phase==='playing');
  await p.keyboard.down('d');await p.waitForTimeout(400);await p.keyboard.up('d');await p.waitForTimeout(120);
  const local=(await diag(p)),remote=(await diag(q)).players.find(v=>v.id===local.id);check('browser motion synchronizes to remote client',remote.x>-.5);
  await p.keyboard.press('e');await p.waitForTimeout(180);check('online browser cargo ownership is synchronized',(await diag(q)).players.find(v=>v.id===local.id).grip!==null);
  await p.keyboard.press('Digit4');await q.waitForTimeout(100);check('contextual help ping reaches teammate',(await q.locator('body').innerText()).includes('Help!'));
  await p.keyboard.press('Escape');await p.getByRole('button',{name:'Leave shift',exact:true}).click();check('leaving releases voice resources',!(await diag(p)).voice.enabled&&(await p.locator('audio').count())===0);
  await b.close();
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),m=await mobile.newPage();await m.goto(base);await wait(m,()=>!!window.pigeonDiagnostics);
  check('mobile homepage has no horizontal overflow',await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await m.screenshot({path:new URL('mobile-home.png',out).pathname.replace(/^\/(\w:)/,'$1')});
  await m.getByRole('button',{name:'Solo practice',exact:true}).click();await m.getByRole('button',{name:'Delivery practice',exact:true}).click();await m.getByRole('button',{name:'Hop and flap',exact:true}).dispatchEvent('pointerdown',{pointerId:1,clientX:200,clientY:720});await m.waitForTimeout(250);await m.getByRole('button',{name:'Hop and flap',exact:true}).dispatchEvent('pointerup',{pointerId:1});check('touch flap control creates lift',(await diag(m)).players[0].y>.5);
  await m.screenshot({path:new URL('mobile-game.png',out).pathname.replace(/^\/(\w:)/,'$1')});await mobile.close();
  check('no uncaught browser errors',errors.length===0);
  if(!process.env.NO_REPORT)await writeFile(new URL('browser-results.json',out),JSON.stringify({date:new Date().toISOString(),base,checks:results,errors},null,2));
  console.log(`${results.length} browser checks passed. Scripted browser QA, not human playtesting.`);
}finally{await browser.close();}
