import {Game,RULESET_VERSION} from './game.js?v=0.25.0';
import {LESSONS,COACH_HINTS,createTraining,stepsFor,attachTraining,stateBefore,TUTORIAL_VERSION} from './tutorial-data.js?v=0.25.0';
const clone=v=>JSON.parse(JSON.stringify(v));
const stable=g=>!g.pending&&!g.presentation&&(g.phase!=='resolving'||!g.queue.length)&&!(g.phase==='showdown'&&['intro','running'].includes(g.preparation?.stage));
// A missed interaction is omitted, never forged. Reconciliation changes only tutorial records.
export function missedTask(task,a){
 const g=a.game,w=task.window,b=a.segmentBefore||a.before;
 if(a.id==='A'){
  if(task.kind==='buy'&&g.phase==='shop'&&(!g.players[0].shop.some(t=>t?.face===task.face)||g.players[0].buys>=g.config.maxBuy))return true;
  if(['stage','unstage'].includes(task.kind)&&g.canPlanDiscards()&&!g.players[0].hand.some(t=>t.face===task.face))return true;
  if(task.kind==='swap'&&(!g.players[0].hand.some(t=>t.face==='2-7')||!g.players[0].hand.some(t=>t.face==='0-1')))return true;
  if(w){
   if(g.round>w.round)return true;
   if(g.round<w.round)return false;
   if(w.stage==='shop')return g.phase!=='shop';
   if(w.stage==='river')return g.reports.length>0||['select','discard','ready'].includes(g.preparation?.stage);
   if(w.stage==='preparation')return g.reports.length>0||['discard','ready'].includes(g.preparation?.stage)||(task.kind==='take'&&g.preparation?.stage==='select'&&!g.pending&&!g.players[0].river.some(t=>t.face===task.face));
   return false;
  }
  return a.step===23&&g.phase==='over';
 }
 if(g.phase==='over'&&!task.options&&!task.tool)return true;
 if(!stable(g)||task.options||task.report||task.tool)return false;
 if(task.kind==='call'&&!g.pending)return true;
 if(task.kind==='land'&&!g.players[0].hand.some(t=>t.face===task.face))return true;
 const target=task.target||'';
 if(!target)return false; // Open challenges may span many rounds.
 if(g.round>b.round)return true;
 if(/offers|upgrade|refresh-shop|drop-zone/.test(target))return g.phase!=='shop'||/offers/.test(target)&&g.players[0].buys>=g.config.maxBuy;
 if(task.kind==='take')return ['result','over','draft'].includes(g.phase)||g.preparation?.stage==='select'&&!g.players[0].river.some(t=>t.face===task.face);
 if(/hand-tiles|pending-discard|claim-dock|kong-dock|data-trait-id|hand-capacity/.test(target)){
  if(['result','over','draft'].includes(g.phase))return true;
  if(b.phase==='shop'&&g.phase==='showdown'&&g.preparation?.stage==='select')return true;
 }
 return false;
}
// Separate storage and Game instance: no tutorial snapshot ever reaches LocalAccounts.capture.
export class TutorialSession{
 constructor({storage,scope='/',accountId}){
  this.storage=storage;this.key='quexu-tutorial-v1:'+encodeURIComponent(scope)+':'+accountId;
  this.progress={version:TUTORIAL_VERSION,rules:RULESET_VERSION,completed:{},mastered:{},coach:false,seen:[],resume:null};this.active=null;this.error=null;
  try{
   const d=JSON.parse(storage.getItem(this.key)||'null');
   if(d?.version===1&&d.rules===RULESET_VERSION&&d.completed&&d.mastered){d.version=2;d.completed={...d.completed};d.mastered={...d.mastered};delete d.completed.A;delete d.mastered.A;if(d.resume?.id==='A')d.resume=null;}
   // Step keys and indices remain stable, including live v2 snapshots and checkpoints.
   if(d?.version===2&&d.rules===RULESET_VERSION)d.version=3;
   if(d?.version===3&&d.rules===RULESET_VERSION){if(d.resume?.id==='A'){const remap=i=>i>=26?i+3:i;const r=d.resume;if(r.step===26&&!r.finished){r.step=26;r.answer=null;r.passed=false;}else r.step=remap(r.step);if(Array.isArray(r.skipped))r.skipped=r.skipped.map(remap);}d.version=TUTORIAL_VERSION;}
   if(d?.version===TUTORIAL_VERSION&&d.rules===RULESET_VERSION&&d.completed&&typeof d.completed==='object'&&!Array.isArray(d.completed)&&d.mastered&&typeof d.mastered==='object'&&!Array.isArray(d.mastered)&&Array.isArray(d.seen))this.progress={...this.progress,...d};
  }catch{this.error='练习记录暂时无法读取；正式牌局未改动。';}
 }
 persist(){try{this.storage.setItem(this.key,JSON.stringify(this.progress));this.error=null;return true;}catch{this.error='练习进度尚未保存；本次仍可继续。';return false;}}
 start(id,variant=0){
  if(!LESSONS.some(l=>l.id===id))throw Error('课程不存在');
  const {game,steps}=createTraining(id,variant),before=stateBefore(game);
  this.active={id,variant,step:0,revision:0,game,steps,answer:null,events:[],roundEvents:[],passed:false,omitted:false,skipped:[],before,roundBefore:clone(before),segmentBefore:clone(before),checkpoint:game.export(),finished:false};this.capture();return game;
 }
 restore(){
  const raw=this.progress.resume;if(!raw)return null;
  try{
   if(!LESSONS.some(l=>l.id===raw.id)||!Number.isInteger(raw.step)||![0,1].includes(raw.variant))throw Error();
   const game=attachTraining(Game.restore(raw.snapshot)),steps=stepsFor(raw.id,raw.variant);
   if(raw.step<0||raw.step>=steps.length||!game.training)throw Error();
   const checkpoint=Game.restore(raw.checkpoint),before={...stateBefore(checkpoint),...raw.before};
   this.active={...raw,game,steps,before,revision:0,events:Array.isArray(raw.events)?raw.events:[],roundEvents:Array.isArray(raw.roundEvents)?raw.roundEvents:[],roundBefore:raw.roundBefore||clone(before),segmentBefore:raw.segmentBefore||clone(before),skipped:Array.isArray(raw.skipped)?raw.skipped:[],omitted:!!raw.omitted};
   this.observe();return game;
  }catch{this.progress.resume=null;this.persist();this.error='旧练习无法继续，可重新开始；正式牌局保持原样。';return null;}
 }
 get task(){return this.active?.steps[this.active.step];}
 recordEvent(name){const a=this.active;if(!a||a.finished)return;if(!a.events.includes(name))a.events.push(name);if(!a.roundEvents.includes(name))a.roundEvents.push(name);}
 event(name){this.recordEvent(name);this.observe();}
 answer(index){const a=this.active;if(!a||!this.task.options||!Number.isInteger(index)||index<0||index>=this.task.options.length)return false;a.answer=index;this.observe();return a.passed;}
 observe(){
  const a=this.active;if(!a||a.finished)return;
  if(a.roundBefore.round!==a.game.round){a.roundBefore=stateBefore(a.game);a.roundEvents=[];}
  if(!a.passed){
   try{a.passed=!!this.task.check(a.game,a);}catch{a.passed=false;}
   if(!a.passed&&missedTask(this.task,a)){a.passed=true;a.omitted=true;if(!a.skipped.includes(a.step))a.skipped.push(a.step);}
  }
  this.capture();
 }
 capture(){const a=this.active;if(a)this.progress.resume={id:a.id,variant:a.variant,step:a.step,revision:a.revision,answer:a.answer,events:a.events.slice(),roundEvents:a.roundEvents.slice(),passed:a.passed,omitted:a.omitted,skipped:a.skipped.slice(),before:clone(a.before),roundBefore:clone(a.roundBefore),segmentBefore:clone(a.segmentBefore),checkpoint:a.checkpoint,snapshot:a.game.export(),finished:a.finished,incomplete:!!a.incomplete};this.persist();}
 next(){
  const a=this.active;if(!a||!a.passed||a.finished)return false;
  if(a.step===a.steps.length-1){a.finished=true;a.incomplete=!!a.omitted;if(!a.incomplete)this.progress.completed[a.id]=true;if(!a.incomplete&&a.variant===1&&!a.skipped.length)this.progress.mastered[a.id]=true;this.capture();return true;}
  a.step++;a.revision++;a.answer=null;a.events=a.roundEvents.slice();a.passed=false;a.omitted=false;
  if(this.task.setup){this.task.setup(a.game);a.roundBefore=stateBefore(a.game);a.segmentBefore=stateBefore(a.game);a.roundEvents=[];a.events=[];}
  a.before=stateBefore(a.game);a.checkpoint=a.game.export();this.observe();return true;
 }
 retry(){const a=this.active;if(!a)return null;a.game=attachTraining(Game.restore(a.checkpoint));a.revision++;a.finished=false;a.incomplete=false;a.answer=null;a.events=[];a.roundEvents=[];a.passed=false;a.omitted=false;a.roundBefore=clone(a.before);a.segmentBefore=clone(a.before);this.observe();return a.game;}
 leave(){this.capture();this.active=null;}
 coachHint(game){if((!this.progress.coach&&!this.task?.coached)||(this.active&&this.active.id!=='A'))return null;const context=(this.runId||'local')+':'+game.round;this.hintContext=context;return COACH_HINTS.find(h=>!this.progress.seen.includes(h.id)&&(['claim','capacity'].includes(h.id)||this.progress.lastCoach!==context)&&h.when(game))||null;}
 dismissCoach(id){if(!this.progress.seen.includes(id))this.progress.seen.push(id);if(!['claim','capacity'].includes(id))this.progress.lastCoach=this.hintContext;this.persist();}
}
// One guarded timer per task. No timer is saved and no game action is executed here.
export class TutorialAutoAdvance{
 constructor({getSession,isReady,onAdvance,schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id)}){Object.assign(this,{getSession,isReady,onAdvance,schedule,cancel});this.pending=null;}
 clear(){if(this.pending){this.cancel(this.pending.timer);this.pending=null;}}
 update(){
  const s=this.getSession(),a=s?.active;
  if(!a||a.finished||!a.passed||!this.isReady()){this.clear();return;}
  if(this.pending?.active===a&&this.pending.step===a.step&&this.pending.revision===a.revision)return;
  this.clear();const token={active:a,step:a.step,revision:a.revision};this.pending=token;
  token.timer=this.schedule(()=>{
   if(this.pending!==token)return;this.pending=null;
   const current=this.getSession()?.active;
   if(current!==a||a.step!==token.step||a.revision!==token.revision||a.finished||!a.passed||!this.isReady())return;
   this.onAdvance();
  },a.omitted?240:s.task.readMs|| (s.task.options?Math.min(5500,Math.max(2200,(s.task.explanation?.length||0)*75)):650));
 }
}
