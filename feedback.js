import {hasColor} from './special-tiles.js?v=0.28.2';
// Read-only audiovisual metadata. Never add score steps or change saved reports.
const style=(theme,title,level,detail='')=>({theme,title,level,detail,nameMs:[0,520,660,820,960][level],holdMs:[0,300,420,560,680][level]});
export function scoreFeedback(step){
 const n=step.count||0,id=step.traitId;
 if(id==='orphans')return style('orphans','国士无双',n>=13?4:2,n>=13?'十三幺齐聚':'幺九字相聚');
 if(id==='winds')return style('winds',n>=12?'大四喜':'四喜',n>=12?4:2,'四方来风');
 if(id==='dragons')return style('dragons',n>=9?'大三元':'三元',n>=9?4:2,'中 · 發 · 白');
 if(id==='honors')return style('honors','字一色',n>=14?4:n>=11?3:2,'字牌成势');
 if(step.material==='jade'||step.material==='diamond'){
  const factor=Number(step.factor)||1,level=factor>=5?4:factor>=3?3:factor>=2?2:1;
  return style(step.material,step.material==='jade'?'玉鸣':'钻耀',level,'×'+factor);
 }
 if(step.kind==='chicken')return style('chicken','捉鸡压制',2,'×'+step.factor);
 if(step.label==='宝牌加符')return style('dora','宝牌',2,'＋'+step.amount+'符');
 if(id&&((step.stage||0)>=3||(step.fan||0)>=4))return style('grand',step.label,(step.fan||0)>=6?3:2,'');
 return null;
}
export function feedbackCues(report){
 const tiles=report.tiles||[],resolved=new Map((report.wildCopies||[]).map(t=>[t.uid,t.face])),all=[...tiles,...report.riverFlowers||[]],cues=[];
 const centers=tiles.filter(t=>t.face==='h-4');
 if(centers.length>=3)cues.push({...style('wild','赖子',2,'左邻复制'),uids:[...new Set([...centers.map(t=>t.uid),...(report.wildCopies||[]).map(t=>t.leftUid).filter(Boolean)])]});
 if(report.chicken>=2)cues.push({...style('chicken','捉鸡',2,'鸡牌符×2'),uids:tiles.filter(t=>['2-1','1-8'].includes(resolved.get(t.uid)||t.face)).map(t=>t.uid)});
 if(report.red>=2)cues.push({...style('dora','宝牌',2,report.dora?'宝牌＋'+report.dora+'符':'红宝共鸣'),uids:all.filter(t=>hasColor(t,'red')).map(t=>t.uid)});
 for(const [dim,value,title,theme]of [['color','rainbow','虹宝','dora'],['pattern','infinite','无穷纹路','wild'],['material','star','星核','diamond']]){const uids=all.filter(t=>t[dim]===value).map(t=>t.uid);if(uids.length)cues.push({...style(theme,title,4,'顶级异色'),key:'cue:apex:'+dim,uids});}
 return cues.map(c=>({...c,key:c.key||'cue:'+c.theme,area:'cue',label:c.title}));
}
export const feedbackEntries=(report,through=Infinity)=>feedbackCues(report).slice(0,through).map(({key,area,label,detail})=>({key,area,label,text:detail}));
