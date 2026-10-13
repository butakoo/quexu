// One trace drives both the settlement and its presentation. Round only at the end.
export function calculateTrace(additions,fanMultiplier,extras=[],reveals=[],{direct=false}={}){
 if(!Number.isFinite(fanMultiplier)||fanMultiplier<0)throw Error('番倍率无效');
 const steps=[];let value=0;
 for(const a of additions){if(!Number.isFinite(a.amount)||a.amount<0)throw Error('符数无效');const before=value;value+=a.amount;if(!Number.isFinite(value))throw Error('符数超出范围');steps.push({...a,area:'add',before,after:value});}
 let symbols=value,accumulatedFan=0;
 for(const reveal of reveals){if(!Number.isFinite(reveal.fan)||reveal.fan<0)throw Error('羁绊番数无效');const before=value;if(direct&&reveal.amount!==undefined){if(!Number.isFinite(reveal.amount)||reveal.amount<0)throw Error('特殊符数无效');symbols+=reveal.amount;}accumulatedFan+=reveal.fan;if(direct)value=symbols*Math.max(1,accumulatedFan);if(!Number.isFinite(value))throw Error('番数乘算超出范围');steps.push({...reveal,area:direct&&reveal.amount!==undefined?'special-symbols':direct&&!reveal.traitId?'special-fan':'trait',before,after:value,symbols,accumulatedFan,mainMultiplier:direct?Math.max(1,accumulatedFan):1});}
 if(direct){if(fanMultiplier!==Math.max(1,accumulatedFan))throw Error('番数与流水线不一致');}else{const before=value;value*=fanMultiplier;if(!Number.isFinite(value))throw Error('番数乘算超出范围');steps.push({area:'fan',label:'合计番数',factor:fanMultiplier,before,after:value});}
 let before;
 for(const e of extras){if(!Number.isFinite(e.factor)||e.factor<0)throw Error('额外倍率无效');before=value;value*=e.factor;if(!Number.isFinite(value))throw Error('分数超出范围');steps.push({...e,area:'extra',before,after:value});}
 return {mode:direct?'direct-fan':'legacy',symbols,fanMultiplier,steps,unrounded:value,total:Math.round(value)};
}
