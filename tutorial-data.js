import {Game,owned,cap,usage,score,copyLeft,TRAIT_CATALOG,tileTier} from './game.js?v=0.26.1';

export const TUTORIAL_VERSION=4;
export const COURSE_GROUPS=['入门','操作与经营','鸣牌','羁绊','特殊牌','花牌','做局','复盘与保存','挑战'];
export const LESSONS=[
 ['A','完整流程教程','入门','一局24回合，在原牌桌逐步学习'],
 ...['认识牌组','待打与取回','买卖与换牌','升本与预算','吃与碰','三种杠','临时容量','鸣牌取舍','同门与字牌','对子与带幺','顺子与清龙','点数区间','字牌与国士','红宝和绿牌','青宝呼应','纹路身份','三维特殊牌','黄金','玉的成长','水晶','钻石的复制','红中赖子','捉鸡','宝牌指示物','花牌留河','异色与纹路花','材质花牌','做局选方向','个人与公共池','异色率叠加','符番与倍率','展示与观察','本地账号备份','横屏与音画'].map((title,i)=>['C'+String(i+1).padStart(2,'0'),title,i<4?'操作与经营':i<8?'鸣牌':i<13?'羁绊':i<24?'特殊牌':i<27?'花牌':i<30?'做局':'复盘与保存','示范、实操与独立复测']),
 ...['独立展示','预算挑战','一牌两路','被鸣的收益','花留在桌上','做局后转向','找出失分','完整经营'].map((title,i)=>['D'+String(i+1).padStart(2,'0'),title,'挑战','开放目标，允许不同解法'])
].map(([id,title,group,description])=>({id,title,group,description}));
const p=g=>g.players[0];
export const trainingScore=g=>score(owned(p(g)).filter(t=>!g.plannedDiscards.includes(t.uid)),p(g).indicators,g.config,p(g).melds,p(g).river);
const attrs=x=>typeof x==='string'?{face:x}:x;
export function freshTraining(variant=0){
 const g=new Game(72019+variant,{toolsEnabled:false});for(let i=0;i<4;i++)g.returnShop(i);
 g.training={kind:'lab',variant};g.log=[];g.players.forEach(q=>{q.hand=[];q.river=[];q.melds=[];q.indicators=[];q.doraActive=false;q.buys=0;});
 return attachTraining(g);
}
export function attachTraining(g){g.config.toolsEnabled=false;Object.setPrototypeOf(g,TrainingGame.prototype);return g;}
class TrainingGame extends Game{
 bot(i){if(this.training?.kind==='lab')this.returnShop(i);else super.bot(i);}
 choosePack(index){const first=this.training?.kind==='guided'&&this.players[0].packs.length===0;super.choosePack(index);if(first)setSpecialLessonOffers(this);}
 nextRound(){super.nextRound();if(this.training?.kind==='guided'&&this.round<=3)setIntroOffers(this);}
}
// Fixtures move real entities out of their source pools. Only normal diamond claims create copies.
export function deal(g,spec,zone='hand',seat=0){
 const a=attrs(spec),face=a.face;let pool=g.public,index=pool.findIndex(t=>t.face===face&&!t.intrinsicRed);
 if(index<0){pool=g.players[seat].pool;index=pool.findIndex(t=>t.face===face);}
 if(index<0)throw Error('练习牌池不足：'+face);
 const t=pool.splice(index,1)[0];Object.assign(t,{color:null,pattern:null,material:null,growth:1,diamond:1},a,{bought:zone!=='shop'});
 t.native={color:t.color||null,pattern:t.pattern||null,material:t.material||null};
 if(t.material==='jade'){t.growth=a.growth||1;t.jadeVersion=2;}
 if(t.material==='diamond'){t.diamond=a.diamond||1.25;t.diamondVersion=1;}
 if(zone==='river')g.players[seat].river.push(t);else g.players[seat][zone].push(t);
 return t;
}
export function scene(g,{hand=[],river=[],shop=[],level=2,gold=12,round=3,select=false,opponents=[],privatePack=null}={}){
 const variant=g.training?.variant||0,n=freshTraining(variant);for(const key of Object.keys(g))delete g[key];Object.assign(g,n);
 if(privatePack){const pack=g.pack(privatePack,0);p(g).pool.push(...pack.tiles);p(g).packs.push(pack.name);}
 p(g).level=level;p(g).gold=gold;g.round=round;
 hand.forEach(t=>deal(g,t));river.forEach(t=>deal(g,t,'river'));shop.forEach(t=>deal(g,t,'shop'));
 opponents.forEach((hand,i)=>hand.forEach(t=>deal(g,t,'hand',i+1)));
 if(select){g.phase='showdown';g.preparation={stage:'select',completed:[1,2,3]};}else while(p(g).shop.length<5){const t=g.public.find(t=>tileTier(t)<=level&&!p(g).shop.some(x=>x.face===t.face));if(!t)break;deal(g,t.face,'shop');}
 return g;
}
function setIntroOffers(g){
 for(let i=0;i<4;i++)g.returnShop(i);
 const choices=g.round===1?['0-1','0-2','0-3','2-7','1-9']:g.round===2?['0-1','2-7','1-1','1-7','2-9']:['0-1','1-3','2-2','0-8','1-9'];choices.forEach(face=>{const t=g.public.find(t=>t.face===face&&!t.intrinsicRed)||g.public.find(t=>tileTier(t)===1&&!t.intrinsicRed);if(t)deal(g,t.face,'shop');});
 // First three rounds are deliberately plain. Computers still buy, upgrade, discard and score.
 // Their legal offers cannot claim the 7-sou used to teach river retrieval.
 for(let i=1;i<4;i++)for(let j=0;j<5;j++){
  const candidates=g.public.filter(t=>tileTier(t)===1&&!t.intrinsicRed&&!(t.face.startsWith('0-')&&Number(t.face.slice(2))<=3)&&!(t.face.startsWith('2-')&&Number(t.face.slice(2))>=4));
  if(!candidates.length)break;deal(g,candidates[Math.floor(g.random()*candidates.length)].face,'shop',i);
 }
}
function setSpecialLessonOffers(g){
 const personal=p(g).shop.filter(t=>t&&t.origin!=='public'),publicTile=p(g).shop.find(t=>t&&t.origin==='public'&&!t.intrinsicRed);
 const examples=[{tile:personal[0],color:'red',material:'jade',pattern:'h-0'},{tile:personal[1],color:'cyan',material:'diamond',pattern:null},{tile:publicTile,color:'green',material:null,pattern:null}];
 for(const {tile,...attributes}of examples)if(tile){Object.assign(tile,attributes,{growth:1,diamond:attributes.material==='diamond'?1.25:1,jadePending:false});tile.native={...attributes};if(tile.material==='jade')tile.jadeVersion=2;if(tile.material==='diamond')tile.diamondVersion=1;}
 g.training.specialLesson=true;
}
export function introGame(variant=0){const g=attachTraining(new Game(72019+variant));g.training={kind:'guided',variant};setIntroOffers(g);return g;}
const task=(text,target,check,extra={})=>({text,target,check,hint:extra.hint||text,...extra});
const question=(text,options,answer,explanation)=>task(text,null,(_g,s)=>s.answer===answer,{options,answer,explanation});
const briefing=(text,target=null,readMs=8500,extra={})=>task(text,target,()=>true,{kind:'briefing',readMs,...extra});
const setup=(spec,step)=>({...step,setup:g=>scene(g,spec)});
const buy=(face,text='买入能补齐目标的那张牌。',extra={})=>task(text,'.offers',(g,s)=>p(g).hand.some(t=>t.face===face&&!(s.roundBefore||s.before).hand.includes(t.uid)),{kind:'buy',face,...extra});
const stage=(face,text='把目标牌拖到待打区，先不确认。')=>task(text,'.pending-discard-zone',(g)=>g.plannedDiscards.some(id=>p(g).hand.find(t=>t.uid===id)?.face===face),{kind:'stage',face});
const unstage=(face)=>task('把待打牌拖回手牌空白处；落在另一张牌上会互换。','.hand-tiles',g=>!g.plannedDiscards.length&&p(g).hand.some(t=>t.face===face),{kind:'unstage',face});
const land=(face,text='点击回合结束，让待打牌真实落桌。')=>task(text,'[data-action="main"]',g=>p(g).river.some(t=>t.face===face)||g.destroyed.some(t=>t.face===face),{kind:'land',face});
const take=(face)=>task('轮到你配牌后，点击本人牌河中的目标牌取回。','.river-area.south',g=>g.preparation?.stage==='select'&&p(g).hand.some(t=>t.face===face)&&!p(g).river.some(t=>t.face===face),{kind:'take',face});
const show=(text='点击回合结束，观看这手牌的计分。')=>task(text,'[data-action="main"]',g=>g.reports.length>0,{report:true});
const inspect=(text,target,event)=>task(text,target,(_g,s)=>s.events.includes(event));
const selectTrait=(id,text)=>task(text||'点击左侧羁绊，查看组成它的高亮牌。','[data-trait-id="'+id+'"]',(_g,s)=>s.events.includes('trait:'+id));
const call=(kind,text)=>task(text||'点击手牌右上方的'+kind+'。',['暗杠','加杠'].includes(kind)?'.self-kong-dock':'.claim-dock',g=>p(g).melds.some(m=>m.kind===kind||kind==='暗杠'&&m.kind==='杠'||kind==='加杠'&&m.kind==='杠'),{kind:['暗杠','加杠'].includes(kind)?'self-kong':'call'});
function claimScene(g,kind){const from=kind==='吃'?3:1,face=kind==='吃'?'0-1':'1-7';scene(g,{hand:kind==='吃'?['0-2','0-3']:Array(kind==='杠'?3:2).fill(face),level:2,round:2});deal(g,face,'hand',from);g.phase='resolving';g.discard(from,g.players[from].hand[0].uid);}
const transfer=(variant,faces)=>faces.map(x=>{const t=attrs(x);if(!variant||!/^\d-/.test(t.face))return x;const s=Number(t.face[0]);return {...t,face:((s+1)%3)+t.face.slice(1)};});
function traitSteps(id,hand,offer,target,variant){
 const catalog=TRAIT_CATALOG.find(t=>t.id===id);const h=transfer(variant,hand),f=transfer(variant,[offer])[0];
 return [setup({hand:h,shop:[f],level:3},task('补一张，令'+catalog.name+'达到至少'+target+'组件。','.offers',g=>{const t=trainingScore(g).traits.find(t=>t.id===id);return t.count>=target&&t.stage>0;},{hint:catalog.rule})),selectTrait(id),question(catalog.name+'达到下一档时，奖励怎样算？',['取最高档累计番','各档奖励全相加','每次展示自动再涨一档'],0,'每个羁绊只取达到的最高档；同一实体在同一羁绊只计一次。')];
}
const TRAIT_FIXTURES={
 flush:[['0-1','0-1','0-2','0-3'],'0-7',5],
 'half-flush':[['0-1','0-2','0-3','h-0'],'0-9',5],
 honors:[['h-0','h-0','h-1','h-1'],'h-2',5],
 green:[['2-2','2-3','2-4','2-6'],'2-8',5],
 pairs:[['0-1','0-1','1-2','1-2','2-3'],'2-3',6],
 pungs:[['0-7','0-7','0-7','1-8','1-8'],'1-8',6],
 'pure-outside':[['0-1','0-2','0-3','1-7','1-8'],'1-9',6],
 straight:[['0-1','0-2','0-3','0-4','0-6'],'0-7',6],
 'mixed-chows':[['0-1','0-2','0-3','1-1','1-2'],'1-3',6],
 simples:[['0-2','0-3','0-4','0-6','1-2','1-3','1-4'],'1-6',8],
 upper:[['0-7','0-8','0-9','1-7','1-8','1-9','2-7'],'2-8',8],
 middle:[['0-4','0-5','0-6','1-4','1-5','1-6','2-4'],'2-5',8],
 lower:[['0-1','0-2','0-3','1-1','1-2','1-3','2-1'],'2-2',8],
 dragons:[['h-4','h-4','h-5','h-5'],'h-6',5],
 winds:[['h-0','h-0','h-1','h-1','h-2'],'h-2',6],
 'five-gates':[['0-1','1-2','2-3','h-0'],'h-4',5],
 orphans:[['0-1','0-9','1-1','1-9','2-1','2-9','h-0','h-1'],'h-2',9]
};
export {TRAIT_FIXTURES};
function introSteps(){return [
 {...briefing('单场输了不要紧，目标是把牌型做大，在八次对决中累积更多总分。',null,11500),opening:[{title:'构筑你的大牌',text:'买牌成搭，叠加羁绊做大牌型；每3回合展示一次，共8次，累计分最高获胜，单场输了还能追回。'},{title:'金币 G',text:'开局有5G；之后每个新回合补充5G，用来买牌和升本。每回合首张牌免费，其余按标价购买。'}]},
 buy('0-1','免费领取1万。'),buy('0-2','花2G买2万。'),buy('0-3','再花2G买3万，凑成123顺子。'),
 task('拖动一张手牌调整顺序，也可用排序。','.hand-tiles',(_g,s)=>s.events.includes('reorder')||s.events.includes('sort')),
 task('点击回合结束，进入第2回合。','[data-action="main"]',g=>g.round>=2),
 buy('0-1','新回合到账5G，又有首免。免费补一张1万。'),buy('2-7','花2G买7索，手牌来到5张。'),
 selectTrait('flush','点左侧清一色，找到4张万组件。'),
 task('点击回合结束，进入第3回合。','[data-action="main"]',g=>g.round>=3),
 buy('0-1','免费买1万；现在6张牌，只有5坑。'),stage('2-7'),unstage('2-7'),stage('2-7'),land('2-7'),take('2-7'),
 stage('0-1','先把一张1万拖到待打区。'),
 task('把待打1万与手牌7索交换，留下5张万。','.pending-discard-zone',g=>g.plannedDiscards.length===1&&p(g).hand.find(t=>t.uid===g.plannedDiscards[0])?.face==='2-7',{kind:'swap'}),
 show('回合结束：打出7索，观看四家展示。'),
 question('例：一手牌是5符、3番，应该得多少分？',['15分','10分','5分'],0,'清一色起步2番，加上三色同顺1番，合计3番；5×3＝15。每个羁绊只取达到的最高档。'),
 inspect('用重播或四家分页，看一次得分来源。','.result-replay','score-review'),
 briefing('第一次对决结束！这一场的分数会记进总分。继续买牌、升本和做局，把牌型越养越大；之后还有七次对决。',null,7000)
];}
function buildSteps(id,variant=0){
 if(id==='A')return introSteps().concat([
  task('进入第4回合，继续这一局。','[data-action="continue"]',g=>g.round>=4),
  task('试一次升本：容量立刻从5到8。','[data-action="upgrade"]',g=>p(g).level>=2),
  task('继续正常买牌、出牌。完成第2次对决后学习做局。',null,g=>g.reports.length>=2,{hint:'每回合首张免费，保留能成搭的牌；超额先安排待打。问号与牌面长按可查细则。'}),
  task('第2次对决结束后继续，选择第一次做局牌包。',null,g=>p(g).packs.length>=1,{hint:'继续进入做局，三选一增加36张本人牌池。优先补当前路线；后续正常2个人＋3公共。'}),
  briefing('颜色是直接加分项：红宝、绿宝各加1番，青宝让每张红宝再加番；绿宝还计入绿一色。商店里刚出现的三重牌同时带颜色、材质和纹路。','.offer.offer-red .color-mark,.offer.offer-green .color-mark,.offer.offer-cyan .color-mark',10000,{topic:'color'}),
  briefing('材质会改变出牌的取舍：黄金打出赚钱，玉弃出取回并展示后成长，钻石被鸣会复制并成长，水晶打出会碎。悬浮或长按可查具体效果。','.offer .material-ribbon',10000,{topic:'material'}),
  briefing('纹路让一张牌拥有两套羁绊身份。例如三索带东风纹路，可参与索子与字牌羁绊；同一羁绊不重复计数，基础成搭和吃碰杠仍只认本来牌面。','.offer.has-pattern,.offer.offer-pattern .tile-face',10000,{topic:'pattern'}),
  task('沿正常流程继续到第5次对决，尝试羁绊、鸣牌与特殊牌。',null,g=>g.reports.length>=5,{hint:'点击羁绊看组件，悬浮或长按牌看属性。副露锁到下次展示结束，杠的＋1容量会到期。'}),
  task('第5次对决结束后，完成第二次做局。',null,g=>p(g).packs.length>=2,{hint:'根据当前缺口继续强化或转向。个人池不受本数限制，一局只有这两次补池。'}),
  task('完成第8次对决。累计分决定名次，不要求第一名。',null,g=>g.phase==='over'&&g.reports.length===8,{hint:'保持基础符，逐步提高番与倍率；用重播找出散牌和差一档的组件。'})
 ]);
 const q=question,v=variant%2;
 const simple={hand:['0-1','0-2','0-3'],level:1,round:2};
 switch(id){
 case 'C01':return [setup({hand:transfer(v,['0-3','0-1','0-2'])},inspect('拖动或排序，把手牌排列整齐。','.hand-tiles','reorder')),q('哪一组是顺子？',['同门123','三门各一张1','两个东'],0,'同一门连续三个点数为顺子；三张相同为刻子，两张相同可作雀头。')];
 case 'C02':return [setup({hand:['0-1','0-2','0-3','1-7','2-8','2-9'],level:1},stage('2-9')),unstage('2-9'),stage('2-9'),land('2-9'),take('2-9'),stage('2-9'),show(),q('待打时，牌已经赚黄金收益或碎裂了吗？',['没有，确认落桌才触发','已经触发'],0,'待打只是安排；牌仍属于手牌，可撤回或互换。')];
 case 'C03':return [setup({hand:['2-9'],shop:['0-1','0-2','0-3'],level:1,round:2,gold:5},buy('0-1','免费买1万。')),buy('0-2','买2万，注意实际支出。'),task('把9索拖进商店出售。','[data-drop-zone="sell"]',(g,s)=>!p(g).hand.some(t=>t.face==='2-9')&&p(g).gold===s.before.gold+1),inspect('花2G换牌，观察已购次数不会重置。','[data-action="refresh-shop"]','refresh-shop'),q('换牌后，本回合还可以免费买一次吗？',['不能，首免已用过','可以，每次换牌重置'],0,'换牌不重置首免与最多3次购买，卖出也不占购买次数。')];
 case 'C04':return [setup({...simple,gold:6,shop:['0-7']},task('花6G升到二本，容量从5到8。','[data-action="upgrade"]',g=>p(g).level===2&&cap(p(g))===8)),q('升级后已有候选会立即变成新等级吗？',['不会，下次换牌或新回合生效','会立即重抽'],0,'升级扩容立即生效；新的牌级与异色率从下一次抽商店开始。'),q('三、四本升级费用与容量是？',['10/14G，11/14坑','8/12G，10/12坑'],0,'基础容量5/8/11/14，升级费用6/10/14G。买2/3/4/5G、卖1/2/3/4G，对应白蓝紫橙。')];
 case 'C05':return [{...call('吃'),setup:g=>claimScene(g,'吃')},{...call('碰'),setup:g=>claimScene(g,'碰')},q('谁打的牌，你才能吃？',['上家；你是出牌者下家','任意一家'],0,'吃只限出牌者的下家；碰与杠不受这个座次限制。纹路不参加鸣牌。')];
 case 'C06':return [{...call('杠'),setup:g=>claimScene(g,'杠')},setup({hand:Array(5).fill('0-7'),level:3,privatePack:'万染'},call('暗杠','五张同牌中取四张暗杠，剩一张在手中。')),{...call('加杠'),setup:g=>{scene(g,{hand:Array(4).fill('1-7'),level:2});p(g).melds.push({kind:'碰',tiles:p(g).hand.splice(0,3)});}},setup({hand:Array(8).fill('0-7'),level:4,privatePack:'万染'},task('八张同牌依次声明两副暗杠。','.self-kong-dock',g=>p(g).melds.filter(m=>m.kind==='杠').length===2)),q('已经锁进副露的同四张牌，本轮可以再杠一次吗？',['不能，展示回手后才能重新声明','可以无限重复'],0,'当前副露锁定。跨对决回手后可以重新声明，重新获得临时奖励。')];
 case 'C07':return [setup({hand:[...Array(4).fill('0-7'),'1-1','2-9'],level:1,privatePack:'万染'},call('暗杠')),task('临时容量6。结束购买，等轮到你配牌再回合结束。','[data-action="main"]',g=>g.reports.length>0,{report:true}),q('展示后六张回手，基础5坑，怎么办？',['保留全部，下一正常出牌整理超额','自动删掉一张','容量永久6'],0,'每副当前杠临时＋1，展示后取消。四张仍占四坑，超额不会自动丢失。')];
 case 'C08':return [setup({hand:['0-2','0-3'],river:['1-9']},q('同一张弃牌多人响应，优先级是？',['杠＞碰＞吃，同级按座次','吃＞碰＞杠'],0,'鸣牌副露自动码好，并锁到下次展示结束。')),{...call('吃','这次你可以吃，也可以取消；完成一次响应。'),check:(g,s)=>p(g).melds.length>0||s.events.includes('claim'),setup:g=>claimScene(g,'吃')},q('普通牌被别人碰走，仍能从自己牌河取回吗？',['不能，已归对方','可以随时拿回'],0,'普通鸣牌转移归属；钻石另有原牌回手和复制品规则。')];
 case 'C09':return ['flush','half-flush','honors','green'].flatMap(key=>traitSteps(key,...(key==='green'&&v?[["2-2","2-3","2-4","2-8"],"2-6",5]:TRAIT_FIXTURES[key]),key==='green'?0:v));
 case 'C10':return ['pairs','pungs','pure-outside'].flatMap(key=>traitSteps(key,...TRAIT_FIXTURES[key],v)).concat(q('纯全幺8组件应怎样组成？',['两搭＋一个11或99雀头','任意八张1和9','两搭＋两个雀头'],0,'六档为6/8/9/11/12/14；搭限123/789/111/999，无字牌，最多一个雀头。'));
 case 'C11':return ['straight','mixed-chows'].flatMap(key=>traitSteps(key,...TRAIT_FIXTURES[key],v)).concat(q('已有123万，再来123万，三色同顺会变6组件吗？',['不会，需另一门同起点顺子','会，同门可无限累加'],0,'当前起步3组件允许一门一副；每门最多一副。清龙按一门不同点数计数。'));
 case 'C12':return ['simples','upper','middle','lower'].flatMap(key=>traitSteps(key,...TRAIT_FIXTURES[key],v));
 case 'C13':return ['dragons','winds','five-gates','orphans'].flatMap(key=>traitSteps(key,...TRAIT_FIXTURES[key],v)).concat(q('国士7档与9档的区别？',['7档给番，9档再开放幺九字补计符','7档已让全部散牌计符'],0,'13种齐全为13组件，再加重复幺九字到14；三元每种最多3，四喜同样。'));
 case 'C14':return [setup({hand:['0-1','0-2'],shop:[{face:'0-3',color:v?'green':'red'}],level:1},buy('0-3','买下特殊3万，比较符和番。')),q('一张未成组的红宝，能直接兑现全部潜在符吗？',['不能，但仍可加1番','能，所有散牌都计基础符'],0,'红／绿潜在基础＋2符，参与实际计符才兑现；各自＋1番，绿牌还计绿一色。')];
 case 'C15':return [setup({hand:[{face:'0-1',color:'red'},{face:'0-2',color:'red'}],shop:[{face:'0-3',color:'cyan'}]},buy('0-3','买青宝，观察两张红宝的呼应。')),q('两张红宝、两张青宝，青宝一共加几番？',['4番','2番','8番'],0,'每张青宝为每张生效红宝＋1番，2×2＝4；生效河花也参加。')];
 case 'C16':return [setup({hand:[{face:'2-3',pattern:'h-0'},'2-2','2-4']},selectTrait('honors','点击字一色，找到东风纹路的3索。')),q('东风纹路3索可以当东风碰牌吗？',['不能，只按本体3索鸣牌','可以'],0,'纹路只参加羁绊。同一羁绊每实体最多一次，基础搭仍认实际结算牌面。')];
 case 'C17':return [setup({hand:[{face:'2-3',color:'red',pattern:'h-0',material:'jade'},'2-2','2-4']},inspect('悬浮、长按或点i，查看三维3索。','.hand-tiles','inspect-tile')),q('这张牌同时保留什么？',['红宝颜色、东风纹路、玉材质','只有最后得到的一种属性'],0,'三个独立维度可同时存在，每个维度只有一种值；本体仍是3索。')];
 case 'C18':return [setup({hand:[{face:'0-7',material:'gold'}],level:1,round:2,gold:5},stage('0-7')),unstage('0-7'),stage('0-7'),land('0-7'),setup({hand:[{face:'0-7',material:'gold'}],round:2,level:1,gold:5},task('这次把黄金7万拖进商店出售。','[data-drop-zone="sell"]',g=>!p(g).hand.length&&p(g).gold===6)),q('卖黄金牌会额外再赚弃出2G吗？',['不会，只有原售价','会'],0,'真实弃出才赚2G；待打和出售均不触发，弃出的牌可能被鸣走。')];
 case 'C19':return [setup({hand:[{face:'0-1',material:'jade'},'0-2','0-3'],level:1},stage('0-1')),land('0-1'),take('0-1'),show('保留玉牌，点击回合结束完成展示。'),task('查看玉牌当前倍率，已从×1成长到×1.25。','.hand-capacity',g=>p(g).hand.some(t=>t.material==='jade'&&t.growth===1.25)),q('这次新增＋0.25在哪次得分生效？',['以后对决','刚刚展示追溯再算一次'],0,'本次用旧倍率，展示后成长；只留河不成长。')];
 case 'C20':return [setup({hand:[{face:'0-7',material:'crystal'}],select:true},show('保留这张水晶散牌，结束配牌看得分。')),setup({hand:[{face:'0-7',material:'crystal'}],round:2},stage('0-7')),unstage('0-7'),stage('0-7'),land('0-7','确认打出，观察水晶真实碎裂。'),q('水晶的展示效果是？',['＋10符、＋5番，先于玉钻乘算','固定×5','弃出赚5G'],0,'水晶明确提供符；真实打出碎裂，不能取回，也不开放鸣牌。')];
 case 'C21':return [setup({hand:[{face:'0-7',material:'diamond'}],opponents:[['0-7','0-7']],level:1,round:2},stage('0-7')),task('回合结束，让下家真实碰走钻石复制品。','[data-action="main"]',g=>p(g).hand.some(t=>t.material==='diamond'&&t.diamond===1.5)&&g.players[1].melds.some(m=>m.tiles.some(t=>t.material==='diamond'&&t.diamond===1.25))),q('哪一张成长并回到出牌者手里？',['原牌；复制品保留成长前倍率','复制品；原牌进对方副露'],0,'原牌永久＋0.25。复制品独立保留颜色、纹路、材质，展示不重置。自杠和取消不生成复制品。')];
 case 'C22':return [setup({hand:v?['h-4','0-7','h-4','h-4']:['h-4','h-4','h-4','0-7'],level:3},task('拖动7万到最左，让后面的三张中复制它。','.hand-tiles',g=>copyLeft(owned(p(g))).wildCopies.length===3&&p(g).hand[0].face==='0-7')),q('展示按羁绊重码后，赖子目标会变吗？',['不会，按真实手牌顺序已解析','会，每次动画排序重算'],0,'最左红中无左邻不变，连续中从左往右复制已解析左邻；保留自己的特殊属性。')];
 case 'C23':return [setup({hand:['2-1','1-8','0-1','0-2','0-3'],opponents:[['2-1','1-8']],select:true},show('展示捉鸡，留意最后的两次压制。')),q('一位对手发动捉鸡，你有两张相关牌，最终倍率是？',['0.81','0.8','0.9'],0,'每张各×0.9，因此0.9×0.9＝0.81；本家潜在基础翻倍仍需计符资格。')];
 case 'C24':return [{...task('点击暗杠，让已激活宝牌多翻一张指示物。','.self-kong-dock',(g,s)=>p(g).indicators.length>s.before.indicators),setup:g=>{scene(g,{hand:[{face:'0-1',color:'red'},{face:'0-2',color:'red'},...Array(4).fill('2-9'),'0-5'],level:3});p(g).doraActive=true;p(g).indicators=['0-4'];}},q('指示物4万，对应哪张加符？',['5万，每个匹配＋3符','4万，每张＋4番'],0,'下一张是目标，9绕回1；东南西北循环，中发白循环。两张生效红宝激活。')];
 case 'C25':return [setup({hand:['0-1','0-2','0-3','f-0'],level:4},stage('f-0')),land('f-0'),show('让春留在牌河，完成展示。'),q('春留河两次展示后，下一次基础加成是？',['仍＋1番','累积＋3番'],0,'留本人河期间每次重新给1番、不占坑；取回暂停，花牌不能鸣。')];
 case 'C26':return [setup({hand:['0-1','0-2','0-3'],river:[{face:'f-0',color:'green',pattern:'h-0'},{face:'f-1',color:'red'},{face:'f-2',color:'cyan'}],level:4},selectTrait('honors','点字一色，高亮花河里的东风纹路春。')),q('红花留河，基础番与颜色番合计多少？',['2番','1番','3番'],0,'红绿花1基础＋1颜色；绿计绿一色、青呼应本家红宝、纹路补羁绊，不直接提供成搭符。')];
 case 'C27':return [setup({hand:['0-1','0-2','0-3'],river:[{face:'f-0',material:'diamond'},{face:'f-1',material:'gold'},{face:'f-2',material:'jade',growth:1.5}],level:4,select:true},show('展示三种材质花，比较其生效结果。')),q('哪个说法正确？',['钻石花固定×2，黄金花无持续加成','黄金花也＋1番','水晶花＋10符'],0,'玉花按当前倍率，留河不自动成长；不存在水晶花。只有番与倍率、没有符仍0分。')];
 case 'C28':return [{...task('第一次做局：从三套备选中选一套。','.draft-grid',g=>p(g).packs.length>0),setup:g=>{scene(g,{round:6,level:2});g.returnShop(0);g.phase='result';g.continue();}},{...task('第二次做局：依据新缺口再次选择。','.draft-grid',g=>p(g).packs.length>1),setup:g=>{scene(g,{round:15,level:3,privatePack:'万染',hand:['0-1','0-2','0-3']});g.returnShop(0);g.phase='result';g.continue();}},q('一局何时做局，每包多少张？',['第2和5次对决后，各36张','第2/5/8次，各30张'],0,'万筒索染、字一色、幺九、全中都是36张。只进行两次扩池。')];
 case 'C29':return [{...inspect('打开牌源，查看2个人＋3公共。','[data-action="pools"]','pools'),setup:g=>{scene(g,{round:7,level:1,privatePack:'全中'});g.returnShop(0);g.fillShop(0);}},q('一本商店从个人全中池摸到普通5，可以买吗？',['可以，个人池无本数限制，仍按原价','不能，必须三本'],0,'公共不足由个人补位；公共空时全个人，另一来源不足也会补位。未购和卖出回原来源。')];
 case 'C30':return [setup({hand:[{face:'0-1',color:'red',pattern:'h-0',material:'jade'}],level:4},inspect('查看三重牌的三个维度。','.hand-tiles','inspect-tile')),q('每维6.4%意味着每张牌总异色率6.4%吗？',['不是；三个维度分别判断','是，整牌只有一次判定'],0,'保留已有维度，仅为空维度追加；个人包自带与商店叠加，三重牌跳过。概率提升不保证下张出现。')];
 case 'C31':return [setup({hand:['0-1','0-1','1-2','1-2','2-3','2-3',{face:'0-7',material:'crystal'},{face:'1-9',material:'jade',growth:1.5}],level:3,select:true},show('观看普通雀头、七对子、水晶和玉依次计分。')),q('加法与乘法正确次序是？',['先累计符与番，水晶加完，再玉钻，最后压制取整','每报一个番就再乘一次累计番','先乘玉再加水晶符'],0,'番数直接作倍率，0番按×1。普通四搭一雀头；七对独立再算对子；国士9补计幺九字。')];
 case 'C32':return [{...inspect('点击任一家重播，再试暂停与倍速。','.result-replay','score-review'),setup:g=>{scene(g,{hand:['0-1','0-2','0-3','1-9'],select:true});g.preparation={stage:'ready',completed:[1,2,3,0]};g.settle();}},inspect('点击暂停／开始，控制只读回放。','.playback-controls','score-play'),q('悬浮对手头像看到的是？',['上次完成对决的公开报告','当前隐藏手牌'],0,'切页和重播不重复入账。0.25—3倍可调，对手相对为1.2倍。')];
 case 'C33':return [setup(simple,q('本地账号在另一台手机会自动同步吗？',['不会，需要导出再导入备份','会，昵称一样就行'],0,'账号与牌局保存在当前浏览器。改名不换槽，导入创建新账号。不要清除网站数据。')),task('点击练习内的备份演示，下载并验证演示账号文件。',null,(_g,s)=>s.events.includes('backup-demo'),{tool:'backup'}),q('要练习删除账号，应使用哪个？',['隔离演示账号，不操作真实账号','正在使用的真实账号'],0,'练习备份只含演示牌局，不修改正式账号、资产与历史。')];
 case 'C34':return [setup(simple,inspect('隐藏／显示一次商店，查看完整牌桌。','[data-action="shop-toggle"]','shop-toggle')),inspect('切换一次音乐；音效可另行设置。','[data-action="music"]','music'),q('手机应如何游玩和查询特殊牌？',['横屏，长按牌或点击问号','竖屏，必须悬浮鼠标'],0,'竖屏显示旋转提示并暂停展示；静音与减少动态仍能完成所有任务。')];
 case 'D01':return [setup({shop:transfer(v,['0-1','0-2','0-3','2-7','1-9']),level:1,gold:5},task('无箭头：购买并保留至少一搭，完成第一次展示。',null,g=>g.reports.some(r=>r.results[0].groups.some(t=>['顺子','刻子','杠'].includes(t.kind))),{report:true}))];
 case 'D02':return [setup({hand:transfer(v,['0-1','0-2']),shop:transfer(v,['0-3','2-8','1-9']),level:1,gold:4},task('用首免补齐一搭，并保留至少4G。',null,g=>trainingScore(g).scoredCount>=3&&p(g).gold>=4)),q('你保留金币的理由？',['之后可以升级或补关键牌','金币会直接变成番'],0,'金币用于经营，不直接计为番。不同路线可有不同投入时机。')];
 case 'D03':return [setup({hand:['2-2','2-3','2-4','2-6'],shop:[{face:'2-8',pattern:'h-0'},'0-9'],level:2},task('选择一张，激活绿一色，并找到其字牌纹路组件。',null,g=>trainingScore(g).traits.find(t=>t.id==='green').stage>0)),selectTrait('honors')];
 case 'D04':return [setup({hand:[{face:'0-7',material:'diamond'},{face:'1-9',material:'gold'},{face:'2-9',material:'jade'}],opponents:[['0-7','0-7']],level:2,round:2},task('无箭头：让黄金真实弃出赚钱，或让钻石被鸣成长。',null,(g,s)=>p(g).river.some(t=>t.material==='gold')&&p(g).gold>=s.before.gold+2||p(g).hand.some(t=>t.material==='diamond'&&t.diamond>=1.5))),q('收益的代价可能是？',['对手得到组件，或原牌回手后超额','完全没有代价'],0,'普通黄金或玉可能被鸣走；钻石给对手复制品，也可能挤占自己容量。')];
 case 'D05':return [setup({hand:['0-1','0-2','0-3','f-0',{face:'f-1',material:'gold'}],level:4},task('无箭头：把两张花打入本人河，保留基础一搭。',null,g=>p(g).river.filter(t=>t.face.startsWith('f-')).length===2&&trainingScore(g).symbols>0)),q('这两张留河花，持续基础番合计？',['1番','2番'],0,'黄金花不提供持续加成，普通春提供1番。')];
 case 'D06':return stepsFor('C28',variant).slice(0,2).concat(q('第二次做局必须沿用第一次路线吗？',['不必，可按来牌和缺口调整','必须选择同一牌包'],0,'做局塑造供给，不保证某张牌。以当前构筑与未来空间决定。'));
 case 'D07':return [setup({hand:['0-1','1-2','2-3','h-0','h-4'],level:3,select:true},show('先看这手五门齐为什么仍然0分。')),q('这次失分的主要原因是？',['没有有效基础符，番不能凭空生分','五门齐没有激活'],0,'五个不同实体覆盖五门，起步档有效；但散牌没有符。可补一搭或一个雀头。'),q('再拿一张东，可能改善什么？',['组成普通雀头并提供符','直接变成满档四喜'],0,'先保证基础符，再提高番与倍率。')];
 case 'D08':return [{...task('独立经营24回合，完成8次对决；可以查帮助。',null,g=>g.phase==='over'&&g.reports.length===8),setup:g=>{const n=new Game(98173+variant);n.training={kind:'full',variant};Object.assign(g,n);}}];
 default:throw Error('未找到课程');
 }
}
export function stepsFor(id,variant=0){return buildSteps(id,variant).map((raw,index)=>{const t={...raw,key:id+':'+index};if(id==='A'){if(index<=4)t.window={round:1,stage:'shop'};else if(index>=6&&index<=8)t.window={round:2,stage:'shop'};else if(index>=10&&index<=13)t.window={round:3,stage:'shop'};else if(index===14)t.window={round:3,stage:'river'};else if(index>=15&&index<=17)t.window={round:3,stage:'preparation'};else if(index>=19&&index<=21)t.window={round:3,stage:'review'};if(index>=24&&t.kind!=='briefing')t.coached=true;}if(variant!==1||!t.options)return t;const answer=t.options.length-1-t.answer;return {...t,options:t.options.slice().reverse(),answer,check:(_g,s)=>s.answer===answer};});}
export function createTraining(id,variant=0){const g=id==='A'?introGame(variant):freshTraining(variant),steps=stepsFor(id,variant);steps[0].setup?.(g);return {game:g,steps};}
export function stateBefore(g){return {hand:p(g).hand.map(t=>t.uid),gold:p(g).gold,indicators:p(g).indicators.length,score:p(g).score,seed:g.seed,round:g.round,phase:g.phase,preparation:g.preparation?.stage||null};}
export const COACH_HINTS=[
 {id:'capacity',text:'超出容量时，把牌拖到待打区。确认前可以撤回或交换。',target:'.pending-discard-zone',when:g=>usage(p(g))>cap(p(g))},
 {id:'upgrade',text:'现在可以升本：容量立即＋3，新候选从下次换牌或新回合开始。',target:'[data-action="upgrade"]',when:g=>g.phase==='shop'&&p(g).level<4&&p(g).gold>=g.config.upgrade[p(g).level]},
 {id:'claim',text:'手牌右上方可以吃碰杠，也可取消。副露锁到下次展示结束。',target:'.claim-dock',when:g=>g.pending?.options[0]?.to===0},
 {id:'special',text:'特殊牌可悬浮或长按查询。颜色、纹路、材质可以同时存在。',target:'.special-face',when:g=>owned(p(g)).some(t=>t.color||t.material||t.pattern)},
 {id:'flower',text:'花牌打入本人河后每次加番、不占坑；黄金花没有持续加成。',target:'.hand-tiles',when:g=>p(g).hand.some(t=>t.face.startsWith('f-'))},
 {id:'draft',text:'做局改变后续供给，每包36张。先看当前路线，再看特殊维度比例。',target:'.draft-grid',when:g=>g.phase==='draft'},
 {id:'pool',text:'现在正常每店2个人＋3公共，个人池不受本数限制。',target:'.offer-source',when:g=>g.phase==='shop'&&p(g).packs.length>0},
 {id:'result',text:'切四家分页或重播，查看哪些牌提供符、哪些羁绊还差一档。',target:'.result-replay',when:g=>g.phase==='result'},
 {id:'over',text:'八次对决累计分决定名次，本地账号会保留近期记录。',target:'.rank-banner',when:g=>g.phase==='over'}
];
