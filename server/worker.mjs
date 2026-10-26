import {Room,newCode,allowedOrigin} from './room.mjs';
const cors=(origin)=>({'Access-Control-Allow-Origin':origin||'https://pigeon-problems.smoky-harp-3438.chatgpt.site','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin','Cache-Control':'no-store'});
export default {
  async fetch(request,env){
    const origin=request.headers.get('Origin');if(!allowedOrigin(origin,env.CLIENT_ORIGIN))return new Response('Unknown dispatch office',{status:403});
    const url=new URL(request.url),headers=cors(origin);
    if(request.method==='OPTIONS')return new Response(null,{headers});
    if(url.pathname==='/api/health')return Response.json({ok:true,transport:'websocket',engine:60},{headers});
    if(url.pathname==='/api/rooms'&&request.method==='POST'){
      // A per-IP DO provides creation throttling across isolates, without database polling.
      const limiter=env.ROOMS.get(env.ROOMS.idFromName('limit:'+request.headers.get('CF-Connecting-IP')));
      const permitted=await limiter.fetch('https://room/limit',{method:'POST'});if(permitted.status!==200)return new Response('Dispatch is busy. Try in a minute.',{status:429,headers});
      const code=newCode(),room=env.ROOMS.get(env.ROOMS.idFromName(code));
      await room.fetch('https://room/init',{method:'POST',body:JSON.stringify({code})});return Response.json({code},{status:201,headers});
    }
    if(url.pathname==='/ws'&&request.headers.get('Upgrade')?.toLowerCase()==='websocket'){
      const code=url.searchParams.get('room');if(!/^[A-Z2-9]{6}$/.test(code??''))return new Response('Invalid crew code',{status:400});
      return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(request);
    }
    return new Response('Pigeon Problems real-time service',{status:404,headers});
  }
};
export class PigeonRoom {
  constructor(ctx,env){
    this.ctx=ctx;this.env=env;this.room=null;this.timer=null;this.steps=0;this.limits={t:Date.now(),n:0};
    ctx.blockConcurrencyWhile(async()=>{const saved=await ctx.storage.get('room');if(saved)this.room=new Room(saved.s.code,saved.s.mode,saved);});
  }
  async fetch(request){
    const url=new URL(request.url);
    if(url.pathname==='/limit'){
      if(Date.now()-this.limits.t>60000)this.limits={t:Date.now(),n:0};return new Response('',{status:++this.limits.n<=15?200:429});
    }
    if(url.pathname==='/init'){
      if(this.room)return new Response('Collision',{status:409});
      const {code}=await request.json();this.room=new Room(code);await this.ctx.storage.put('room',this.room.save());return new Response('Ready');
    }
    if(!this.room)return new Response('Crew not found. Check the six-letter code.',{status:404});
    if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});
    const pair=new WebSocketPair(),[client,server]=Object.values(pair);server.accept();let id;
    const timeout=setTimeout(()=>{if(!id)server.close(4000,'Join timeout');},5000);
    server.addEventListener('message',event=>{
      try{
        if(typeof event.data!=='string'||event.data.length>20000){server.close(4009,'Message too large');return;}
        const msg=JSON.parse(event.data);
        if(!id){id=this.room.join(server,msg);clearTimeout(timeout);this.run();}
        else this.room.message(id,server,msg);
      }catch(e){this.room.send(server,{type:'error',message:e.message});if(!id)server.close(4003,'Join rejected');}
    });
    const close=()=>{clearTimeout(timeout);if(id)this.room.close(id,server);if(!this.room.sockets.size){clearInterval(this.timer);this.timer=null;this.ctx.waitUntil(this.ctx.storage.put('room',this.room.save()));}};
    server.addEventListener('close',close);server.addEventListener('error',close);
    return new Response(null,{status:101,webSocket:client});
  }
  run(){if(this.timer)return;this.room.lastFrame=performance.now();this.timer=setInterval(()=>{this.room.advance();if(++this.steps%300===0)this.ctx.waitUntil(this.ctx.storage.put('room',this.room.save()));},1000/60);}
}
