import './style.css';
import {View} from './view.mjs';
import {Voice} from './voice.mjs';
import {makeState,addPlayer,startShift,tick,act,setInput,movePlayer,snapshot,totalScore,emptyInput} from './engine.mjs';
import {ORDERS,PALETTE,STEP,dist} from './world.mjs';
import {readAim,readPower} from './aim.mjs';
import {lookHeading} from './pose.mjs';
import {COURSES,isTrial,getCourse} from './courses.mjs';
import {coursePickerHTML,trialObjectiveHTML,trialResultsHTML,rememberCourse} from './trial-ui.mjs';
const API=import.meta.env.VITE_SERVER_URL||(location.hostname==='localhost'||location.hostname==='127.0.0.1'?'':'https://pigeon-problems-realtime.pigeon-problems.workers.dev');
const app=document.querySelector('#app');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const defaults={up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',jump:'Space',grab:'KeyE',throw:'KeyF',rotate:'KeyR',gust:'KeyQ',rescue:'KeyT',recall:'KeyY',emote:'KeyC'};
let settings;try{settings={sfx:.45,music:0,voice:.8,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,keys:defaults,...JSON.parse(localStorage.getItem('pp-settings')||'{}')};}catch{settings={sfx:.45,music:0,voice:.8,reduced:false,keys:defaults};}
document.documentElement.dataset.reduced=String(settings.reduced);
let view;try{view=new View(document.querySelector('#scene'),settings);}catch(e){app.innerHTML=`<main class="fatal"><h1>Pigeon Problems</h1><p>${esc(e.message)}</p></main>`;throw e;}
let state=null,id=null,solo=false,ws=null,seq=0,actionN=0,code=null,reconnectTimer=null,retry=0,leaving=false,connection='home',modal=null,screen='home',lastUI='',lastEvent=0,toastTimer=null,toast='',name=localStorage.getItem('pp-name')||'Pip',pending=[],predicted=null,lastFrame=performance.now(),accumulator=0,netAccum=0,uiAccum=0,latency=0,keyCapture=null,lastPad=[],tutorial=new Set(),mode='shift',snapshotAt=0;
const keys=new Set(),touch={x:0,z:0,jump:false},input=emptyInput();
const pointer={x:0,y:0,active:false,pressed:false},touchAim={active:false,aim:null,power:1};
const stickAim={active:false,aim:0,power:1};
let movePointer=null,flapPointer=null,throwPointer=null,moveRect=null,throwOrigin=null;
const voice=new Voice((to,data)=>send({type:'signal',to,data}),notify);voice.setVolume(settings.voice);
let audioCtx=null,nextMusic=0;
function audio(){audioCtx??=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();}
function tone(freq=600,duration=.12,volume=.1,type='sine'){
  if(!audioCtx||!settings.sfx)return;const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(freq,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.75,audioCtx.currentTime+duration);g.gain.setValueAtTime(volume*settings.sfx,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration);
}
function notify(text){toast=text;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast='';renderUI(true);},5000);renderUI(true);}
function saveSettings(){localStorage.setItem('pp-settings',JSON.stringify(settings));view.reduced=settings.reduced;document.documentElement.dataset.reduced=String(settings.reduced);voice.setVolume(settings.voice);}
function send(msg){if(ws?.readyState===1)ws.send(JSON.stringify(msg));}
function action(type,value){
  audio();keys.delete('Enter');
  if((type==='throw'||type==='gust')&&value===undefined){const p=state?.players.find(p=>p.id===id);const aim=p?sampleAim(p):null;if(aim)value={aim:type==='gust'&&aim.target?lookHeading(p,Math.atan2(aim.target.z-p.z,aim.target.x-p.x)):aim.aim,power:aim.power};}
  if(type==='grab')tutorial.add('grab');if(type==='gust')tutorial.add('gust');if(type==='throw')tutorial.add('throw');
  if(solo&&state){const p=state.players.find(p=>p.id===id);act(state,p,type,value);}
  else send({type:'action',action:type,value,n:++actionN});
  if(type==='gust')tone(280,.2,.12,'triangle');if(type==='grab')tone(520,.06,.1);renderUI(true);
}
async function createRoom(){
  const button=document.querySelector('[data-action="create"]');if(button){button.disabled=true;button.textContent='Calling dispatch…';}
  try{const r=await fetch(API+'/api/rooms',{method:'POST',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Dispatch is busy. Try again shortly.');const data=await r.json();connect(data.code);}
  catch(e){notify(e.message.includes('fetch')?'Cannot reach dispatch. Check your connection, or use solo practice.':e.message);renderUI(true);}
}
function connect(room,{resume=true}={}){
  code=room.toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6);if(code.length!==6){notify('A crew code has six letters or numbers.');return;}
  clearTimeout(reconnectTimer);resetControls();solo=false;leaving=false;connection='connecting';modal=null;screen='connecting';view.setHome(false);renderUI(true);
  const target=(API||location.origin).replace(/^http/,'ws')+'/ws?room='+code;
  const previous=ws;ws=new WebSocket(target);const socket=ws;previous?.close();
  socket.onopen=()=>{if(ws===socket&&!leaving)send({type:'join',name,token:resume?sessionStorage.getItem('pp-ticket:'+code):null});};
  socket.onmessage=e=>{
    if(ws!==socket||leaving)return;
    let m;try{m=JSON.parse(e.data);}catch{return;}
    if(m.type==='welcome'){
      id=m.id;seq=m.seq;actionN=0;retry=0;sessionStorage.setItem('pp-ticket:'+code,m.token);sessionStorage.setItem('pp-active',code);history.replaceState(null,'','?room='+code);connection='online';pending=[];predicted=null;voice.id=id;
    }
    if(m.state){
      state=m.state;snapshotAt=performance.now()/1000;screen=state.phase;
      const me=state.players.find(p=>p.id===id);
      if(me){
        if(!predicted||dist(me,predicted)>3||Math.abs(me.y-predicted.y)>2||state.phase!=='playing')predicted=structuredClone(me);
        else{
          predicted=structuredClone(me);pending=pending.filter(p=>p.seq>me.seq).slice(-20);
          for(let i=0;i<pending.length;i++)movePlayer(predicted,pending[i],1/30,isTrial(state)?{...state,t:state.t+(i+1)/30}:state);
        }
      }
      voice.sync(state.players,id);handleEvents();renderUI();
    }
    if(m.type==='pong')latency=Math.round(performance.now()-m.sent);
    if(m.type==='signal')voice.signal(m.from,m.data);
    if(m.type==='error'){
      if(m.message.includes('ticket')){sessionStorage.removeItem('pp-ticket:'+code);connection='error';notify(m.message+' Use “Join as new pigeon”.');}
      else notify(m.message);
    }
    if(m.type==='replaced'){leaving=true;connection='error';notify('This pigeon is connected in another tab. Join as a new pigeon here.');}
  };
  socket.onclose=e=>{
    if(ws!==socket||leaving)return;
    keys.clear();if(e.code===4001||e.code===4003){connection='error';renderUI(true);return;}
    connection='reconnecting';screen=state?.phase??'connecting';renderUI(true);
    if(retry++<7)reconnectTimer=setTimeout(()=>connect(code),Math.min(6000,800+retry*650));
    else{connection='error';notify('Dispatch is unreachable. Retry the crew connection or return to solo practice.');}
  };
  socket.onerror=()=>{};
}
function practice(course='deliveries'){
  leave(false);solo=true;connection='solo';id='practice';code='PRACTICE';mode=course==='deliveries'?'shift':'trials';state=makeState(code,mode);if(mode==='trials')state.course=course;addPlayer(state,id,name);startShift(state);screen='playing';view.setHome(false);tutorial=new Set();lastEvent=0;renderUI(true);audio();
}
function leave(home=true){
  leaving=true;clearTimeout(reconnectTimer);send({type:'leave'});ws?.close();ws=null;voice.dispose();sessionStorage.removeItem('pp-active');state=null;predicted=null;pending=[];keys.clear();lastEvent=0;solo=false;id=null;code=null;modal=null;resetControls();
  if(home){screen='home';connection='home';history.replaceState(null,'',location.pathname);view.setHome(true);for(const p of view.crew.values())p.root.visible=false;if(view.cargo)view.cargo.visible=false;renderUI(true);}
}
function handleEvents(){if(!state)return;if(state.phase==='results')rememberCourse(state);for(const e of state.events){if(e.id<=lastEvent)continue;lastEvent=e.id;if(e.kind==='deliver'||e.kind==='finish'){tone(880,.3,.22);setTimeout(()=>tone(1100,.4,.13),130);}else if(e.kind==='collect'||e.kind==='checkpoint')tone(740,.14,.1);else if(e.kind==='catch')tone(740,.15,.17);else if(e.kind==='bump')tone(170,.08,.1);else if(e.kind==='coo')tone(410,.22,.16);}}
const keyLabel=k=>({Space:'Space',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→'}[k]||k.replace('Key','').replace('Digit',''));
const key=n=>`<kbd>${esc(keyLabel(settings.keys[n]))}</kbd>`;
const bird=`<svg viewBox="0 0 56 48" aria-hidden="true"><path d="M7 38c-7-8-4-21 6-24l13-3c1-9 8-13 15-9 6 3 7 10 4 15l8 5-12 3c-3 12-11 18-25 15l-8 5 1-8Z" fill="currentColor"/><circle cx="40" cy="9" r="2" fill="#ffcf54"/><path d="M17 18c-5 9-2 15 10 13" fill="none" stroke="#ffcf54" stroke-width="3"/></svg>`;
function crewHTML(){return state.players.map(p=>`<div class="crew-member ${p.id===id?'is-you':''}"><span class="crew-dot" style="--p:${PALETTE[p.slot]}">${p.slot+1}</span><span><b>${esc(p.name)}</b> <small>${p.id===id?'You':p.connected?'Online':'Rejoining…'}${p.id===state.host?' · Dispatch lead':''}</small></span>${p.ready?'<span class="ready">Ready</span>':''}${voice.enabled&&p.id!==id?`<button class="icon-button" data-mute="${p.id}" aria-label="${voice.individual.has(p.id)?'Unmute':'Mute'} ${esc(p.name)}">${voice.individual.has(p.id)?'Unmute':'Mute'}</button>`:''}</div>`).join('');}
function header(){return `<header class="topbar"><button class="brand" data-action="brand" aria-label="Pigeon Problems home">${bird}<span>Pigeon<br>Problems<span class="brand-period">.</span></span></button><div class="top-actions">${state&&!solo?`<button class="room-chip" data-action="copy">Crew <b>${esc(code)}</b> <span>Copy invite</span></button>`:'<span class="tagline">Special delivery. Questionable staff.</span>'}<button class="settings-button" data-action="settings" aria-label="Open sound, controls and accessibility settings">⚙<span>Settings</span></button></div></header>`;}
function homeHTML(){return `<main class="home"><section class="dispatch-slip"><div class="postmark"><span>Rooftop delivery service</span><b>Est. this morning</b></div><h1>Big deliveries.<br>Tiny pigeons.</h1><p class="hero-description">Your friends. One awkward parcel.<br>Six rooftop trials. Five awkward deliveries.</p><button class="primary wide" data-action="open-create">Clock in with friends <span>↗</span></button><div class="home-secondary"><button class="secondary" data-action="open-join">Join a crew</button><button class="text-button" data-action="practice">Solo practice</button></div><div class="home-footer"><span class="live-dot"></span>1–4 pigeons <span>Online co-op</span><span>Free to be unqualified</span></div></section><div class="world-caption"><span class="stamp">Handle with<br><b>teamwork</b></span><p>Grab. Flap. Improvise.<br><span>Everything gets there. Eventually.</span></p></div><div class="bottom-note"><span>Keyboard · Gamepad · Touch</span><button data-action="how">Employee handbook</button><span>No account. No actual pigeons harmed.</span></div></main>`;}
function lobbyHTML(){return `<main class="lobby-panel panel"><div class="small-title">Morning shift · Private crew</div><h1>Good birds.<br>Dubious résumés.</h1><p>Invite up to three friends. Choose a rooftop platforming trial or the classic delivery shift.</p><div class="lobby-course"><b>${isTrial(state)?esc(getCourse(state).name):'Classic delivery shift'}</b><button class="secondary" data-action="courses">Choose course</button></div><div class="invite-code"><b>${esc(code)}</b><button class="secondary" data-action="copy">Copy invite link</button></div><div class="crew-list">${crewHTML()}</div><p class="subtle">${state.players.filter(p=>p.connected).length}/4 clocked in. Solo cargo scales down automatically. Friends can join during a delivery.</p><div class="button-row"><button class="primary" data-action="start" ${state.host!==id?'disabled':''}>${state.host===id?'Start the shift':'Waiting for dispatch lead'}</button><button class="secondary" data-action="ready">${state.players.find(p=>p.id===id)?.ready?'Unready':'I’m ready'}</button></div><button class="text-button" data-action="voice">${voice.enabled?'Voice enabled · '+(voice.muted?'Mic muted':'Mic on'):'Enable room voice (optional)'}</button><p class="micro">Voice starts muted. Direct peer connection; pings work on every network.</p></main>`;}
function objectiveHTML(){
  if(isTrial(state))return trialObjectiveHTML(state,{id,solo,latency,key,crew:crewHTML(),controls:crewControlsHTML()});
  const o=ORDERS[state.order],me=state.players.find(p=>p.id===id),carrying=me?.grip!==null;
  const elapsed=Math.floor(state.t-state.startedAt),clock=Math.floor(elapsed/60)+':'+String(elapsed%60).padStart(2,'0');
  const nearby=state.cargo&&dist(me,state.cargo)<3;
  const tip=state.order===0&&!tutorial.has('jump')?`${key('jump')} Hop, then hold to flap across the alley. Land to refill your wings.`:state.order===0&&!tutorial.has('grab')?`${key('grab')} Grab a yellow cargo end. Walk to the delivery ring, then E to place.`:o.tip;
  return `<div class="objective panel"><div class="order-heading"><span>Delivery ${state.order+1} of 5</span><span class="small-pill">${state.mode==='express'?'Express '+clock:solo?'Solo practice':'Co-op shift'}</span></div><h2>${esc(o.name)}</h2><p>${esc(o.label)}</p><div class="route-progress">${ORDERS.map((_,i)=>`<span class="${i<state.order?'done':i===state.order?'current':''}">${i<state.order?'✓':i+1}</span>`).join('<i></i>')}</div><div class="instruction">${tip}</div><div class="cargo-health"><span>Cargo care</span><div class="meter"><i style="width:${state.cargo?.condition??100}%"></i></div><b>${Math.round(state.cargo?.condition??100)}%</b></div></div><div class="crew-hud panel"><div class="crew-title">The crew <span>${solo?'Local':`${latency||'…'} ms`}</span></div>${crewHTML()}<div class="crew-controls">${crewControlsHTML()}</div></div><div class="interaction ${nearby||carrying?'visible':''}">${carrying?`${key('grab')} Set down <span>${key('throw')} / Mouse release · ${key('rotate')} Rotate</span>`:`${key('grab')} Grab / catch cargo`}</div><div class="stamina panel"><span>Wing power</span><div class="meter"><i style="width:${(me?.stamina??1)*100}%"></i></div><b>${me?.ground?'Rested':(me?.stamina??1)>.05?'Flapping':'Land to refill'}</b></div><div class="game-controls panel"><span>${key('up')}${key('left')}${key('down')}${key('right')} Move</span><span>${key('jump')} Hop / hold flap</span><span>${key('grab')} Grab / place</span><span>Mouse aim · ${key('throw')} / click Throw</span><span>${key('gust')} Gust</span><span>${key('rotate')} Rotate</span><button data-action="recover">Stuck?</button></div><div class="event-feed" aria-live="polite">${state.events.filter(e=>e.id>1&&state.t-e.t<4).slice(-2).map(e=>`<div class="event ${e.kind}">${esc(e.text)}</div>`).join('')}</div>`;
}
function crewControlsHTML(){return `<button data-action="ping">Ping crew</button>${solo?'':`<button data-action="voice">${voice.enabled?(voice.muted?'Mic muted':'Mic on'):'Voice off'}</button>`}${voice.enabled?'<button data-action="voice-off">Leave voice</button>':''}<button data-action="recover" aria-label="Open shift menu">Menu</button>`;}
function resultsHTML(){
  if(isTrial(state))return trialResultsHTML(state,{solo,id});
  const score=totalScore(state),time=Math.round((state.finishedAt??state.t)-state.startedAt),medal=state.mode==='express'?(time<=180?'Gold':time<=240?'Silver':'Bronze'):(score>=4000?'Gold':score>=3500?'Silver':'Bronze');
  return `<main class="results panel"><div class="small-title">${state.mode==='express'?'Express run complete':'Shift complete'} · All parcels accounted for</div><h1>Somehow,<br>we’re employed.</h1><p>Five signatures. ${state.stats.recoveries} dramatic recover${state.stats.recoveries===1?'y':'ies'}. One very professional crew.</p><div class="scoreline"><strong>${score.toLocaleString()}</strong><span>team points<br>${Math.floor(time/60)}m ${time%60}s · ${medal} wings</span></div><div class="receipt">${state.completed.map(d=>`<div><span>${esc(d.name)}<small>${d.condition}% care · ${d.time}s</small></span><b>${d.total}</b></div>`).join('')}<div><span>Clean handoffs <small>${state.stats.handoffs} × 80 points</small></span><b>${state.stats.handoffs*80}</b></div><div><span>Shared carrying<small>2 per second, up to 200</small></span><b>${Math.min(200,Math.round(state.stats.shared)*2)}</b></div><div><span>Recovery credit<small>10 each, up to 100</small></span><b>${Math.min(100,state.stats.recoveries*10)}</b></div></div><p class="micro">Each delivery = 500 + care (up to 200) + pace (2 per second under target). Checkpoints kept every signature.</p><div class="button-row"><button class="primary" data-action="rematch" ${!solo&&state.host!==id?'disabled':''}>Clock in again</button><button class="secondary" data-action="leave">Off duty</button></div><button class="text-button" data-action="express" ${!solo&&state.host!==id?'disabled':''}>Express medal run · Gold under 3 minutes</button><p class="subtle">${solo?'Try a crew shift for real handoff bonuses.':'Gold wings earned together. All crew see the same receipt.'}</p></main>`;
}
function touchHTML(){return `<div class="touch-controls"><div class="joystick" aria-label="Touch movement pad"><i></i></div><div class="touch-actions"><button data-hold="jump" aria-label="Hop and flap">Flap</button><button data-game="grab">Grab</button><button data-throw="true" aria-label="Drag to aim and release to throw">Throw</button><button data-game="gust">Gust</button><button data-game="rotate">Turn</button></div></div>`;}
function modalHTML(){
  if(!modal)return '';
  let content='';
  if(modal==='create'||modal==='join')content=`<div class="small-title">${modal==='create'?'Open a dispatch office':'Reporting for duty'}</div><h2>${modal==='create'?'Assemble your crew.':'Got a crew code?'}</h2><label>Your pigeon name<input id="pigeon-name" maxlength="16" autocomplete="nickname" value="${esc(name)}" placeholder="Pip"></label>${modal==='join'?'<label>Six-character crew code<input id="room-code" maxlength="6" autocomplete="off" placeholder="ABC123" class="code-input"></label>':'<p>Private room, up to four players. Share the invite link with friends on separate devices.</p>'}<button class="primary wide" data-action="${modal==='create'?'create':'join'}">${modal==='create'?'Create private crew':'Join crew'}</button><p class="micro">No account needed. Your return ticket stays in this browser tab.</p>`;
  if(modal==='courses')content=coursePickerHTML({online:!!state&&!solo,canChoose:!state||solo||state.host===id,selected:state?.course});
  if(modal==='settings')content=`<h2>Employee preferences</h2><label class="range-label">Sound effects <input id="sfx" type="range" min="0" max="1" step=".05" value="${settings.sfx}"></label><label class="range-label">Rooftop ambience <input id="music" type="range" min="0" max="1" step=".05" value="${settings.music}"></label><label class="range-label">Voice volume <input id="voice-volume" type="range" min="0" max="1" step=".05" value="${settings.voice}"></label><label class="check-label"><input id="motion" type="checkbox" ${settings.reduced?'checked':''}> Reduced motion</label><h3>Keyboard controls</h3><p class="micro">Select an action, then press a key. Arrow keys also move. Mouse turns the head up to 65° each side; move to turn the body. left mouse releases a throw, right mouse gusts. Gamepad: left stick moves, right stick aims, A flaps, X grips, B/RT throws, Y gusts, RB rotates. Touch: drag Throw to aim and release. Hold Shift for movement-based keyboard aim.</p><div class="key-grid">${Object.entries(settings.keys).map(([k,v])=>`<button data-remap="${k}" class="secondary">${k}<kbd>${keyCapture===k?'Press key':esc(keyLabel(v))}</kbd></button>`).join('')}</div><button class="text-button" data-action="reset-keys">Reset keys</button>`;
  if(modal==='how')content=`<h2>Employee handbook</h2><p>You are a pigeon. You have a job. Both facts are surprising.</p><ol class="handbook"><li><b>Move and flap.</b> WASD or arrows. Space hops; hold it for limited lift. Landing refills wing power.</li><li><b>Grab a yellow end.</b> E takes a grip or places gently. A second carrier makes large cargo faster and steadier. R rotates.</li><li><b>Pass with purpose.</b> Point the mouse to look and set distance. The head turns up to 65°; use movement to turn the body. Hold left mouse to line up; release or press F to throw. The stamp marks first impact. E catches nearby cargo.</li><li><b>Make some wind.</b> Right mouse or Q gusts along your aim. Nudge a sail, lift a friend, or turn the express sign.</li><li><b>Get the signature.</b> Set cargo down inside its glowing delivery ring. Every delivery saves a checkpoint.</li></ol><p>In delivery practice, yellow back bridges and stairs offer safe routes. Rooftop trials have real gaps: land to refill flight, collect three stamps, then reach the flag. E turns a nearby weather vane; the brass plate charges the freight lift. Amber shutters warn before closing, green fan rings signal an updraft, and cracked caps give way after a short warning.</p><p><b>Someone fell?</b> T returns your pigeon. Y recalls the current cargo for 12 care. Earlier deliveries stay signed.</p><p class="micro">Standard gamepad and touch controls supported. Desktop keyboard is recommended for precise passes. Voice is optional and direct-connect; pings never need a microphone.</p><button class="primary wide" data-action="close">Understood. Probably.</button>`;
  if(modal==='recover')content=`<h2>Employee return service</h2><p>${isTrial(state)?'Retry the latest checkpoint. Collected stamps stay with the crew; a retry counts as a fall.':'Only the current delivery is affected. Your completed deliveries are safe.'}</p><button class="primary wide" data-action="rescue">Return my pigeon to checkpoint (T)</button><button class="secondary wide" data-action="recall">Recall cargo to checkpoint (Y)</button><p class="micro">${isTrial(state)?'Use E near a weather vane. Step on the brass freight plate to start its cycle.':'Cargo recall costs 12 care. Re-grabbing and gentle placement are free.'}</p><button class="text-button" data-action="courses" ${state?.phase==='playing'&&!solo?'disabled':''}>Choose course</button><button class="text-button" data-action="leave">Leave shift</button>`;
  if(modal==='ping')content=`<h2>A word from the bird</h2><div class="ping-grid">${['Grab here','Ready!','Throw!','Help!'].map((v,i)=>`<button class="secondary" data-ping="${v}"><kbd>${i+1}</kbd> ${v}</button>`).join('')}</div><button class="primary wide" data-action="emote">Professional pigeon bow (C)</button>`;
  return `<div class="modal-backdrop"><section class="modal panel ${modal==='courses'?'course-modal':''}" role="dialog" aria-modal="true" aria-label="${esc(modal)}"><button class="close" data-action="close" aria-label="Close dialog">×</button>${content}</section></div>`;
}
function renderUI(force=false){
  // Do not replace focused form/range elements on incoming network snapshots.
  const phase=state?.phase??screen;
  const signature=JSON.stringify([phase,connection,modal,toast,state?.mode,state?.course,state?.trial?.stamps,state?.trial?.checkpoint,state?.trial?.falls,state?.trial?.ready,state?.trial?.cargoDelivered,state?.order,state?.completed,state?.players.map(p=>[p.id,p.name,p.connected,p.ready,p.grip]),Math.round((state?.players.find(p=>p.id===id)?.stamina??1)*10),Math.round(state?.cargo?.condition??100),state?.events.at(-1)?.id,Math.floor(state?.t??0),voice.enabled,voice.muted]);
  if(!force&&lastUI===signature)return;
  if(!force&&modal)return;
  lastUI=signature;
  let content=screen==='home'?homeHTML():!state?`<main class="connecting panel"><div class="loader"></div><h2>${connection==='error'?'Dispatch is unreachable':'Calling dispatch…'}</h2><p>Warming up the wings. Checking the paperwork.</p><button class="secondary" data-action="reconnect">Retry connection</button><button class="text-button" data-action="leave">Return home</button></main>`:phase==='lobby'?lobbyHTML():phase==='results'?resultsHTML():objectiveHTML()+touchHTML();
  const interrupted=connection==='reconnecting'||connection==='connecting'&&state||connection==='error';
  app.innerHTML=header()+content+(interrupted?`<div class="connection-banner" role="status">${connection==='error'?'Connection needs attention.':'Reconnecting to dispatch… Your completed deliveries are safe.'}<button data-action="reconnect">Retry</button><button data-action="new-pigeon">Join as new pigeon</button><button data-action="leave">Home</button></div>`:'')+modalHTML()+`<div class="toast ${toast?'show':''}" role="status">${esc(toast)}</div>`;
  document.body.dataset.screen=screen;bindTouch();
  if(modal==='create'||modal==='join')document.querySelector('#pigeon-name')?.focus();
  else if(modal)document.querySelector('.modal button, .modal input')?.focus();
}
app.addEventListener('input',e=>{
  const target=e.target;
  if(target.id==='pigeon-name'){name=target.value||'Pip';localStorage.setItem('pp-name',name);}
  if(['sfx','music','voice-volume'].includes(target.id)){settings[target.id==='voice-volume'?'voice':target.id]=Number(target.value);saveSettings();audio();}
  if(target.id==='motion'){settings.reduced=target.checked;saveSettings();}
});
app.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;audio();
  if(b.dataset.course){const course=b.dataset.course;if(state&&!solo){action('course',course);modal=null;renderUI(true);}else{modal=null;practice(course);}return;}
  if(b.dataset.game){action(b.dataset.game);return;}
  if(b.dataset.mute){voice.mutePeer(b.dataset.mute);renderUI(true);return;}
  if(b.dataset.remap){keyCapture=b.dataset.remap;renderUI(true);return;}
  if(b.dataset.ping){action('ping',b.dataset.ping);modal=null;renderUI(true);return;}
  const a=b.dataset.action;
  if(a==='settings'||a==='how'||a==='recover'||a==='ping'){modal=a;resetControls();renderUI(true);return;}
  if(a==='open-create'||a==='open-join'){modal=a==='open-create'?'create':'join';renderUI(true);return;}
  if(a==='close'){modal=null;keyCapture=null;renderUI(true);return;}
  if(a==='practice'||a==='courses'){modal='courses';resetControls();renderUI(true);return;}
  if(a==='create'){await createRoom();return;}
  if(a==='join'){connect(document.querySelector('#room-code').value);return;}
  if(a==='start'||a==='ready'||a==='rematch'||a==='express'||a==='next-course'){action(a);return;}
  if(a==='rescue'||a==='recall'||a==='emote'){action(a);modal=null;renderUI(true);return;}
  if(a==='leave'){leave();return;}
  if(a==='brand'){if(state){modal='recover';renderUI(true);}else leave();return;}
  if(a==='reconnect'){connect(code);return;}
  if(a==='new-pigeon'){sessionStorage.removeItem('pp-ticket:'+code);leaving=true;ws?.close();connect(code,{resume:false});return;}
  if(a==='copy'){
    const url=location.origin+'/?room='+code;
    try{await navigator.clipboard.writeText(url);notify('Invite copied. Send it to your fellow employees.');}catch{modal=null;notify('Invite: '+url);}return;
  }
  if(a==='voice'){
    if(solo){notify('Solo practice uses pings. Invite friends to use room voice.');return;}
    if(!voice.enabled)await voice.enable();else voice.toggle();renderUI(true);return;
  }
  if(a==='voice-off'){voice.dispose();renderUI(true);return;}
  if(a==='reset-keys'){settings.keys={...defaults};saveSettings();renderUI(true);}
});
window.addEventListener('keydown',e=>{
  if(keyCapture){
    e.preventDefault();if(e.code==='Escape'){keyCapture=null;renderUI(true);return;}
    const other=Object.entries(settings.keys).find(([k,v])=>v===e.code&&k!==keyCapture);if(other)settings.keys[other[0]]=settings.keys[keyCapture];settings.keys[keyCapture]=e.code;keyCapture=null;saveSettings();renderUI(true);return;
  }
  if(e.code==='Escape'){modal=modal?null:state?'recover':null;resetControls();renderUI(true);return;}
  if(e.target instanceof HTMLInputElement){if(e.code==='Enter'&&(modal==='create'||modal==='join')){e.preventDefault();document.querySelector('[data-action="'+(modal==='create'?'create':'join')+'"]')?.click();}return;}
  if(e.code==='Tab'){
    if(modal){const items=[...document.querySelectorAll('.modal button:not(:disabled), .modal input')];const first=items[0],last=items.at(-1);if(e.shiftKey&&(document.activeElement===first||!document.activeElement.closest('.modal'))){e.preventDefault();last?.focus();}else if(!e.shiftKey&&(document.activeElement===last||!document.activeElement.closest('.modal'))){e.preventDefault();first?.focus();}}
    return;
  }
  if(modal){if(e.code.startsWith('Digit')&&modal==='ping'){const v=['Grab here','Ready!','Throw!','Help!'][Number(e.code.slice(-1))-1];if(v){action('ping',v);modal=null;renderUI(true);}}return;}
  if(Object.values(settings.keys).includes(e.code)||e.code.startsWith('Arrow'))e.preventDefault();
  keys.add(e.code);if(e.repeat)return;
  if(e.code===settings.keys.jump){tutorial.add('jump');tone(600,.06,.06);}
  if(e.code==='KeyV'&&state){modal='ping';renderUI(true);return;}
  if(['Digit1','Digit2','Digit3','Digit4'].includes(e.code)&&state){action('ping',['Grab here','Ready!','Throw!','Help!'][Number(e.code.slice(-1))-1]);return;}
  for(const type of ['grab','throw','rotate','gust','rescue','recall','emote'])if(e.code===settings.keys[type]&&state)action(type);
});
window.addEventListener('keyup',e=>keys.delete(e.code));
function resetControls(){keys.clear();touch.x=touch.z=0;touch.jump=false;pointer.pressed=pointer.active=false;touchAim.active=stickAim.active=false;movePointer=flapPointer=throwPointer=null;}
window.addEventListener('blur',resetControls);
document.addEventListener('visibilitychange',()=>{if(document.hidden){resetControls();send({type:'input',seq:++seq,x:0,z:0,jump:false});}});
function bindTouch(){
  const pad=document.querySelector('.joystick');if(pad)pad.onpointerdown=e=>{e.preventDefault();movePointer=e.pointerId;moveRect=pad.getBoundingClientRect();updateTouchMove(e);};
  for(const b of document.querySelectorAll('[data-hold]'))b.onpointerdown=e=>{e.preventDefault();flapPointer=e.pointerId;touch.jump=true;tutorial.add('jump');};
  const throwButton=document.querySelector('[data-throw]');if(throwButton)throwButton.onpointerdown=e=>{e.preventDefault();throwPointer=e.pointerId;throwOrigin={x:e.clientX,y:e.clientY};touchAim.active=false;};
}
function updateTouchMove(e){const r=moveRect,x=(e.clientX-r.left-r.width/2)/(r.width*.35),y=(e.clientY-r.top-r.height/2)/(r.height*.35),l=Math.max(1,Math.hypot(x,y));touch.x=x/l;touch.z=y/l;const knob=document.querySelector('.joystick i');if(knob)knob.style.transform=`translate(${touch.x*24}px,${touch.z*24}px)`;}
window.addEventListener('pointermove',e=>{
  if(e.pointerId===movePointer)updateTouchMove(e);
  if(e.pointerId===throwPointer){const x=e.clientX-throwOrigin.x,z=e.clientY-throwOrigin.y,d=Math.hypot(x,z);if(d>8){touchAim.active=true;touchAim.aim=Math.atan2(z*.903-x*.43,x*.903+z*.43);touchAim.power=readPower(d/85);}}
  if(e.pointerType==='mouse'&&state?.phase==='playing'&&!modal&&!e.target.closest?.('button,input,.panel')){pointer.x=e.clientX;pointer.y=e.clientY;pointer.active=true;stickAim.active=false;}
});
window.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||state?.phase!=='playing'||modal||e.target.closest?.('button,input,.panel'))return;pointer.x=e.clientX;pointer.y=e.clientY;pointer.active=true;if(e.button===0){pointer.pressed=true;audio();}if(e.button===2){e.preventDefault();action('gust');}});
function releasePointer(e){
  if(e.pointerId===movePointer){movePointer=null;touch.x=touch.z=0;const knob=document.querySelector('.joystick i');if(knob)knob.style.transform='';}
  if(e.pointerId===flapPointer){flapPointer=null;touch.jump=false;}
  if(e.pointerId===throwPointer){throwPointer=null;if(e.type!=='pointercancel'&&!modal)action('throw',touchAim.active?{aim:touchAim.aim,power:touchAim.power}:undefined);touchAim.active=false;}
  if(e.pointerType==='mouse'&&e.button===0&&pointer.pressed){pointer.pressed=false;if(e.type!=='pointercancel'&&!modal)action('throw');}
}
window.addEventListener('pointerup',releasePointer);window.addEventListener('pointercancel',releasePointer);
window.addEventListener('contextmenu',e=>{if(state?.phase==='playing'&&!modal&&!e.target.closest?.('button,input,.panel'))e.preventDefault();});
function sampleAim(p){
  if(keys.has('ShiftLeft')||keys.has('ShiftRight'))return null;
  if(touchAim.active)return {aim:lookHeading(p,touchAim.aim),power:touchAim.power};
  const pad=navigator.getGamepads?.()[0],rx=pad?.axes[2]??0,rz=pad?.axes[3]??0;
  if(Math.hypot(rx,rz)>.2){stickAim.active=true;pointer.active=false;stickAim.aim=Math.atan2(rz*.903-rx*.43,rx*.903+rz*.43);stickAim.power=Math.min(1,Math.hypot(rx,rz));}
  if(pad&&stickAim.active)return {aim:lookHeading(p,stickAim.aim),power:stickAim.power};
  if(pointer.active)return view.aimAt(pointer.x,pointer.y,p,state);
  return null;
}
function sampleInput(){
  if(modal||document.hidden||connection!=='online'&&!solo)return emptyInput();
  let sx=(keys.has(settings.keys.right)||keys.has('ArrowRight')?1:0)-(keys.has(settings.keys.left)||keys.has('ArrowLeft')?1:0)+touch.x;
  let sz=(keys.has(settings.keys.down)||keys.has('ArrowDown')?1:0)-(keys.has(settings.keys.up)||keys.has('ArrowUp')?1:0)+touch.z;
  let jump=keys.has(settings.keys.jump)||touch.jump;
  const pad=navigator.getGamepads?.()[0];
  if(pad){sx+=Math.abs(pad.axes[0])>.15?pad.axes[0]:0;sz+=Math.abs(pad.axes[1])>.15?pad.axes[1]:0;jump||=pad.buttons[0]?.pressed;
    const mapping={2:'grab',1:'throw',3:'gust',5:'rotate',7:'throw',8:'rescue',9:'ping'};
    for(const [n,a]of Object.entries(mapping)){if(pad.buttons[n]?.pressed&&!lastPad[n]){if(a==='ping'){modal='ping';renderUI(true);}else action(a);}lastPad[n]=pad.buttons[n]?.pressed;}
  }
  const len=Math.max(1,Math.hypot(sx,sz));sx/=len;sz/=len;
  // Project screen-relative movement onto the fixed camera's horizontal axes.
  const p=predicted??state?.players.find(p=>p.id===id),aim=p?sampleAim(p):null;
  return {x:sx*.903+sz*.43,z:sz*.903-sx*.43,jump:!!jump,aim:aim?.aim??null,power:aim?.power??1};
}
function frame(now){
  const dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;Object.assign(input,sampleInput());
  if(state?.phase==='playing'){
    if(solo){
      const p=state.players[0];p.input=input;p.lastInput=state.t;accumulator+=dt;
      while(accumulator>=STEP){tick(state);accumulator-=STEP;}screen=state.phase;handleEvents();if(state.phase!=='playing')renderUI(true);
    }else{
      netAccum+=dt;
      if(netAccum>=1/30){netAccum=0;const msg={type:'input',seq:++seq,...input};send(msg);pending.push(msg);if(pending.length>30)pending.shift();}
      if(predicted)movePlayer(predicted,input,dt,isTrial(state)?{...state,t:state.t+Math.min(.15,now/1000-snapshotAt)}:state);
    }
    uiAccum+=dt;if(uiAccum>.15){uiAccum=0;renderUI();}
  }
  let visual=state;
  if(state&&!solo&&predicted)visual={...state,t:state.t+(isTrial(state)?Math.min(.1,now/1000-snapshotAt):0),players:state.players.map(p=>p.id===id?predicted:p)};
  view.render(visual,id,dt,now/1000);
  if(audioCtx&&settings.music>0&&now>nextMusic){nextMusic=now+3500;const v=settings.sfx;settings.sfx=settings.music*.35;tone([196,246.94,293.66,392][Math.floor(now/3500)%4],2,.1);settings.sfx=v;}
  requestAnimationFrame(frame);
}
setInterval(()=>{if(ws?.readyState===1)send({type:'ping',sent:performance.now()});},3000);
window.addEventListener('pagehide',()=>{voice.dispose();ws?.close();});
window.addEventListener('online',()=>{if(state&&!solo&&connection!=='online')connect(code);});
renderUI(true);requestAnimationFrame(frame);
const invite=new URLSearchParams(location.search).get('room');
if(invite){const clean=invite.toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6);if(sessionStorage.getItem('pp-ticket:'+clean))connect(clean);else{modal='join';renderUI(true);document.querySelector('#room-code').value=clean;}}
// Read-only diagnostics for browser verification; no production state mutation hook.
window.pigeonDiagnostics=()=>({phase:state?.phase,t:state?.t,startedAt:state?.startedAt,finishedAt:state?.finishedAt,code,id,solo,connection,players:state?.players.map(p=>({id:p.id,x:p.x,y:p.y,z:p.z,a:p.a,aim:p.aim,aimPower:p.aimPower,flapping:p.flapping,grip:p.grip,stamina:p.stamina,connected:p.connected,vx:p.vx,vy:p.vy,vz:p.vz,ground:p.ground,platformId:p.platformId,rescues:p.rescues,respawnUntil:p.respawnUntil,slot:p.slot})),cargo:state?.cargo,order:state?.order,completed:state?.completed,score:state?totalScore(state):0,voice:{enabled:voice.enabled,muted:voice.muted,tracks:voice.stream?.getTracks().map(t=>({readyState:t.readyState,enabled:t.enabled}))??[]},mode:state?.mode,course:state?.course,trial:state?.trial,art:'Living rooftop neighborhood',aimPreview:view.preview,animation:view.crew.get(id)?{headYaw:view.crew.get(id).head.rotation.y,wingSpread:view.crew.get(id).wings[0].shoulder.rotation.x,bodyScale:view.crew.get(id).body.scale.y,bodyYaw:view.crew.get(id).root.rotation.y,footPositions:view.crew.get(id).feet.map(f=>({x:f.position.x,y:f.position.y,z:f.position.z}))}:null,renderer:view.renderer.info.render,keys:{...settings.keys}});
