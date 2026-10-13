// One trace drives both the settlement and its presentation. Round only at the end.
export function calculateTrace(additions,fanMultiplier,extras=[],reveals=[]){
 if(!Number.isFinite(fanMultiplier)||fanMultiplier<0)throw Error('番倍率无效');
 const steps=[];let value=0;
 for(const a of additions){if(!Number.isFinite(a.amount)||a.amount<0)throw Error('符数无效');const before=value;value+=a.amount;if(!Number.isFinite(value))throw Error('符数超出范围');steps.push({...a,area:'add',before,after:value});}
 for(const reveal of reveals){if(!Number.isFinite(reveal.fan)||reveal.fan<0)throw Error('羁绊番数无效');steps.push({...reveal,area:'trait',before:value,after:value});}
 let before=value;value*=fanMultiplier;if(!Number.isFinite(value))throw Error('番数乘算超出范围');steps.push({area:'fan',label:'合计番数',factor:fanMultiplier,before,after:value});
 for(const e of extras){if(!Number.isFinite(e.factor)||e.factor<0)throw Error('额外倍率无效');before=value;value*=e.factor;if(!Number.isFinite(value))throw Error('分数超出范围');steps.push({...e,area:'extra',before,after:value});}
 return {symbols:steps.filter(s=>s.area==='add').reduce((sum,s)=>sum+s.amount,0),fanMultiplier,steps,unrounded:value,total:Math.round(value)};
}
