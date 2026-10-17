// Short original sound motifs, scheduled against the same pause/speed clock as scoring.
const MOTIFS={orphans:[38,62,74,86],winds:[69,76,81,88],dragons:[48,55,60,72],honors:[57,62,69],wild:[72,79,72,84],chicken:[79,86,82],dora:[81,88,93,100],jade:[45,57,64,69],diamond:[86,93,98,105],grand:[48,60,67,79]};
const hz=n=>440*2**((n-69)/12);
export class FeedbackAudio{
 constructor({contextFactory=()=>new(globalThis.AudioContext||globalThis.webkitAudioContext)()}={}){this.contextFactory=contextFactory;this.ctx=null;this.nodes=new Set();this.sequence=0;}
 async unlock(){try{this.ensureContext();if(this.ctx.state!=='running')await this.ctx.resume();return true;}catch{return false;}}
 ensureContext(){if(!this.ctx){this.ctx=this.contextFactory();this.compressor=this.ctx.createDynamicsCompressor();Object.assign(this.compressor.threshold,{value:-16});this.compressor.knee.value=18;this.compressor.ratio.value=8;this.compressor.attack.value=.003;this.compressor.release.value=.18;this.compressor.connect(this.ctx.destination);}}
 stopVoices(){for(const node of this.nodes){try{node.stop();node.disconnect();}catch{}}this.nodes.clear();}
 cancel(){this.sequence++;this.stopVoices();}
 async play(profile,{clock,alive=()=>true,muted=()=>false,rate=1,phase='impact'}={}){
  if(muted()||!alive())return;this.cancel();const seq=this.sequence;
  try{
   this.ensureContext();
   await this.ctx.resume();const valid=()=>seq===this.sequence&&alive()&&!muted();
   const notes=profile.level===1?MOTIFS[profile.theme].slice(0,1):phase==='name'?MOTIFS[profile.theme].slice(-2):MOTIFS[profile.theme];
   for(let i=0;i<notes.length;i++){
    if(!valid())return;if(clock?.paused&&!await clock.wait(1,{rate,alive:valid}))return;
    const speed=(clock?.speed||1)*rate,volume=(phase==='name'?.035:.065)+profile.level*.012;
    this.note(notes[i],Math.max(.055,.19/speed),volume,profile.theme,i);
    if(phase==='impact'&&i===0&&profile.level>=2){this.noise(profile.theme,Math.max(.04,.14/speed),.022+profile.level*.008);this.note(['diamond','dora','wild'].includes(profile.theme)?45:33,.22/speed,.095+profile.level*.012,'bass',0);}
    if(i<notes.length-1&&clock&&!await clock.wait(phase==='name'?130:85,{rate,alive:valid}))return;
   }
  }catch{/* Audio may be unavailable; report playback must remain usable. */}
 }
 noise(theme,duration,volume){
  const ctx=this.ctx,time=ctx.currentTime,buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);
  let seed=97;for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;data[i]=(seed/2147483648-1)*(1-i/data.length);}
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;filter.type=theme==='diamond'?'highpass':theme==='winds'?'bandpass':'lowpass';filter.frequency.value=theme==='diamond'?3200:theme==='winds'?1200:650;filter.Q.value=.7;gain.gain.setValueAtTime(volume,time);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);source.connect(filter);filter.connect(gain);gain.connect(this.compressor);this.nodes.add(source);source.onended=()=>{this.nodes.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};source.start(time);source.stop(time+duration+.01);
 }
 note(midi,duration,volume,theme,index){
  const ctx=this.ctx,time=ctx.currentTime,osc=ctx.createOscillator(),gain=ctx.createGain(),pan=ctx.createStereoPanner();osc.type=['diamond','dora','winds'].includes(theme)?'sine':theme==='dragons'||theme==='honors'?'triangle':'sine';
  const pitch=hz(midi);osc.frequency.setValueAtTime(theme==='chicken'?pitch*.65:pitch,time);if(theme==='chicken'||theme==='wild')osc.frequency.exponentialRampToValueAtTime(pitch*(theme==='chicken'?1.35:1.1),time+duration*.6);if(theme==='bass')osc.frequency.exponentialRampToValueAtTime(35,time+duration);
  pan.pan.value=theme==='winds'?[-.8,-.25,.25,.8][index%4]:theme==='wild'?(index%2?.5:-.5):0;
  gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(Math.min(.15,volume),time+.006);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  osc.connect(gain);gain.connect(pan);pan.connect(this.compressor);this.nodes.add(osc);osc.onended=()=>{this.nodes.delete(osc);osc.disconnect();gain.disconnect();pan.disconnect();};osc.start(time);osc.stop(time+duration+.01);
 }
}
