import {LESSONS,COURSE_GROUPS} from './tutorial-data.js?v=0.25.0';
import {tutorialMoment,tutorialTarget} from './tutorial-moments.js?v=0.25.0';
import {TutorialAutoAdvance} from './tutorial.js?v=0.25.0';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function createGuidance(){
 const layer=document.createElement('div');layer.id='tutorial-guidance-root';layer.setAttribute('aria-hidden','true');document.body.appendChild(layer);let signature='',elements=[],frame=null;
 function position(){frame=null;for(let i=0;i<elements.length;i++){const anchor=elements[i],node=layer.children[i];if(!anchor?.isConnected||!node)continue;const focus=anchor.classList.contains('offer')?anchor.querySelector('.tile-face')||anchor:anchor,b=focus.getBoundingClientRect(),size=Math.min(160,Math.max(52,Math.min(b.width,b.height)+22));node.style.left=(b.left+b.width/2-size/2)+'px';node.style.top=(b.top+b.height/2-size/2)+'px';node.style.width=size+'px';node.style.height=size+'px';}if(elements.length)frame=requestAnimationFrame(position);}
 return {update(selector,key=''){
  const active=selector&&!document.hidden&&!document.body.classList.contains('portrait-lock'),targets=active?[...document.querySelectorAll(selector)].filter(e=>!e.disabled&&e.getBoundingClientRect().width>0):[];
  const sig=key+':'+selector+':'+targets.map(e=>e.dataset.uid||e.dataset.shopUid||e.dataset.index||e.className).join('|');elements=targets;
  if(sig!==signature){signature=sig;layer.innerHTML=targets.map(()=>'<span class="tutorial-guidance"><i></i><i></i><i></i></span>').join('');}
  if(frame!==null){cancelAnimationFrame(frame);frame=null;}position();
 }};
}
export function mountTutorial({getSession,getGame,getUI,start,resume,leave,retry,next,answer,coach,notify,backup}){
 const root=document.createElement('div');root.id='tutorial-root';document.body.appendChild(root);let lastMarkup='',hub=false,library=false,group='入门',hint=false,collapsed=false,experience='new',focusBefore=null;
 const guidance=createGuidance();
 const auto=new TutorialAutoAdvance({getSession,isReady:()=>{
  const s=getSession(),a=s?.active,u=getUI();
  if(!a||hub||hint||u.dragging||document.hidden||document.body.classList.contains('portrait-lock')||u.push)return false;
  if(u.modal&&!['report'].includes(u.modal.type))return false;
  if((s.task.report||a.steps[a.step+1]?.setup)&&u.scoring&&!u.scoring.unlocked)return false;
  return !document.querySelector('.hand-drag-ghost');
 },onAdvance:()=>{hint=false;next();draw();}});
 const button=(action,text,extra='')=>'<button type="button" data-tutorial="'+action+'" '+extra+'>'+text+'</button>';
 function open(asLibrary=false){hub=true;library=asLibrary;focusBefore=document.activeElement;draw();root.querySelector('button')?.focus();}
 function close(){hub=false;hint=false;draw();focusBefore?.isConnected&&focusBefore.focus();}
 function commit(markup){if(markup!==lastMarkup){root.innerHTML=markup;lastMarkup=markup;}}
 function draw(){const s=getSession(),a=s?.active,t=s?.task;auto.update();if(!a||hub||collapsed||a.finished)guidance.update(null);document.body.classList.toggle('tutorial-active',!!a);document.querySelectorAll('.tutorial-target').forEach(e=>e.classList.remove('tutorial-target'));if(!s){commit('');return;}
 if(hub&&!library){commit('<section class="tutorial-dock tutorial-entry-dock" role="dialog" aria-label="开始新手教程"><div class="tutorial-dock-head"><span>原牌桌 · 完整流程</span>'+button('close','×','aria-label="关闭教程入口"')+'</div><p>沿正常一局逐步学习。教程单独保存，正式牌局保留。</p><div class="tutorial-entry-menu">'+button('intro','开始完整教程','class="tutorial-primary"')+(s.progress.resume?button('resume','继续上次教程'):'')+button('library','专项重练')+button('coach',s.progress.coach?'关闭按需带教':'开启按需带教')+'</div></section>');return;}
 if(hub){commit('<div class="tutorial-backdrop"><section class="tutorial-hub" role="dialog" aria-modal="true" aria-label="雀序新手教程"><header><div><small>牌桌练习 · '+Object.keys(s.progress.completed).length+'/'+LESSONS.length+'</small><h2>从第一搭开始</h2></div>'+button('close','×','aria-label="关闭教程目录"')+'</header><div class="tutorial-entry"><label>你的经验 <select id="tutorial-experience"><option value="new" '+(experience==='new'?'selected':'')+'>第一次接触麻将</option><option value="mahjong" '+(experience==='mahjong'?'selected':'')+'>会麻将，第一次玩雀序</option></select></label>'+button('intro','开始完整教程','class="tutorial-primary"')+(s.progress.resume?button('resume','继续上次练习'):'')+button('coach',s.progress.coach?'关闭首局带教':'开启首局带教')+'</div><nav class="tutorial-groups" aria-label="课程分类">'+COURSE_GROUPS.map(g=>button('group',esc(g),'data-group="'+g+'" aria-pressed="'+(group===g)+'"')).join('')+'</nav><div class="tutorial-courses">'+LESSONS.filter(l=>l.group===group).map(l=>'<article><div><b>'+esc(l.title)+'</b><small>'+esc(l.description)+'</small></div><span class="tutorial-course-status">'+(s.progress.mastered[l.id]?'独立完成':s.progress.completed[l.id]?'已练习':'未练习')+'</span>'+button('lesson','开始','data-id="'+l.id+'"')+(l.id!=='A'?button('test','独立复测','data-id="'+l.id+'"'):'')+'</article>').join('')+'</div><footer>练习使用独立牌局，不替换正式牌局。可以随时退出。'+(s.error?'<span role="status">'+esc(s.error)+'</span>':'')+'</footer></section></div>');return;}
 if(a){
  const moment=a.id==='A'?tutorialMoment(getGame(),getUI()):null,guided=!moment&&t.coached?s.coachHint(getGame()):null,finished=a.finished;
  const opening=!finished&&t.opening?'<div class="tutorial-opening">'+t.opening.map(item=>'<div><b>'+esc(item.title)+'</b><span>'+esc(item.text)+'</span></div>').join('')+'</div>':'';
  const answers=!finished&&t.options?'<div class="tutorial-answers">'+t.options.map((o,i)=>button('answer',esc(o),'data-index="'+i+'" '+(a.passed?'disabled ':'')+'class="'+(a.answer===i?(a.passed&&!a.omitted?'correct':'incorrect'):'')+'"')).join('')+'</div>':'';
  const explanation=!finished&&a.passed&&!a.omitted&&t.explanation?'<div class="tutorial-hint" role="status">'+esc(t.explanation)+'</div>':'';
  const status=!finished&&a.passed?'<small class="tutorial-auto-status" role="status">'+(a.omitted?'已进入新阶段，继续跟随牌局…':t.kind==='briefing'?'阅读后自动继续…':'✓ 已完成 · 自动继续…')+'</small>':'';
  const controls=finished?(a.incomplete?button('retry','重试本步'):'')+button('test','换题复测','data-id="'+a.id+'"')+button('directory','课程目录')+button('exit','返回牌局','class="tutorial-primary"'):(guided?button('coach-dismiss','知道了','data-id="'+guided.id+'"'):button('hint',hint?'收起说明':'?','aria-label="本步提示"'))+button('retry','重试本步');
  commit('<section class="tutorial-dock '+(collapsed?'collapsed':'')+'" aria-label="练习引导" data-course="'+a.id+'" data-step="'+a.step+'" data-task="'+t.key+'" data-passed="'+a.passed+'" data-omitted="'+a.omitted+'"><div class="tutorial-dock-head"><span>'+esc(LESSONS.find(l=>l.id===a.id)?.title)+' · '+(a.step+1)+'/'+a.steps.length+'</span>'+button('collapse',collapsed?'展开':'收起')+button('exit','退出')+'</div>'+(collapsed?'':opening+(moment?'<small class="tutorial-live-title">'+esc(moment.title)+'</small>':'')+'<p role="status">'+esc(finished?(a.incomplete?'本次目标尚未完成。可以重试本步，或专项重练。':a.skipped.length?'本局练习结束。错过的操作可在专项重练补学。':'练习完成。可以换题复测，或回到自己的牌局。'):(moment?.text||guided?.text||t.text))+'</p>'+answers+(!finished&&a.answer!==null&&!a.passed?'<small class="tutorial-error" role="status">再想一想，可打开提示查看规则。</small>':'')+(!finished&&t.tool==='backup'?button('backup','导出演示账号备份'):'')+explanation+(hint?'<div class="tutorial-hint">'+esc(t.explanation||t.hint)+'</div>':'')+(s.error?'<small class="tutorial-error">'+esc(s.error)+'</small>':'')+status+'<div class="tutorial-dock-actions">'+controls+'</div>')+'</section>');
  const target=moment?.target||tutorialTarget(t,getGame());guidance.update(!collapsed&&!finished&&!a.omitted&&a.variant===0?target:null,t.key+':'+(moment?.title||''));return;
 }

 const h=s.coachHint(getGame());if(h)commit('<section class="tutorial-coach" aria-label="首次提示"><span>'+esc(h.text)+'</span>'+button('coach-dismiss','知道了','data-id="'+h.id+'"')+button('directory','去练习')+'</section>');else commit('');
 }
 let touchButton=null,touchCompatibilityUntil=0,touchPoint={x:-100,y:-100};
 root.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;const button=e.target.closest('[data-tutorial]');touchButton=button&&!button.disabled?{button,x:e.clientX,y:e.clientY,id:e.pointerId}:null;});
 root.addEventListener('pointercancel',()=>{touchButton=null;});
 root.addEventListener('pointerup',e=>{const start=touchButton;touchButton=null;if(e.pointerType!=='touch'||!start||start.id!==e.pointerId||!start.button.isConnected||Math.hypot(e.clientX-start.x,e.clientY-start.y)>10)return;const target=e.target.closest('[data-tutorial]');if(target!==start.button)return;e.preventDefault();touchCompatibilityUntil=performance.now()+600;touchPoint={x:e.clientX,y:e.clientY};target.click();});
 document.addEventListener('click',e=>{if(e.isTrusted&&(e.pointerType==='touch'||e.sourceCapabilities?.firesTouchEvents)&&performance.now()<touchCompatibilityUntil&&Math.hypot(e.clientX-touchPoint.x,e.clientY-touchPoint.y)<20){e.preventDefault();e.stopImmediatePropagation();}},true);
 root.addEventListener('click',e=>{const b=e.target.closest('[data-tutorial]');if(!b||b.disabled)return;e.stopPropagation();const action=b.dataset.tutorial,wasHint=hint;hint=false;try{if(action==='close')close();if(action==='group'){group=b.dataset.group;draw();}if(action==='intro'){hub=false;start('A',0,experience);collapsed=false;draw();}if(action==='lesson'||action==='test'){hub=false;start(b.dataset.id,action==='test'?1:0);collapsed=false;draw();}if(action==='resume'){hub=false;resume();draw();}if(action==='exit'){hub=false;leave();draw();}if(action==='directory'){open(true);}if(action==='library'){library=true;draw();}if(action==='retry'){retry();draw();}if(action==='answer'){answer(Number(b.dataset.index));draw();}if(action==='hint'){hint=!wasHint;draw();}if(action==='collapse'){collapsed=!collapsed;draw();}if(action==='coach'){coach();draw();}if(action==='coach-dismiss'){getSession().dismissCoach(b.dataset.id);draw();}if(action==='backup'){backup();draw();}}catch(err){notify(err.message||'练习操作未完成');}});
 root.addEventListener('change',e=>{if(e.target.id==='tutorial-experience')experience=e.target.value;});
 document.addEventListener('keydown',e=>{if(hub&&e.key==='Tab'){const items=[...root.querySelectorAll('button:not(:disabled),select')],first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}if(e.key==='Escape'&&hub){e.stopImmediatePropagation();close();}},true);
 document.addEventListener('visibilitychange',draw);window.addEventListener('resize',draw);
 return {open,draw,close};
}
