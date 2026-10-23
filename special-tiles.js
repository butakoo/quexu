// Compound values stay in the existing scalar fields, so old single-dimension saves remain valid.
export const COLOR_BASE={red:'红宝',green:'绿宝',cyan:'青宝'};
export const MATERIAL_BASE={gold:'黄金',jade:'玉',crystal:'水晶',diamond:'钻石'};
export const ALL_FACES=[...Array.from({length:3},(_,s)=>Array.from({length:9},(_,n)=>`${s}-${n+1}`)).flat(),...Array.from({length:7},(_,n)=>`h-${n}`),...Array.from({length:8},(_,n)=>`f-${n}`)];
const bases={color:Object.keys(COLOR_BASE),material:Object.keys(MATERIAL_BASE),pattern:ALL_FACES};
const tops={color:'rainbow',material:'star',pattern:'infinite'};
export function effectsOf(tile,dim){const value=tile?.[dim];return !value?[]:value===tops[dim]?bases[dim].slice():value.split('+');}
export const hasColor=(t,c)=>effectsOf(t,'color').includes(c);
export const hasMaterial=(t,m)=>effectsOf(t,'material').includes(m);
export const isFragile=t=>hasMaterial(t,'crystal')&&t.material!=='star';
export function compound(dim,values){const unique=bases[dim].filter(v=>values.includes(v));if(dim==='pattern'&&unique.length>=3||dim!=='pattern'&&unique.length===bases[dim].length)return tops[dim];return unique.join('+')||null;}
export function validDimension(dim,value){if(value===null||value===undefined)return true;if(typeof value!=='string'||!value)return false;if(value===tops[dim])return true;const list=value.split('+');return new Set(list).size===list.length&&list.every(v=>bases[dim].includes(v))&&(dim==='pattern'?list.length<=2:list.length<bases[dim].length);}
export function dimensionName(tile,dim){const v=tile?.[dim];if(!v)return '';if(v===tops[dim])return {color:'虹宝',material:'星核',pattern:'无穷纹路'}[dim];if(dim==='pattern')return effectsOf(tile,dim).map(faceName).join('／')+'纹路';const names=dim==='color'?COLOR_BASE:MATERIAL_BASE;return effectsOf(tile,dim).map(x=>names[x]).join('·');}
export function faceName(f){if(f.startsWith('h-'))return ['东','南','西','北','中','发','白'][Number(f.slice(2))];if(f.startsWith('f-'))return ['春','夏','秋','冬','梅','兰','竹','菊'][Number(f.slice(2))];return f.slice(2)+['万','筒','索'][Number(f[0])];}
export function specialClasses(t){return [...effectsOf(t,'color').map(v=>'color-'+v),...effectsOf(t,'material').map(v=>'mat-'+v),...['color','material','pattern'].filter(k=>effectsOf(t,k).length>1).map(k=>'compound-'+k),...['color','material','pattern'].filter(k=>t[k]===tops[k]).map(k=>'apex-'+k)].join(' ');}
const pick=(a,rng)=>a[Math.min(a.length-1,Math.floor(rng()*a.length))];
export function randomDimension(dim,tile,rng,{twin=true}={}){const choices=bases[dim].filter(v=>dim!=='pattern'||v!==tile.face).filter(v=>dim!=='material'||!tile.face.startsWith('f-')||v!=='crystal');const first=pick(choices,rng),out=[first];if(twin&&rng()<.1)out.push(pick(choices.filter(v=>v!==first),rng));return compound(dim,out);}
export function initializeGrowth(t){if(hasMaterial(t,'jade')&&t.jadeVersion!==2){t.growth=1;t.jadeVersion=2;t.jadePending=false;}if(hasMaterial(t,'diamond')&&t.diamondVersion!==1){t.diamond=1.25;t.diamondVersion=1;}return t;}
export function normalizeSpecialFlower(t){if(!t.face.startsWith('f-'))return t;for(const obj of [t,t.native])if(obj&&obj.material!=='star'&&hasMaterial(obj,'crystal'))obj.material=compound('material',effectsOf(obj,'material').filter(x=>x!=='crystal'));return t;}
function names(base,dim){const out={...base};const keys=Object.keys(base);for(let mask=1;mask<(1<<keys.length)-1;mask++){const values=keys.filter((_,i)=>mask&(1<<i));out[values.join('+')]=values.map(v=>base[v]).join('·');}out[tops[dim]]=dim==='color'?'虹宝':'星核';return Object.freeze(out);}
export const COLOR_NAMES=names(COLOR_BASE,'color'),MATERIAL_NAMES=names(MATERIAL_BASE,'material');
