import {effectsOf,dimensionName} from './special-tiles.js?v=0.28.2';
export const SHOP_REVEAL_TIMING=Object.freeze({durations:[1500,1000,700],strengths:[1.4,2,2.7]});
export function shopRevealLayers(tile){
 const out=[];if(tile.color)out.push({theme:effectsOf(tile,'color').length>1?'rainbow':tile.color,label:dimensionName(tile,'color')});if(tile.material)out.push({theme:tile.material==='star'?'star':effectsOf(tile,'material')[0],label:dimensionName(tile,'material')});if(tile.pattern)out.push({theme:'pattern',label:dimensionName(tile,'pattern'),face:effectsOf(tile,'pattern')[0]});
 return out.map((layer,index)=>({...layer,dimension:index+1,delay:SHOP_REVEAL_TIMING.durations.slice(0,index).reduce((a,b)=>a+b,0),duration:SHOP_REVEAL_TIMING.durations[index],strength:SHOP_REVEAL_TIMING.strengths[index]}));
}
const TONES={red:'#f08c70',green:'#98df9b',cyan:'#80e4f2',gold:'#ffdc78',jade:'#b8f5d0',crystal:'#dcafff',diamond:'#dcf5ff',pattern:'#91caca',rainbow:'#ffc4df',star:'#ffe2a4'};
export class ShopReveal{
 constructor({sound=()=>{},artwork=()=>'',reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches}={}){Object.assign(this,{sound,artwork,reduced});this.game=null;this.shop=null;this.seen=new Set();this.jobs=new Map();this.hidden=false;this.root=document.createElement('div');this.root.id='shop-reveal-root';this.root.setAttribute('aria-hidden','true');document.body.appendChild(this.root);}
 cancel(){for(const job of this.jobs.values()){for(const timer of job.timers)clearTimeout(timer);job.node?.remove();}this.jobs.clear();}
 setHidden(hidden){this.hidden=hidden;if(hidden)this.cancel();}
 sync(game){
  const shop=game.players[0].shop;if(game!==this.game||shop!==this.shop){this.cancel();if(game!==this.game)this.seen.clear();this.game=game;this.shop=shop;}
  if(this.hidden||game.phase!=='shop'){this.cancel();return;}
  for(const el of document.querySelectorAll('.offers .tool-offer[data-tool-shop-id]')){const key='tool:'+el.dataset.toolShopId;if(!this.seen.has(key)){this.seen.add(key);if(!this.reduced())el.classList.add('is-new-tool');this.sound('tool-find');}}
  const cards=[...document.querySelectorAll('.offers .offer[data-shop-uid]')],byId=new Map(cards.map(el=>[Number(el.dataset.shopUid),el]));
  for(const [uid,job]of this.jobs){if(!byId.has(uid)){job.timers.forEach(id=>clearTimeout(id));job.node?.remove();this.jobs.delete(uid);}else if(job.node)this.position(job.node,byId.get(uid));}
  for(const el of cards){const uid=Number(el.dataset.shopUid),tile=shop.find(t=>t?.uid===uid);if(!tile||this.seen.has(uid))continue;this.seen.add(uid);const layers=shopRevealLayers(tile);el.dataset.revealDimensions=String(layers.length);if(!layers.length)continue;
   if(this.reduced()){el.classList.add('offer-arrival-static');continue;}
   const job={timers:[],node:null};this.jobs.set(uid,job);
   for(const layer of layers)job.timers.push(setTimeout(()=>{
    if(this.jobs.get(uid)!==job||this.hidden)return;const card=document.querySelector('.offer[data-shop-uid="'+uid+'"]');if(!card)return;
    job.node?.remove();const node=document.createElement('div');node.className='shop-arrival arrival-'+layer.theme;node.dataset.dimension=layer.dimension;node.dataset.shopUid=String(uid);node.style.setProperty('--arrival-tone',TONES[layer.theme]);node.style.setProperty('--arrival-strength',layer.strength);node.style.setProperty('--arrival-pop',String(1+.045*layer.strength));node.style.setProperty('--arrival-sigil-pop',String(1+.17*layer.strength));node.style.setProperty('--arrival-ms',layer.duration+'ms');
    const particles=16+layer.dimension*6;
    node.innerHTML='<span class="arrival-flash"></span><span class="arrival-ring"></span><span class="arrival-halo"></span><span class="arrival-sigil">'+(layer.face?this.artwork(layer.face,'cyan'):'✦')+'</span><b>'+layer.label+(layers.length>1?' · '+layer.dimension+'/'+layers.length:'')+'</b>'+Array.from({length:particles},(_,i)=>'<i style="--angle:'+(i*360/particles)+'deg;--distance:'+(45+layer.dimension*19+(i%3)*12)+'px"></i>').join('');
    this.root.appendChild(node);job.node=node;this.position(node,card);this.sound('reveal',layer.dimension);
   },layer.delay));
   job.timers.push(setTimeout(()=>{if(this.jobs.get(uid)===job){job.node?.remove();this.jobs.delete(uid);}},layers.at(-1).delay+layers.at(-1).duration+60));
  }
 }
 position(node,card){const r=card.getBoundingClientRect();node.style.left=r.left+'px';node.style.top=r.top+'px';node.style.width=r.width+'px';node.style.height=r.height+'px';}
}
