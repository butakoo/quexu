export const TOOL_RULES=Object.freeze({price:10,enchantDouble:.11,enchantTriple:.01});
export const TOOL_TYPES=Object.freeze({
 wipe:Object.freeze({name:'抹',description:'转化待打区所有牌。数牌换门不换点；字与花互转，保留全部异色。'}),
 enchant:Object.freeze({name:'附',description:'为待打牌补上随机异色。保留已有维度和成长，小概率补两维、极小概率补三维。'}),
 fuse:Object.freeze({name:'融',description:'把待打牌融合为一张。随机取两个不同牌面作主牌与纹路，继承其中一种颜色和一种材质；材质保留成长。'})
});
// 三个独立空维度的基础概率：道具率介于至少一维与至少两维之间。
export function toolOfferRate(rate){const p=Math.max(0,Math.min(1,Number(rate)||0)),single=1-(1-p)**3,double=3*p*p-2*p*p*p;return Math.sqrt(single*double);}
export function createToolState(seed){return {version:1,seed:((seed>>>0)^0x6a09e667)>>>0||1,seq:0,bags:[[],[],[],[]],offers:[[],[],[],[]]};}
export function toolRandom(state){let x=state.seed;x^=x<<13;x^=x>>>17;x^=x<<5;state.seed=x>>>0||1;return state.seed/4294967296;}
const clone=t=>JSON.parse(JSON.stringify(t));
const numeric=t=>/^[012]-[1-9]$/.test(t.face),flower=t=>t.face.startsWith('f-');
const count=t=>['color','pattern','material'].filter(k=>t[k]).length;
const pick=(list,rng)=>list[Math.min(list.length-1,Math.floor(rng()*list.length))];
export function fusionPairs(tiles){
 let pairs=[];for(const a of tiles)for(const b of tiles)if(a.uid!==b.uid&&a.face!==b.face)pairs.push([a,b]);
 // 如果只有水晶材质可以继承，选非花主牌，保证没有水晶花。
 const materials=tiles.filter(t=>t.material);if(materials.length&&materials.every(t=>t.material==='crystal'))pairs=pairs.filter(([a])=>!flower(a));
 return pairs;
}
export function validateToolTargets(kind,tiles){
 if(!TOOL_TYPES[kind])throw Error('未知道具');
 if(!tiles.length)throw Error('先把要处理的牌拖入待打区');
 if(new Set(tiles.map(t=>t.uid)).size!==tiles.length)throw Error('待打牌不能重复');
 if(kind==='enchant'&&tiles.every(t=>count(t)===3))throw Error('这些牌已经是三重异色，无需使用附');
 if(kind==='fuse'&&(tiles.length<2||!fusionPairs(tiles).length))throw Error('融需要至少两种不同牌面');
}
// 返回方案，调用方验证后一次性提交。输入实体不变，非法目标不会消费随机数。
export function resolveTool(kind,tiles,rng,api){
 validateToolTargets(kind,tiles);const before=tiles.map(clone);
 if(kind==='wipe'){
  const after=before.map(t=>{const choices=numeric(t)?api.TYPES.filter(d=>d.s<3&&d.n===Number(t.face.split('-')[1])&&d.id!==t.face):api.TYPES.filter(d=>d.s>=3&&d.id!==t.face&&(t.material!=='crystal'||d.s!==4));t.face=pick(choices,rng).id;return t;});
  return {kind,before,after,retired:[]};
 }
 if(kind==='enchant'){
  const after=before.map(t=>{const empty=['color','pattern','material'].filter(k=>!t[k]);if(!empty.length)return t;const r=rng(),n=Math.min(empty.length,r<TOOL_RULES.enchantTriple?3:r<TOOL_RULES.enchantTriple+TOOL_RULES.enchantDouble?2:1);
   for(let i=0;i<n;i++){const dim=pick(empty,rng);empty.splice(empty.indexOf(dim),1);
    if(dim==='color')t.color=pick(Object.keys(api.COLORS),rng);
    if(dim==='pattern')t.pattern=pick(api.TYPES.filter(d=>d.s<4&&d.id!==t.face),rng).id;
    if(dim==='material'){t.material=pick(Object.keys(api.MATERIALS).filter(m=>!flower(t)||m!=='crystal'),rng);if(t.material==='jade'){t.growth=1;t.jadeVersion=2;t.jadePending=false;}if(t.material==='diamond'){t.diamond=1.25;t.diamondVersion=1;}}
   }
   t.native={...t.native,color:t.color||null,pattern:t.pattern||null,material:t.material||null};return t;
  });return {kind,before,after,retired:[]};
 }
 const [main,pattern]=pick(fusionPairs(tiles),rng),result=clone(main),colors=tiles.filter(t=>t.color),materials=tiles.filter(t=>t.material&&(!flower(main)||t.material!=='crystal'));
 result.pattern=pattern.face;result.color=colors.length?pick(colors,rng).color:null;
 const material=materials.length?pick(materials,rng):null;result.material=material?.material||null;
 result.growth=1;result.diamond=1;result.jadePending=false;delete result.jadeVersion;delete result.diamondVersion;
 if(result.material==='jade'){result.growth=api.jadeMultiplier(material);result.jadeVersion=2;result.jadePending=!!material.jadePending;}
 if(result.material==='diamond'){result.diamond=api.diamondMultiplier(material);result.diamondVersion=1;}
 result.native={color:result.color,pattern:result.pattern,material:result.material};result.bought=true;
 return {kind,before,after:[result],retired:tiles.filter(t=>t.uid!==main.uid).map(t=>t.uid)};
}
