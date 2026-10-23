import {hasColor} from './special-tiles.js?v=0.28.2';
import {score,copyLeft,traitComponents} from './game.js?v=0.28.2';

// Return physical tile IDs. Pattern identities and left-copy wilds use the same
// rules as settlement, without changing hand order or discard selection.
export function getTraitHint(tiles,id,result=score(tiles)){
 const resolved=[...copyLeft(tiles).tiles,...(result.riverFlowers||[])];
 const special={
  'special-wild':{name:'赖子',need:3,tiles:tiles.filter(t=>t.face==='h-4')},
  'special-chicken':{name:'捉鸡',need:2,tiles:resolved.filter(t=>['2-1','1-8'].includes(t.face))},
  'special-dora':{name:'宝牌',need:2,tiles:[...tiles,...(result.riverFlowers||[])].filter(t=>hasColor(t,'red'))}
 }[id];
 if(special){const count=special.tiles.length;return count?{id,name:special.name,count,active:count>=special.need,next:count<special.need?special.need:null,fan:null,uids:special.tiles.map(t=>t.uid)}:null;}
 const trait=result.traits.find(t=>t.id===id);
 if(!trait?.count)return null;
 return {id,name:trait.name,count:trait.count,active:trait.stage>0,next:trait.thresholds.find(n=>n>trait.count)??null,fan:trait.fan,uids:traitComponents(resolved,id,trait.count)};
}
