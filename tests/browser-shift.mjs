import assert from 'node:assert/strict';
import {chromium} from './browser-support.mjs';
import {ORDERS} from '../src/world.mjs';
import {beakPoint} from '../src/pose.mjs';
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true,args:[]}),page=await browser.newPage({viewport:{width:1440,height:900}}),base=process.env.CLIENT_URL||'http://127.0.0.1:5173';
const diag=()=>page.evaluate(()=>window.pigeonDiagnostics());
async function walk(x,z){
  let held=[];
  for(let i=0;i<350;i++){
    const d=await diag(),p=d.players[0],dx=x-p.x,dz=z-p.z;
    if(Math.hypot(dx,dz)<.22){for(const k of held)await page.keyboard.up(k);await page.waitForTimeout(140);return;}
    const sx=dx*.903-dz*.43,sz=dx*.43+dz*.903,l=Math.max(.01,Math.hypot(sx,sz)),next=[];
    if(Math.abs(sx/l)>.4)next.push(sx>0?'d':'a');if(Math.abs(sz/l)>.4)next.push(sz>0?'s':'w');
    for(const k of held)if(!next.includes(k))await page.keyboard.up(k);for(const k of next)if(!held.includes(k))await page.keyboard.down(k);held=next;await page.waitForTimeout(55);
  }
  for(const k of held)await page.keyboard.up(k);throw Error('Keyboard route stalled '+JSON.stringify(await diag()));
}
try{
  await page.goto(base);await page.getByRole('button',{name:'Solo practice',exact:true}).click();await page.getByRole('button',{name:'Delivery practice',exact:true}).click();
  for(let i=0;i<5;i++){
    const o=ORDERS[i],initial=await diag(),c=initial.cargo;
    await walk(c.x-Math.cos(c.a)*o.length*.42,c.z-Math.sin(c.a)*o.length*.42);
    await page.keyboard.press('e');await page.waitForFunction(()=>window.pigeonDiagnostics().players[0].grip!==null,{},{timeout:2000});
    if(i===1){await page.keyboard.press('r');await page.waitForTimeout(250);await page.keyboard.press('r');await page.waitForTimeout(100);}
    await walk((await diag()).players[0].x,4.9);await walk(o.to.x,4.9);
    // Steer the center of long cargo clear of the bakery posts before turning.
    const approach=await diag();await walk(approach.players[0].x+o.to.x-approach.cargo.x,4.9);
    await walk((await diag()).players[0].x,0);
    // Approach along one keyboard direction so the beak does not swing the load
    // outside the delivery ring during a final turn at the destination.
    const d=await diag(),p=d.players[0],heading=Math.atan2(-.903,-.43),beak=beakPoint({x:0,y:0,z:0,a:heading,aim:heading}),offset=(p.grip===0?-1:1)*o.length*.42*Math.cos(d.cargo.pitch??0);
    const px=o.to.x+Math.cos(d.cargo.a)*offset-beak.x,pz=o.to.z+Math.sin(d.cargo.a)*offset-beak.z;
    await walk(px+.43*1.5,pz+.903*1.5);await walk(px,pz);
    if(process.env.ART_REVIEW)await page.screenshot({path:new URL('../evidence/neighborhood-route-'+(i+1)+'.png',import.meta.url).pathname.replace(/^\/(\w:)/,'$1')});
    await page.keyboard.press('e');await page.waitForFunction(n=>window.pigeonDiagnostics().completed.length===n,i+1,{timeout:5000});console.log('PASS keyboard browser delivery '+(i+1)+': '+o.name);
  }
  assert.equal((await diag()).phase,'results');await page.getByRole('button',{name:'Clock in again',exact:true}).waitFor();
  await page.screenshot({path:new URL('../evidence/results.png',import.meta.url).pathname.replace(/^\/(\w:)/,'$1')});
  await page.getByRole('button',{name:'Express medal run · Gold under 3 minutes',exact:true}).click();await page.waitForFunction(()=>window.pigeonDiagnostics().phase==='playing');assert.equal((await diag()).completed.length,0);assert((await page.locator('body').innerText()).includes('Express'));
  console.log('PASS browser results receipt, full solo shift and Express restart. No state mutation or teleport hooks used.');
}catch(error){console.error('Route failure state:',JSON.stringify(await diag()));throw error;}finally{await browser.close();}
