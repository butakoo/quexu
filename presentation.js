import {TYPES,info,identities,copyLeft,arrangeShowcase,traitComponents} from './game.js?v=0.16.0';

export const PRESENTATION_TIMING=Object.freeze({intro:650,recode:650,name:600,impact:360,applied:300,add:560,final:850});
export const seatPlaybackRate=seat=>seat===0?1:1.2;
const rank=face=>TYPES.findIndex(t=>t.id===face);
const bitCount=n=>{let count=0;while(n){n&=n-1;count++;}return count;};
const resolvedTiles=r=>{const copies=new Map((r.wildCopies||copyLeft(r.tiles).wildCopies).map(c=>[c.uid,c.face]));return r.tiles.map(t=>({...t,face:copies.get(t.uid)||t.face}));};

// Layouts contain physical IDs exactly once; all identities are presentation
// metadata. Never reorder a saved hand or resolve wilds again after moving it.
function finishLayout(r,groups,components){
 const used=new Set(),byUid=new Map(r.tiles.map(t=>[t.uid,t])),resolved=new Map(resolvedTiles(r).map(t=>[t.uid,t]));
 const result=[];for(const group of groups){const uids=group.uids.filter(uid=>byUid.has(uid)&&!used.has(uid));if(!uids.length)continue;uids.forEach(uid=>used.add(uid));result.push({...group,uids,valid:true});}
 const leftovers=components.filter(uid=>byUid.has(uid)&&!used.has(uid)).sort((a,b)=>rank(resolved.get(a).face)-rank(resolved.get(b).face)||a-b);
 if(leftovers.length){leftovers.forEach(uid=>used.add(uid));result.push({kind:'组件',uids:leftovers,valid:true});}
 const spare=r.tiles.filter(t=>!used.has(t.uid)).map(t=>t.uid).sort((a,b)=>rank(resolved.get(a).face)-rank(resolved.get(b).face)||a-b);
 if(spare.length)result.push({kind:'未参与',uids:spare,valid:false});return result;
}
export function baseLayout(r){
 const valid=new Set((r.groups||[]).flatMap(g=>g.uids));return arrangeShowcase(r.tiles,r).map(g=>({kind:g.kind,uids:g.tiles.map(t=>t.uid),valid:g.tiles.some(t=>valid.has(t.uid))}));
}
function candidates(tiles,faces,kind){
 const found=new Map();function visit(i,mask,uids,assigned){if(i===faces.length){if(!found.has(mask))found.set(mask,{mask,uids,assigned,kind});return;}for(let j=0;j<tiles.length;j++)if(!(mask&(1<<j))&&identities(tiles[j]).includes(faces[i]))visit(i+1,mask|(1<<j),[...uids,tiles[j].uid],{...assigned,[tiles[j].uid]:faces[i]});}visit(0,0,[],{});return [...found.values()];
}
function pack(tiles,options,oneEye=false){
 const byTile=tiles.map((_,i)=>options.filter(o=>o.mask&(1<<i))),memo=new Map();
 function solve(mask,eye){if(!mask)return {count:0,groups:[]};const key=mask+':'+eye;if(memo.has(key))return memo.get(key);let i=0;while(!(mask&(1<<i)))i++;let best=solve(mask&~(1<<i),eye);for(const o of byTile[i])if((mask&o.mask)===o.mask&&(!oneEye||o.kind!=='雀头'||eye)){const rest=solve(mask&~o.mask,oneEye&&o.kind==='雀头'?false:eye),count=bitCount(o.mask)+rest.count;if(count>best.count)best={count,groups:[o,...rest.groups]};}memo.set(key,best);return best;}return solve((1<<tiles.length)-1,true).groups;
}
function assign(tiles,slots){
 const owners=slots.map(()=>-1);function visit(i,seen){for(let j=0;j<slots.length;j++)if(!seen.has(j)&&identities(tiles[i]).includes(slots[j])){seen.add(j);if(owners[j]===-1||visit(owners[j],seen)){owners[j]=i;return true;}}return false;}for(let i=0;i<tiles.length;i++)visit(i,new Set());return owners.map((i,j)=>i<0?null:{uid:tiles[i].uid,face:slots[j]}).filter(Boolean);
}
export function traitLayout(r,step){
 const resolved=resolvedTiles(r),ids=step.uids||traitComponents(resolved,step.traitId,step.count),set=new Set(ids),tiles=resolved.filter(t=>set.has(t.uid)),id=step.traitId;
 let groups=[];
 if(id==='pairs'||id==='pungs'){
  const size=id==='pairs'?2:3,faces=[...new Set(tiles.flatMap(identities))].sort((a,b)=>rank(a)-rank(b));groups=pack(tiles,faces.flatMap(f=>candidates(tiles,Array(size).fill(f),size===2?'对子':'刻子'))).sort((a,b)=>rank(a.assigned[a.uids[0]])-rank(b.assigned[b.uids[0]]));
 }else if(id==='pure-outside'){
  const options=[];for(let s=0;s<3;s++){for(const ns of [[1,2,3],[7,8,9],[1,1,1],[9,9,9]])options.push(...candidates(tiles,ns.map(n=>`${s}-${n}`),ns[0]===ns[1]?'刻子':'顺子'));for(const n of [1,9])options.push(...candidates(tiles,[`${s}-${n}`,`${s}-${n}`],'雀头'));}groups=pack(tiles,options,true).sort((a,b)=>(a.kind==='雀头')-(b.kind==='雀头')||rank(a.assigned[a.uids[0]])-rank(b.assigned[b.uids[0]]));
 }else if(id==='mixed-chows'){
  let best=[];for(let start=1;start<=7;start++){const options=[];for(let s=0;s<3;s++)options.push(...candidates(tiles,[start,start+1,start+2].map(n=>`${s}-${n}`),'顺子'));const next=pack(tiles,options);if(next.length>best.length)best=next;}groups=best.sort((a,b)=>rank(a.assigned[a.uids[0]])-rank(b.assigned[b.uids[0]]));
 }else if(id==='straight'||id==='orphans'||id==='dragons'||id==='winds'){
  let slots=[];
  if(id==='straight'){let best=[];for(let s=0;s<3;s++){const next=assign(tiles,Array.from({length:9},(_,i)=>`${s}-${i+1}`));if(next.length>best.length)best=next;}groups=[{kind:'清龙',uids:best.map(x=>x.uid),assigned:Object.fromEntries(best.map(x=>[x.uid,x.face]))}];}
  else{if(id==='orphans'){slots=[...Array.from({length:3},(_,s)=>[`${s}-1`,`${s}-9`]).flat(),...Array.from({length:7},(_,i)=>`h-${i}`)];if(tiles.length>=14){let best=assign(tiles,slots);for(const f of slots){const next=assign(tiles,[...slots,f]);if(next.length>best.length)best=next;}groups=[{kind:'国士',uids:best.map(x=>x.uid),assigned:Object.fromEntries(best.map(x=>[x.uid,x.face]))}];}}
   else slots=Array.from({length:id==='dragons'?3:4},(_,i)=>Array(3).fill(`h-${i+(id==='dragons'?4:0)}`)).flat();
   if(!groups.length){const chosen=assign(tiles,slots);groups=[{kind:step.label,uids:chosen.map(x=>x.uid),assigned:Object.fromEntries(chosen.map(x=>[x.uid,x.face]))}];}
  }
 }else{
  const suitCounts=[0,1,2].map(s=>tiles.filter(t=>identities(t).some(f=>info(f).s===s)).length),suit=suitCounts.indexOf(Math.max(...suitCounts));
  const allowed=f=>{const d=info(f);if(id==='flush')return d.s===suit;if(id==='half-flush')return d.s===suit||d.s===3;if(id==='honors')return d.s===3;if(id==='green')return ['2-2','2-3','2-4','2-6','2-8','h-5'].includes(f);if(id==='simples')return d.s<3&&d.n>=2&&d.n<=8;if(id==='upper')return d.s<3&&d.n>=7;if(id==='middle')return d.s<3&&d.n>=4&&d.n<=6;if(id==='lower')return d.s<3&&d.n<=3;return true;};
  const chosen=tiles.map(t=>({uid:t.uid,face:identities(t).find(allowed)||t.face})).sort((a,b)=>rank(a.face)-rank(b.face)||a.uid-b.uid);
  groups=[{kind:step.label,uids:chosen.map(x=>x.uid),assigned:Object.fromEntries(chosen.map(x=>[x.uid,x.face]))}];
 }
 return finishLayout(r,groups,ids);
}
export function pairsLayout(r){return traitLayout(r,{traitId:'pairs',label:'小七对',uids:[...new Set(r.groups.filter(g=>g.phase==='pairs').flatMap(g=>g.uids))]});}

// Waits consume logical time. Pause and live speed changes affect every phase.
export class PlaybackClock{
 constructor(){this.speed=1;this.paused=false;this.generation=0;}
 setSpeed(value){if(!Number.isFinite(value)||value<.25||value>3)throw Error('播放倍速须为0.25至3');this.speed=value;}
 cancel(){this.generation++;}
 async wait(ms,{rate=1,alive=()=>true,frame=cb=>requestAnimationFrame(cb),now=()=>performance.now()}={}){const token=this.generation;let remaining=ms,last=now();while(remaining>0){await new Promise(frame);const current=now(),delta=Math.max(0,current-last);last=current;if(token!==this.generation||!alive())return false;if(!this.paused)remaining-=delta*this.speed*rate;}return token===this.generation&&alive();}
}
