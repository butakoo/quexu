// 道具已由Game一次性结算并保存；此模块只播放冻结的前后牌面。
export class ToolEffects{
 constructor({face,sound=()=>{},reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches}={}){Object.assign(this,{face,sound,reduced});this.job=null;}
 cancel(){const job=this.job;if(!job)return;this.job=null;for(const timer of job.timers)clearTimeout(timer);job.root.remove();job.resolve();}
 play(plan,origins){
  this.cancel();return new Promise(resolve=>{
   const root=document.createElement('div');root.className='tool-effect tool-effect-'+plan.kind;root.setAttribute('role','status');root.setAttribute('aria-label','使用道具'+({wipe:'抹',enchant:'附',fuse:'融'}[plan.kind]));
   const targets=plan.after.map(t=>({tile:t,rect:document.querySelector('.pending-discard-tiles .tile-button[data-uid="'+t.uid+'"] .tile-face')?.getBoundingClientRect()})).filter(t=>t.rect);
   const destination=targets[0]?.rect||origins[0]?.rect||{left:innerWidth/2,top:innerHeight*.7,width:34,height:48},cx=destination.left+destination.width/2,cy=destination.top+destination.height/2;
   root.style.setProperty('--tool-x',cx+'px');root.style.setProperty('--tool-y',cy+'px');
   root.innerHTML='<div class="tool-wind"></div><div class="tool-burst"></div><b class="tool-sigil">'+({wipe:'抹',enchant:'附',fuse:'融'}[plan.kind])+'</b><div class="tool-sparks">'+Array.from({length:24},(_,i)=>'<i style="--angle:'+i*15+'deg;--distance:'+(40+(i%4)*22)+'px"></i>').join('')+'</div>';
   const job={root,timers:[],resolve};this.job=job;
   const add=(tile,rect,after=false,index=0)=>{const node=document.createElement('span');node.className=after?'tool-result':'tool-ghost';node.style.cssText='left:'+rect.left+'px;top:'+rect.top+'px;width:'+rect.width+'px;height:'+rect.height+'px;--dx:'+(cx-rect.left-rect.width/2)+'px;--dy:'+(cy-rect.top-rect.height/2)+'px;--turn:'+((index%2?-1:1)*(360+index*90))+'deg;--delay:'+(index%5*25)+'ms';node.innerHTML=this.face(tile);root.appendChild(node);};
   plan.before.forEach((t,i)=>{const rect=origins.find(o=>o.uid===t.uid)?.rect;if(rect)add(t,rect,false,i);});document.body.appendChild(root);
   const reduced=this.reduced();if(reduced)root.classList.add('tool-reduced');
   this.sound('tool-'+plan.kind);
   const hit=reduced?100:plan.kind==='wipe'?650:plan.kind==='enchant'?750:1050,total=reduced?280:plan.kind==='wipe'?1450:plan.kind==='enchant'?1550:1950;
   job.timers.push(setTimeout(()=>{if(this.job!==job)return;root.classList.add('tool-hit');for(const n of root.querySelectorAll('.tool-ghost'))n.remove();for(const target of targets)add(target.tile,target.rect,true);this.sound('tool-'+plan.kind+'-hit');},hit));
   job.timers.push(setTimeout(()=>{if(this.job===job)this.cancel();},total));
  });
 }
}
