import http from 'node:http';
import {WebSocketServer} from 'ws';
import {createServer as createViteServer} from 'vite';
import {Room,newCode,allowedOrigin} from './room.mjs';
const port=Number(process.env.PORT||5173),rooms=new Map(),rate=new Map();
const vite=await createViteServer({server:{middlewareMode:true},appType:'spa'});
const server=http.createServer(async(req,res)=>{
  if(req.url==='/api/health'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({ok:true,transport:'websocket',engine:60}));return;}
  if(req.url==='/api/rooms'&&req.method==='POST'){
    if(!allowedOrigin(req.headers.origin)){res.writeHead(403);res.end();return;}
    const ip=req.socket.remoteAddress,b=rate.get(ip)??{t:Date.now(),n:0};if(Date.now()-b.t>60000){b.n=0;b.t=Date.now();}rate.set(ip,b);
    if(++b.n>30||rooms.size>100){res.writeHead(429);res.end('{"error":"Dispatch is busy. Try again in a minute."}');return;}
    let code;do{code=newCode();}while(rooms.has(code));rooms.set(code,new Room(code));
    res.writeHead(201,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({code}));return;
  }
  vite.middlewares(req,res);
});
const wss=new WebSocketServer({noServer:true,maxPayload:20000});
server.on('upgrade',(req,socket,head)=>{
  const code=new URL(req.url,'http://localhost').searchParams.get('room');
  if(!req.url.startsWith('/ws?'))return; // Vite owns its HMR endpoint.
  if(!allowedOrigin(req.headers.origin)||!rooms.has(code)){socket.end('HTTP/1.1 404 Not Found\r\n\r\n');return;}
  wss.handleUpgrade(req,socket,head,ws=>{
    const room=rooms.get(code);let id;
    const timer=setTimeout(()=>{if(!id)ws.close(4000,'Join timeout');},5000);
    ws.on('message',raw=>{try{const msg=JSON.parse(raw);if(!id){id=room.join(ws,msg);clearTimeout(timer);}else room.message(id,ws,msg);}catch(e){ws.send(JSON.stringify({type:'error',message:e.message}));if(!id)ws.close(4003,'Join rejected');}});
    ws.on('close',()=>{clearTimeout(timer);if(id)room.close(id,ws);});
  });
});
setInterval(()=>{for(const room of rooms.values())if(room.sockets.size)room.advance();},1000/60);
setInterval(()=>{for(const [code,room] of rooms)if(!room.sockets.size&&[...room.sessions.values()].every(s=>Date.now()-s.seen>15*60000))rooms.delete(code);},60000).unref();
server.listen(port,'0.0.0.0',()=>console.log(`Pigeon Problems: http://127.0.0.1:${port} (authoritative WebSocket server)`));
