import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Voice} from '../src/voice.mjs';
async function environment(run){
  const nav=Object.getOwnPropertyDescriptor(globalThis,'navigator'),storage=globalThis.sessionStorage,values=new Map();
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{}}});globalThis.sessionStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  try{await run();}finally{if(nav)Object.defineProperty(globalThis,'navigator',nav);else delete globalThis.navigator;if(storage)globalThis.sessionStorage=storage;else delete globalThis.sessionStorage;}
}
const microphone=()=>{const track={enabled:true,stopped:false,stop(){this.stopped=true;}};return {track,getTracks:()=>[track],getAudioTracks:()=>[track]};};
test('leaving while microphone permission is pending stops the late stream',()=>environment(async()=>{
  let resolve;const stream=microphone(),messages=[];navigator.mediaDevices.getUserMedia=()=>new Promise(r=>resolve=r);const voice=new Voice(()=>{},m=>messages.push(m)),request=voice.enable();voice.dispose();resolve(stream);await request;
  assert(stream.track.stopped);assert(!voice.enabled);assert.equal(voice.stream,null);assert.equal(messages.length,0);
}));
test('repeated voice clicks create only one permission request and one stream',()=>environment(async()=>{
  let resolve,calls=0;const stream=microphone(),permission=new Promise(r=>resolve=r);navigator.mediaDevices.getUserMedia=()=>{calls++;return permission;};const voice=new Voice(()=>{},()=>{}),first=voice.enable(),second=voice.enable();resolve(stream);await Promise.all([first,second]);
  assert.equal(calls,1);assert(voice.enabled);assert.equal(stream.track.enabled,false);voice.dispose();assert(stream.track.stopped);
}));
test('denied microphone permission preserves pings and allows a later retry',()=>environment(async()=>{
  const messages=[],voice=new Voice(()=>{},m=>messages.push(m));navigator.mediaDevices.getUserMedia=async()=>{throw Error('Permission denied');};await voice.enable();assert(!voice.enabled);assert.match(messages[0],/pings/);
  const stream=microphone();navigator.mediaDevices.getUserMedia=async()=>stream;await voice.enable();assert(voice.enabled);voice.dispose();
}));
