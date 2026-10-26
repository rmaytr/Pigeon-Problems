import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import {mkdir} from 'node:fs/promises';
import net from 'node:net';

const mode=process.argv[2],port=Number(process.env.PORT||5173);
if(!['integration','ui'].includes(mode))throw Error('Use: node scripts/verify.mjs integration|ui');
if(!Number.isInteger(port)||port<1024||port>45535)throw Error('PORT must be 1024–45535 (HMR uses PORT + 20000).');
const base=`http://127.0.0.1:${port}`;
const env={...process.env,PORT:String(port),CLIENT_URL:base,TEST_URL:base,NO_REPORT:'1',BROWSER_CHANNEL:process.env.BROWSER_CHANNEL||'chromium'};
// Never silently test a server belonging to another process or another project.
await new Promise((resolve,reject)=>{const probe=net.createServer();probe.once('error',reject);probe.listen(port,'0.0.0.0',()=>probe.close(resolve));});
await mkdir('evidence',{recursive:true});
const server=spawn(process.execPath,['server/local.mjs'],{env,stdio:'inherit'});
const exited=once(server,'exit');
const stop=()=>{if(server.exitCode===null)server.kill();};
process.once('SIGINT',stop);process.once('SIGTERM',stop);
try{
  let healthy=false;
  for(let i=0;i<100;i++){
    if(server.exitCode!==null)throw Error('Local verification server exited before readiness.');
    try{const r=await fetch(base+'/api/health',{signal:AbortSignal.timeout(500)});healthy=r.ok&&(await r.json()).engine===60;}catch{}
    if(healthy)break;await delay(200);
  }
  if(!healthy)throw Error('Local verification server did not become healthy.');
  const suites=mode==='integration'?['network','aim-network','latency']:['browser','art-browser','trials-ui-browser','release-browser'];
  for(const suite of suites){
    console.log(`\nRunning ${suite} against ${base}`);
    const child=spawn(process.execPath,[`tests/${suite}.mjs`],{env,stdio:'inherit'});
    const [code,signal]=await once(child,'exit');
    if(code!==0)throw Error(`${suite} failed (${code??signal}).`);
  }
  console.log(`\nPASS ${mode}: all ${suites.length} suites completed against the isolated local server.`);
}finally{
  stop();await exited;
  process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);
}
