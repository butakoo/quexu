// Read-only explanations derived from the current table and frozen report.
export function tutorialMoment(g,ui){
 const s=ui.scoring;
 if(s&&[3,6].includes(s.report.round)&&s.seat===0){
  const r=s.report.results[0],phase=s.teachingPhase||'base';
  const texts={
   base:{title:'先算符 · 基础分',text:'有效顺子、刻子与雀头先提供符，散牌放在右边。符是得分的底子；小七对和国士达到对应档位时另有计符规则。',target:'.score-base-block'},
   recode:{title:'同一手牌 · 多种码法',text:'现在按羁绊重新码牌。同一套牌可分别凑清一色、小七对、清龙等；不同羁绊可以共用组件，每个羁绊内部同一张牌只算一次。',target:'.score-show-tiles'},
   fan:{title:'番先相加 · 再乘符',text:'每个羁绊取达到的最高档，奖励番数先加在一起，再作为主倍率乘符。比如5符、3番就是5×3＝15分，不是把每个累计番再乘一遍。',target:'.score-mult-block'},
   material:{title:'额外倍率 · 最后乘',text:'红绿青与水晶的加符、加番先算完，再依次乘玉、钻石等特殊倍率，最后处理压制和取整。异色牌需要与牌型一起经营。',target:'.score-extra-block'},
   final:{title:'本场得分 · 累计总分',text:'这次展示有'+r.symbols+'符、'+r.fan+'番，按完整报告获得'+r.gain+'分，已经加入累计总分。单次输赢不要紧，继续为后面的对决养牌。',target:'.score-total-block'}
  };
  return texts[phase]||texts.base;
 }
 if(g.round===6&&g.reports.length<2){
  if(g.presentation?.kind==='discard'&&g.presentation.i!==0)return {title:'再看一次 · 多余牌进牌河',text:'电脑的手牌超过容量，也要把多余牌依次打到自己的牌河。真实落桌后才能鸣牌；轮到你时，仍然先安排待打，再确认回合结束。',target:'.river-area.'+({1:'east',2:'north',3:'west'}[g.presentation.i])};
  if(g.preparation?.stage==='select')return {title:'轮到你 · 复习出牌',text:'先从自己的牌河取回需要的牌。超过容量时，把多余牌拖到待打区；可撤回或交换，准备好后点击回合结束，才会依次落桌。',target:'.pending-discard-zone,[data-action="main"]'};
  if(g.preparation)return {title:'第二次对决 · 整理手牌',text:'各家先从牌河取牌，再把超出容量的牌打回牌河。留意电脑的落牌过程，马上轮到你复习同一个动作。',target:'.preparation-banner'};
 }
 return null;
}
export function tutorialTarget(task,g){
 if(task.kind==='tool-stage'){
  const id=g.training?.toolLesson?.uids.find(id=>!g.plannedDiscards.includes(id)&&g.players[0].hand.some(t=>t.uid===id));
  return id?'.hand-tiles .tile-button[data-uid="'+id+'"]':'.pending-discard-zone';
 }
 if(task.kind==='tool-unstage'){
  const id=g.training?.toolLesson?.uids.find(id=>g.plannedDiscards.includes(id));
  if(id)return '.pending-discard-tiles .tile-button[data-uid="'+id+'"]';
 }
 if(task.kind==='buy'){const i=g.players[0].shop.findIndex(t=>t?.face===task.face);if(i>=0)return '.offer[data-index="'+i+'"]';}
 if(task.kind==='unstage'){const tile=g.players[0].hand.find(t=>t.face===task.face&&g.plannedDiscards.includes(t.uid));if(tile)return '.pending-discard-tiles .tile-button[data-uid="'+tile.uid+'"]';}
 if(task.kind==='take'){const tile=g.players[0].river.find(t=>t.face===task.face);if(tile)return '.river-pickable[data-uid="'+tile.uid+'"]';}
 if(task.target==='.offers')return '.offer[data-index="0"]';
 if(task.target==='.hand-tiles')return '.hand-tiles > .tile-wrap:first-child .tile-button';
 return task.target;
}
