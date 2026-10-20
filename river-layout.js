// 只决定牌河中的显示位置；不移动实体，也不改变弃牌、鸣牌或取回顺序。
export function riverLayout(tiles,incoming=null){
 const entries=tiles.map(tile=>({tile,incoming:false}));
 if(incoming&&!tiles.some(t=>t.uid===incoming.uid))entries.push({tile:incoming,incoming:true});
 const compact=entries.length>12,columns=compact?10:6,slots=[];
 entries.forEach((entry,index)=>{
  const slot=index%30;
  if(!slots[slot])slots[slot]={index:slot,column:slot%columns+1,row:Math.floor(slot/columns)+1,entries:[]};
  slots[slot].entries.push({...entry,layer:Math.floor(index/30)});
 });
 return {compact,columns,rows:Math.ceil(slots.length/columns),slots};
}
