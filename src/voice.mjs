export class Voice {
  constructor(send,notify){this.send=send;this.notify=notify;this.peers=new Map();this.enabled=false;this.enabling=false;this.generation=0;this.id=null;this.players=[];this.volume=.8;this.muted=sessionStorage.getItem('pp-mic-muted')!=='false';this.individual=new Set();}
  async enable(){
    if(this.enabled||this.enabling)return;
    const generation=this.generation;this.enabling=true;
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
      if(generation!==this.generation){for(const t of stream.getTracks())t.stop();return;}
      this.stream=stream;
      this.enabled=true;for(const t of this.stream.getAudioTracks())t.enabled=!this.muted;
      this.sync(this.players,this.id);for(const p of this.players)if(p.id!==this.id&&p.connected)this.send(p.id,{ready:true});
      this.notify('Voice connected. '+(this.muted?'Your microphone is muted.':'Microphone on.'));
    }catch{if(generation===this.generation)this.notify('Microphone unavailable. Allow microphone access, or keep using pings.');}
    finally{if(generation===this.generation)this.enabling=false;}
  }
  sync(players,id){
    this.players=players;this.id=id;
    const active=new Set(players.filter(p=>p.connected).map(p=>p.id));
    for(const [peer,v]of this.peers)if(!active.has(peer)){v.pc.close();v.audio.remove();this.peers.delete(peer);}
  }
  peer(id){
    if(this.peers.has(id))return this.peers.get(id);
    const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]}),audio=document.createElement('audio');audio.autoplay=true;audio.volume=this.volume;audio.muted=this.individual.has(id);document.body.append(audio);
    const v={pc,audio,ice:[],makingOffer:false,ignoreOffer:false};this.peers.set(id,v);
    for(const t of this.stream.getTracks())pc.addTrack(t,this.stream);
    pc.ontrack=e=>{audio.srcObject=e.streams[0];audio.play().catch(()=>{});};
    pc.onicecandidate=e=>{if(e.candidate)this.send(id,{candidate:e.candidate.toJSON()});};
    pc.onconnectionstatechange=()=>{if(pc.connectionState==='failed')this.notify('A direct voice link could not connect. Pings still work; no relay service is configured.');};
    pc.onnegotiationneeded=async()=>{try{v.makingOffer=true;await pc.setLocalDescription();this.send(id,{description:pc.localDescription});}catch{}finally{v.makingOffer=false;}};
    return v;
  }
  async signal(id,data){
    if(!this.enabled||!this.players.some(p=>p.id===id&&p.connected))return;
    const v=this.peer(id),pc=v.pc;
    try{
      if(data.description){
        const collision=data.description.type==='offer'&&(v.makingOffer||pc.signalingState!=='stable');
        v.ignoreOffer=this.id<id&&collision;if(v.ignoreOffer)return;
        await pc.setRemoteDescription(data.description);
        for(const c of v.ice)await pc.addIceCandidate(c);v.ice=[];
        if(data.description.type==='offer'){await pc.setLocalDescription();this.send(id,{description:pc.localDescription});}
      }else if(data.candidate){if(pc.remoteDescription)await pc.addIceCandidate(data.candidate);else v.ice.push(data.candidate);}
    }catch{if(!v.ignoreOffer)this.notify('Voice is reconnecting. Use pings while it settles.');}
  }
  toggle(){this.muted=!this.muted;sessionStorage.setItem('pp-mic-muted',String(this.muted));for(const t of this.stream?.getTracks()??[])t.enabled=!this.muted;}
  mutePeer(id){if(this.individual.has(id))this.individual.delete(id);else this.individual.add(id);const v=this.peers.get(id);if(v)v.audio.muted=this.individual.has(id);}
  setVolume(v){this.volume=v;for(const p of this.peers.values())p.audio.volume=v;}
  dispose(){this.generation++;this.enabling=false;for(const t of this.stream?.getTracks()??[])t.stop();for(const v of this.peers.values()){v.pc.close();v.audio.remove();}this.peers.clear();this.stream=null;this.enabled=false;this.players=[];this.id=null;}
}
