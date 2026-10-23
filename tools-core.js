import {effectsOf,hasMaterial,isFragile,compound,randomDimension,initializeGrowth} from './special-tiles.js?v=0.28.1';
export const TOOL_RULES=Object.freeze({price:10,enchantDouble:.11,enchantTriple:.01});
export const TOOL_TYPES=Object.freeze({
 wipe:Object.freeze({name:'抹',description:'转化待打区所有牌。数牌换门不换点；字与花互转，保留全部异色。'}),
 enchant:Object.freeze({name:'附',description:'为待打牌添加或强化随机异色。小概率强化两维，极小概率三维；同维效果合并，成长保留，可晋升顶级异色。'}),
 fuse:Object.freeze({name:'融',description:'把待打牌融合为一张。两个不同牌面随机作主副，合并全部颜色、材质与已有纹路，保留最高成长；集齐效果可晋升顶级异色。'})
});
// 三个独立空维度的基础概率：道具率介于至少一维与至少两维之间。
export function toolOfferRate(rate){const p=Math.max(0,Math.min(1,Number(rate)||0)),single=1-(1-p)**3,double=3*p*p-2*p*p*p;return Math.min(1,1.5*Math.sqrt(single*double));}
export function createToolState(seed){return {version:1,seed:((seed>>>0)^0x6a09e667)>>>0||1,seq:0,bags:[[],[],[],[]],offers:[[],[],[],[]]};}
export function toolRandom(state){let x=state.seed;x^=x<<13;x^=x>>>17;x^=x<<5;state.seed=x>>>0||1;return state.seed/4294967296;}
const clone=t=>JSON.parse(JSON.stringify(t));
const numeric=t=>/^[012]-[1-9]$/.test(t.face),flower=t=>t.face.startsWith('f-');
const count=t=>['color','pattern','material'].filter(k=>t[k]).length;
const pick=(list,rng)=>list[Math.min(list.length-1,Math.floor(rng()*list.length))];
export function fusionPairs(tiles){
 let pairs=[];for(const a of tiles)for(const b of tiles)if(a.uid!==b.uid&&a.face!==b.face)pairs.push([a,b]);
 // 如果只有水晶材质可以继承，选非花主牌，保证没有水晶花。
 const materials=tiles.flatMap(t=>effectsOf(t,'material'));if(materials.includes('crystal')&&new Set(materials).size<4&&!tiles.some(t=>t.material==='star'))pairs=pairs.filter(([a])=>!flower(a));
 return pairs;
}
export function validateToolTargets(kind,tiles){
 if(!TOOL_TYPES[kind])throw Error('未知道具');
 if(!tiles.length)throw Error('先把要处理的牌拖入待打区');
 if(new Set(tiles.map(t=>t.uid)).size!==tiles.length)throw Error('待打牌不能重复');
 if(kind==='enchant'&&tiles.every(t=>t.color==='rainbow'&&t.pattern==='infinite'&&t.material==='star'))throw Error('这些牌的三个维度已经全部登顶');
 if(kind==='fuse'&&(tiles.length<2||!fusionPairs(tiles).length))throw Error('融需要至少两种不同牌面');
}
// 返回方案，调用方验证后一次性提交。输入实体不变，非法目标不会消费随机数。
export function resolveTool(kind,tiles,rng,api){
 validateToolTargets(kind,tiles);const before=tiles.map(clone);
 if(kind==='wipe'){
  const after=before.map(t=>{const choices=numeric(t)?api.TYPES.filter(d=>d.s<3&&d.n===Number(t.face.split('-')[1])&&d.id!==t.face):api.TYPES.filter(d=>d.s>=3&&d.id!==t.face&&(!isFragile(t)||d.s!==4));t.face=pick(choices,rng).id;return t;});
  return {kind,before,after,retired:[]};
 }
 if(kind==='enchant'){
  const after=before.map(t=>{const empty=['color','pattern','material'].filter(k=>t[k]!==({color:'rainbow',pattern:'infinite',material:'star'}[k]));if(!empty.length)return t;const r=rng(),n=Math.min(empty.length,r<TOOL_RULES.enchantTriple?3:r<TOOL_RULES.enchantTriple+TOOL_RULES.enchantDouble?2:1);
   for(let i=0;i<n;i++){const dim=pick(empty,rng);empty.splice(empty.indexOf(dim),1);
    const current=effectsOf(t,dim),candidates=dim==='color'?['red','green','cyan']:dim==='material'?['gold','jade','crystal','diamond']:api.TYPES.map(d=>d.id).filter(f=>f!==t.face);
    const choices=candidates.filter(v=>!current.includes(v)).filter(v=>dim!=='material'||!flower(t)||v!=='crystal'||current.length===3);
    if(!choices.length)continue;
    t[dim]=compound(dim,[...current,pick(choices,rng)]);initializeGrowth(t);
   }
   t.native={...t.native,color:t.color||null,pattern:t.pattern||null,material:t.material||null};return t;
  });return {kind,before,after,retired:[]};
 }
 const [main,pattern]=pick(fusionPairs(tiles),rng),result=clone(main);
 result.pattern=compound('pattern',[pattern.face,...tiles.flatMap(t=>effectsOf(t,'pattern'))]);result.color=compound('color',tiles.flatMap(t=>effectsOf(t,'color')));
 result.material=compound('material',tiles.flatMap(t=>effectsOf(t,'material')));
 result.growth=1;result.diamond=1;result.jadePending=false;delete result.jadeVersion;delete result.diamondVersion;
 if(hasMaterial(result,'jade')){const jade=tiles.filter(t=>hasMaterial(t,'jade')).sort((a,b)=>api.jadeMultiplier(b)-api.jadeMultiplier(a))[0];result.growth=api.jadeMultiplier(jade);result.jadeVersion=2;result.jadePending=!!jade.jadePending;}
 if(hasMaterial(result,'diamond')){result.diamond=Math.max(...tiles.filter(t=>hasMaterial(t,'diamond')).map(api.diamondMultiplier));result.diamondVersion=1;}
 result.native={color:result.color,pattern:result.pattern,material:result.material};result.bought=true;
 return {kind,before,after:[result],retired:tiles.filter(t=>t.uid!==main.uid).map(t=>t.uid)};
}
