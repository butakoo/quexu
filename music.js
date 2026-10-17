// Original AABA pentatonic composition. Deterministic physical plucks and breathy flute.
export const MUSIC_BPM=84;
const BEAT=60/MUSIC_BPM;
const SCALE=[62,64,66,69,71,74,76,78,81];
const PHRASES=[
 [0,-1,2,4,2,-1,1,-1],[2,4,5,-1,4,2,1,-1],
 [1,-1,2,4,5,-1,4,2],[1,-1,0,-1,-1,1,0,-1],
 [4,-1,5,7,5,-1,4,2],[5,4,2,-1,1,2,4,-1],
 [2,1,0,-1,1,-1,2,4],[1,-1,0,-1,-1,-1,-1,-1],
 [5,-1,7,8,7,5,4,-1],[4,5,7,-1,5,4,2,-1],
 [4,-1,2,1,2,4,5,-1],[2,1,0,-1,-1,2,1,-1]
];
const ROOTS=[50,47,43,45],CHORDS=[[50,57,62],[47,54,59],[43,50,57],[45,52,59]];
const hz=m=>440*2**((m-69)/12);
export function musicEvents(bar){
 const section=Math.floor((bar%32)/8),phrase=PHRASES[(section===2?8:0)+bar% (section===2?4:8)],chord=CHORDS[Math.floor(bar/2)%4],events=[];
 phrase.forEach((n,j)=>{if(n>=0)events.push({midi:SCALE[n],at:j*.5,duration:j===7?1.4:j%3===0?1.25:.8,volume:section===2?.18:.15,instrument:section===1||section===3?'dizi':'guzheng'});});
 for(let j=0;j<8;j++)events.push({midi:chord[j%3]+(j%4===3?12:0),at:j*.5+.09,duration:1.4,volume:.045,instrument:'pipa'});
 events.push({midi:ROOTS[Math.floor(bar/2)%4]-12,at:0,duration:3.7,volume:.13,instrument:'bass'});
 events.push({midi:ROOTS[Math.floor(bar/2)%4]-5,at:2,duration:1.7,volume:.07,instrument:'bass'});
 if(bar%4===3)for(const [i,n]of [4,2,1].entries())events.push({midi:SCALE[n]+12,at:2.5+i*.45,duration:.7,volume:.04,instrument:'guzheng'});
 return events;
}
export function instrumentSamples(midi,seconds,rate,instrument='guzheng'){
 const data=new Float32Array(Math.ceil(seconds*rate)),f=hz(midi);let seed=(midi*97+instrument.length*7919)>>>0;
 const noise=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2147483648-1;};
 if(instrument==='guzheng'||instrument==='pipa'){
  const length=Math.max(2,Math.round(rate/f)),string=new Float32Array(length);for(let i=0;i<length;i++)string[i]=noise()*.55;
  const damp=instrument==='pipa'?.987:.996;
  for(let i=0;i<data.length;i++){const p=i%length,v=string[p];string[p]=(v+string[(p+1)%length])*.5*damp;const t=i/rate,attack=Math.min(1,t/.004),tail=Math.min(1,(seconds-t)/.045);data[i]=(v*.85+Math.sin(2*Math.PI*f*t)*Math.exp(-t*2.8)*.16+Math.sin(2*Math.PI*f*2.01*t)*Math.exp(-t*6)*.045)*attack*tail;}
 }else{
  for(let i=0;i<data.length;i++){const t=i/rate,attack=Math.min(1,t/(instrument==='dizi'?.09:.025)),tail=Math.min(1,(seconds-t)/.17),phase=2*Math.PI*f*t+(instrument==='dizi'?.012*Math.sin(2*Math.PI*5.2*t):0);data[i]=(Math.sin(phase)*.6+Math.sin(phase*2)*.17+Math.sin(phase*3)*.05+(instrument==='dizi'?noise()*.035:0))*attack*tail;}
 }
 return data;
}
export class TableMusic{
 constructor({contextFactory=()=>new(globalThis.AudioContext||globalThis.webkitAudioContext)(),timer=(fn,ms)=>setInterval(fn,ms),clearTimer=id=>clearInterval(id),enabled=true}={}){
  Object.assign(this,{contextFactory,timer,clearTimer,enabled});this.unlocked=false;this.hidden=false;this.ducked=false;this.ctx=null;this.interval=null;this.nodes=new Set();this.buffers=new Map();this.bar=0;this.nextBar=0;this.generation=0;this.starting=null;
 }
 get playing(){return this.interval!==null&&this.ctx?.state==='running'&&this.enabled&&!this.hidden;}
 get wanted(){return this.enabled&&!this.hidden&&this.unlocked;}
 unlock(){this.unlocked=true;return this.sync();}
 setEnabled(value){this.enabled=!!value;return this.sync();}
 setHidden(value){this.hidden=!!value;return this.sync();}
 setDucked(value){value=!!value;if(this.ducked===value)return;this.ducked=value;if(this.master&&this.ctx)this.master.gain.setTargetAtTime(value?.11:.23,this.ctx.currentTime,.25);}
 async sync(){
  if(!this.wanted){++this.generation;this.stop();if(this.ctx)await this.ctx.suspend().catch(()=>{});return false;}
  if(this.playing)return true;
  if(this.starting){await this.starting;return this.wanted&&!this.playing?this.sync():this.playing;}
  const token=++this.generation;
  this.starting=(async()=>{
   try{
    if(!this.ctx){this.ctx=this.contextFactory();this.master=this.ctx.createGain();this.master.gain.value=this.ducked?.11:.23;this.master.connect(this.ctx.destination);}
    await this.ctx.resume();if(token!==this.generation||!this.wanted)return false;
    if(this.interval===null){this.nextBar=this.ctx.currentTime+.08;this.interval=this.timer(()=>this.schedule(),100);this.schedule();}return true;
   }catch{this.stop();return false;}
  })();
  try{return await this.starting;}finally{this.starting=null;}
 }
 stop(){if(this.interval!==null){this.clearTimer(this.interval);this.interval=null;}for(const node of this.nodes){try{node.stop();node.disconnect();}catch{}}this.nodes.clear();this.nextBar=0;}
 voice(midi,start,duration,volume,instrument='guzheng'){
  const ctx=this.ctx,key=[midi,duration.toFixed(3),instrument,ctx.sampleRate].join(':'),source=ctx.createBufferSource(),gain=ctx.createGain();let buffer=this.buffers.get(key);
  if(!buffer){const samples=instrumentSamples(midi,duration,ctx.sampleRate,instrument);buffer=ctx.createBuffer(1,samples.length,ctx.sampleRate);buffer.getChannelData(0).set(samples);this.buffers.set(key,buffer);}
  source.buffer=buffer;gain.gain.value=volume;source.connect(gain);gain.connect(this.master);this.nodes.add(source);
  source.onended=()=>{this.nodes.delete(source);source.disconnect();gain.disconnect();};source.start(start);source.stop(start+duration+.025);
 }
 schedule(){
  if(!this.ctx||!this.wanted)return;
  if(this.nextBar<this.ctx.currentTime-.8)this.nextBar=this.ctx.currentTime+.04;
  while(this.nextBar<this.ctx.currentTime+.6){for(const event of musicEvents(this.bar++%32))this.voice(event.midi,this.nextBar+event.at*BEAT,event.duration*BEAT,event.volume,event.instrument);this.nextBar+=BEAT*4;}
 }
 async dispose(){this.enabled=false;++this.generation;this.stop();if(this.ctx)await this.ctx.close().catch(()=>{});this.buffers.clear();}
}
