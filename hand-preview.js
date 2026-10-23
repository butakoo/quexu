import {owned} from './game.js?v=0.28.2';

// Only the preview excludes pending discards. Physical ownership stays unchanged.
export function previewTiles(game,seat=0){
 const p=game.players[seat],pending=new Set(seat===0?game.plannedDiscards||[]:[]);
 const tiles=seat===0&&game.phase==='showdown'&&!game.preparation?game.displayPool().filter(t=>game.selected.includes(t.uid)):owned(p);
 return tiles.filter(t=>!pending.has(t.uid));
}
