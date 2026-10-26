import {makeState,addPlayer,disconnect,setInput,act,tick,snapshot,emptyInput} from '../src/engine.mjs';
export const newToken=()=>crypto.randomUUID()+crypto.randomUUID();
export const newCode=()=>Array.from(crypto.getRandomValues(new Uint8Array(6)),v=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[v%32]).join('');
export class Room {
  constructor(code,mode='shift',saved=null){
    this.s=saved?.s??makeState(code,mode);this.sessions=new Map(saved?.sessions??[]);this.sockets=new Map();this.buckets=new Map();this.actions=new Map();
    for(const p of this.s.players){p.connected=false;p.input=emptyInput();p.cooldowns??={};p.grip=null;}
    if(saved)this.s.host=null;
  }
  send(socket,data){try{socket.send(JSON.stringify(data));}catch{}}
  join(socket,msg){
    if(!msg||msg.type!=='join')throw Error('Introduce your pigeon first.');
    let id,token=msg.token;
    if(token){
      id=[...this.sessions].find(([,v])=>v.token===token)?.[0];
      if(!id)throw Error('That return ticket expired. Join again as a new pigeon.');
      const old=this.sockets.get(id);if(old&&old!==socket){this.send(old,{type:'replaced'});old.close(4001,'Reconnected elsewhere');}
    }else{
      this.expire();id=crypto.randomUUID();token=newToken();
      addPlayer(this.s,id,msg.name);this.sessions.set(id,{token,seen:Date.now()});
    }
    const p=this.s.players.find(p=>p.id===id);if(!p)throw Error('Your return ticket has expired.');
    p.connected=true;p.lastInput=this.s.t;p.input=emptyInput();if(!this.s.host)this.s.host=id;
    this.sockets.set(id,socket);this.actions.set(id,0);this.sessions.get(id).seen=Date.now();
    this.send(socket,{type:'welcome',id,token,seq:p.seq,state:snapshot(this.s)});
    this.broadcast();return id;
  }
  message(id,socket,msg){
    if(this.sockets.get(id)!==socket)return;
    const now=Date.now(),b=this.buckets.get(id)??{t:now,n:0};
    if(now-b.t>1000){b.t=now;b.n=0;}this.buckets.set(id,b);if(++b.n>75){socket.close(4008,'Too many messages');return;}
    const p=this.s.players.find(p=>p.id===id);if(!p)return;
    this.sessions.get(id).seen=now;
    if(msg.type==='input')setInput(this.s,p,msg);
    else if(msg.type==='action'&&Number.isSafeInteger(msg.n)&&msg.n>(this.actions.get(id)??0)){
      this.actions.set(id,msg.n);act(this.s,p,msg.action,msg.value);
    }else if(msg.type==='signal'){
      // Signaling only; SDP/ICE never changes simulation or score.
      if(typeof msg.to==='string'&&JSON.stringify(msg.data).length<16000){const target=this.sockets.get(msg.to);if(target)this.send(target,{type:'signal',from:id,data:msg.data});}
    }else if(msg.type==='leave'){disconnect(this.s,id,true);this.sessions.delete(id);this.sockets.delete(id);socket.close(1000,'Off duty');this.broadcast();}
    else if(msg.type==='ping')this.send(socket,{type:'pong',sent:msg.sent});
  }
  close(id,socket){if(this.sockets.get(id)!==socket)return;this.sockets.delete(id);disconnect(this.s,id);const session=this.sessions.get(id);if(session)session.seen=Date.now();this.broadcast();}
  expire(){for(const [id,v] of this.sessions)if(!this.sockets.has(id)&&Date.now()-v.seen>120000){disconnect(this.s,id,true);this.sessions.delete(id);}}
  step(){tick(this.s);if(this.s.tick%3===0)this.broadcast();if(this.s.tick%600===0)this.expire();}
  advance(){const now=performance.now();this.accumulator=(this.accumulator??0)+Math.min(.1,(now-(this.lastFrame??now))/1000);this.lastFrame=now;while(this.accumulator>=1/60){this.step();this.accumulator-=1/60;}}
  broadcast(){const state=snapshot(this.s);for(const socket of this.sockets.values())this.send(socket,{type:'state',state});}
  save(){return {s:this.s,sessions:[...this.sessions]};}
}
export function allowedOrigin(origin,extra=''){
  return !origin||origin==='https://pigeon-problems.smoky-harp-3438.chatgpt.site'||/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)||origin===extra;
}
