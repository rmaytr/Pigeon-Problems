import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const base=process.env.CLIENT_URL||'http://127.0.0.1:5173',browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true,args:process.env.CI?['--enable-unsafe-swiftshader']:[]}),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
async function sample(){return page.evaluate(()=>new Promise(resolve=>{const intervals=[],start=performance.now();let last=start;function frame(now){intervals.push(now-last);last=now;if(now-start<4000)requestAnimationFrame(frame);else{intervals.sort((a,b)=>a-b);resolve({durationMs:now-start,frames:intervals.length,fps:intervals.length*1000/(now-start),p95ms:intervals[Math.floor(intervals.length*.95)],renderer:window.pigeonDiagnostics().renderer});}}requestAnimationFrame(frame);}));}
try{
 await page.goto(base);await page.waitForTimeout(2500);await page.screenshot({path:'evidence/neighborhood-home.png'});const home=await sample();
 await page.getByRole('button',{name:'Solo practice',exact:true}).click();await page.getByRole('button',{name:'Delivery practice',exact:true}).click();await page.waitForTimeout(1000);await page.keyboard.press('e');await page.mouse.move(940,500);await page.waitForTimeout(1500);await page.screenshot({path:'evidence/neighborhood-game.png'});const gameplay=await sample(),diag=await page.evaluate(()=>window.pigeonDiagnostics());
 const result={date:new Date().toISOString(),base,viewport:'1440x900',browser:'headless Chrome, local machine',home,gameplay,cargoHeld:diag.players[0].grip!==null,previewActive:!!diag.aimPreview,errors};
 if(!process.env.NO_REPORT)await writeFile('evidence/neighborhood-performance.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();}
