// One unlocked context for table and basic scoring sounds; independent from music.
export class TableAudio{
 constructor({contextFactory=()=>new(globalThis.AudioContext||globalThis.webkitAudioContext)(),enabled=true}={}){Object.assign(this,{contextFactory,enabled});this.ctx=null;this.unlocked=false;this.hidden=false;this.nodes=new Set();this.starting=null;}
 async unlock(){
  this.unlocked=true;if(!this.enabled||this.hidden)return false;
  if(this.ctx?.state==='running')return true;if(this.starting)return this.starting;
  if(!this.ctx){this.ctx=this.contextFactory();this.output=this.ctx.createDynamicsCompressor();this.output.threshold.value=-14;this.output.ratio.value=5;this.output.connect(this.ctx.destination);}
  this.starting=this.ctx.resume().then(()=>true).catch(()=>false);try{return await this.starting;}finally{this.starting=null;}
 }
 setEnabled(value){this.enabled=!!value;if(!this.enabled)this.stop();}
 async setHidden(value){this.hidden=!!value;if(value){this.stop();await this.ctx?.suspend().catch(()=>{});}else if(this.unlocked)await this.unlock();}
 stop(category=null){for(const node of [...this.nodes])if(!category||node.category===category){try{node.stop();node.disconnect();}catch{}this.nodes.delete(node);}}
 track(node,tail,category){node.category=category;this.nodes.add(node);node.onended=()=>{this.nodes.delete(node);node.disconnect();for(const n of tail)n.disconnect();};}
 async play(kind='pick',step=1){
  if(kind.startsWith('tool-'))return this.playTool(kind);
  if(!this.enabled||this.hidden||!this.unlocked)return false;
  try{if(!await this.unlock()||!this.enabled||this.hidden)return false;const ctx=this.ctx,now=ctx.currentTime,score=kind.startsWith('score'),category=score?'score':'table';
   const pitch=kind==='discard'?165:kind==='plan'?380:kind==='slide'?280:kind==='call'?520:kind==='reveal'?620+step*100:score?240+Math.min(12,step)*45:kind==='buy'?720:440;
   const length=kind==='discard'?.17:kind==='reveal'?.2-.04*step:score?.2:.11,o=ctx.createOscillator(),gain=ctx.createGain();o.type=score||kind==='reveal'?'sine':'triangle';o.frequency.setValueAtTime(pitch,now);o.frequency.exponentialRampToValueAtTime(kind==='discard'?65:kind==='score-final'?920:pitch*.6,now+length);gain.gain.setValueAtTime(kind==='discard'?.085:kind==='reveal'?.025+.012*step:score?.055:.035,now);gain.gain.exponentialRampToValueAtTime(.0001,now+length);o.connect(gain);gain.connect(this.output);this.track(o,[gain],category);o.start(now);o.stop(now+length+.01);
   if(['discard','pick','plan','slide'].includes(kind)){const length=kind==='discard'?.05:.025,buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*length),ctx.sampleRate),samples=buffer.getChannelData(0);let seed=77;for(let i=0;i<samples.length;i++){seed=(seed*1664525+1013904223)>>>0;samples[i]=(seed/2147483648-1)*Math.exp(-i/(ctx.sampleRate*.007));}const click=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain();click.buffer=buffer;filter.type='highpass';filter.frequency.value=kind==='discard'?1300:2300;g.gain.value=kind==='discard'?.11:.035;click.connect(filter);filter.connect(g);g.connect(this.output);this.track(click,[filter,g],category);click.start(now);click.stop(now+length+.01);}
   return true;
  }catch{return false;}
 }
 async playTool(kind){
  if(!this.enabled||this.hidden||!this.unlocked)return false;
  try{if(!await this.unlock()||!this.enabled||this.hidden)return false;const ctx=this.ctx,now=ctx.currentTime,hit=kind.endsWith('-hit'),fuse=kind.includes('fuse'),wipe=kind.includes('wipe');
   const notes=wipe?[392,587]:fuse?(hit?[98,196,392,784]:[110,165,220]):hit?[587,880,1174,1760]:[440,660];
   notes.forEach((hz,i)=>{const start=now+i*(hit?.025:.065),length=hit?.5:fuse?.85:.5,o=ctx.createOscillator(),g=ctx.createGain();o.type=fuse&&!hit?'triangle':'sine';o.frequency.setValueAtTime(hz,start);o.frequency.exponentialRampToValueAtTime(fuse&&!hit?hz*3:hz*.98,start+length);g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(fuse&&hit?.045:.025,start+.025);g.gain.exponentialRampToValueAtTime(.0001,start+length);o.connect(g);g.connect(this.output);this.track(o,[g],'tool');o.start(start);o.stop(start+length+.01);});
   if(wipe||fuse&&hit){const length=wipe?.7:.32,buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*length),ctx.sampleRate),data=buffer.getChannelData(0);let seed=1927;for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;data[i]=(seed/2147483648-1)*Math.sin(Math.PI*i/data.length);}
    const n=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();n.buffer=buffer;filter.type='lowpass';filter.frequency.value=wipe?1900:800;gain.gain.value=wipe?.07:.11;n.connect(filter);filter.connect(gain);gain.connect(this.output);this.track(n,[filter,gain],'tool');n.start(now);n.stop(now+length+.01);
   }return true;
  }catch{return false;}
 }
}
