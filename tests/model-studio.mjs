import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true,args:process.env.CI?['--enable-unsafe-swiftshader']:[]}),page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text());});
try{
  await page.goto('http://127.0.0.1:5173');await page.waitForTimeout(1000);
  await page.evaluate(async()=>{
    const T=await import('/node_modules/three/build/three.module.js'),{pigeon,animatePigeon}=await import('/src/pigeon.mjs');
    const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1440,900);renderer.setPixelRatio(1);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;renderer.outputColorSpace=T.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.domElement.style.cssText='position:fixed;inset:0;z-index:99999';document.body.append(renderer.domElement);
    const scene=new T.Scene();scene.background=new T.Color('#c6d7d5');scene.add(new T.HemisphereLight('#ecf5ff','#87978c',1.65));const sun=new T.DirectionalLight('#fff0d6',3.1);sun.position.set(-3,7,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.normalBias=.02;scene.add(sun);
    const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:'#c6d7d5',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.01;floor.receiveShadow=true;scene.add(floor);
    const v=pigeon('#e8bc55',0,()=>new T.Group());scene.add(v.root);v.number.visible=v.ring.visible=v.ping.visible=v.wind.visible=v.shadow.visible=false;v.eyes.forEach(e=>e.visible=false);
    const camera=new T.PerspectiveCamera(30,1440/900,.1,100),state={t:0,bridge:0},p={x:0,y:0,z:0,a:0,aim:0,ground:true,vx:0,vz:0,grip:null};
    window.studio={renderer,scene,camera,v,state,p,animatePigeon,render(angle=0,flight=false){for(let i=0;i<90;i++){p.ground=!flight;p.flapping=flight;state.t+=1/60;this.animatePigeon(v,p,state,1/60,state.t,false);}v.shadow.visible=false;const d=flight?5.5:4;camera.position.set(Math.cos(angle)*d,flight?3:2.25,Math.sin(angle)*d);camera.lookAt(0,.7,0);renderer.render(scene,camera);}};
    window.studio.render(.95,false);
  });
  await page.screenshot({path:'evidence/pigeon-sculpt.png'});await page.evaluate(()=>window.studio.render(1.52,false));await page.screenshot({path:'evidence/pigeon-profile.png'});
  await page.evaluate(()=>window.studio.render(.95,true));await page.screenshot({path:'evidence/pigeon-wings.png'});
  await writeFile('evidence/model-studio-results.json',JSON.stringify({date:new Date().toISOString(),errors,views:['three quarter','profile','extended flight wings']},null,2));if(errors.length)throw Error(errors.join('\n'));console.log('PASS model studio: three rendered views, no geometry merge or runtime errors.');
}finally{await browser.close();}
