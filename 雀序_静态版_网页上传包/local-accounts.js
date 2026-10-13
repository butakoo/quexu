export const AVATARS=['雀','竹','露','松','云','月','风','花'];
const uuid=/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const fresh=()=>({snapshot:null,revision:0,runId:crypto.randomUUID(),savedAt:null,history:[]});
const validName=name=>typeof name==='string'&&[...name.trim()].length>=1&&[...name.trim()].length<=20&&!/[\u0000-\u001f]/.test(name);
const profileOK=p=>p&&uuid.test(p.id)&&validName(p.name)&&AVATARS.includes(p.avatar);
export class LocalAccounts extends EventTarget{
 constructor({storage,validate,scope='/'}){
  super();this.storage=storage;this.validate=validate;this.prefix='quexu-local-v1:'+encodeURIComponent(scope)+':';this.registryKey=this.prefix+'accounts';this.registry={version:1,activeId:null,profiles:[]};this.current=null;this.meta=fresh();this.conflict=null;this.storageIssue=null;this.pendingSnapshot=null;this.initialError=null;
  try{this.registry=this.readRegistry();}catch(e){this.initialError=e.message;}
 }
 get ready(){return !!this.current&&!this.conflict&&!this.storageIssue;}
 emit(type,detail){this.dispatchEvent(new CustomEvent(type,{detail}));}
 changed(){this.emit('change');}
 readRegistry(){const raw=this.storage.getItem(this.registryKey);if(!raw)return {version:1,activeId:null,profiles:[]};let value;try{value=JSON.parse(raw);}catch{throw Error('本机账号列表无法读取，请保留浏览器数据并尝试导入备份。');}if(value.version!==1||!Array.isArray(value.profiles)||value.profiles.length>100||value.profiles.some(p=>!profileOK(p))||new Set(value.profiles.map(p=>p.id)).size!==value.profiles.length)throw Error('本机账号列表无效，未覆盖原数据。');return value;}
 writeRegistry(value){try{this.storage.setItem(this.registryKey,JSON.stringify(value));}catch{throw Error('浏览器无法保存账号，请允许网站存储或释放空间后重试。');}this.registry=value;}
 key(id){if(!uuid.test(id))throw Error('账号编号无效');return this.prefix+'save:'+id;}
 checkRecord(value){if(!value||!Number.isSafeInteger(value.revision)||value.revision<0||!uuid.test(value.runId)||!Array.isArray(value.history)||value.history.length>20||value.history.some(r=>!uuid.test(r.runId)||typeof r.score!=='number'||!Number.isFinite(r.score)||r.score<0||typeof r.finishedAt!=='string'))throw Error('账号存档无效，未覆盖原数据。');if(value.snapshot!==null){if(typeof value.snapshot!=='string')throw Error('存档格式无效');this.validate(value.snapshot);}return value;}
 readRecord(id){const raw=this.storage.getItem(this.key(id));return raw?this.checkRecord(JSON.parse(raw)):fresh();}
 localSnapshot(){return this.current?this.meta.snapshot:null;}
 boot(){if(this.initialError){this.emit('error',this.initialError);this.changed();return;}if(this.registry.activeId)try{this.select(this.registry.activeId);return;}catch(e){this.emit('error',e.message);}this.changed();}
 select(id){const registry=this.readRegistry(),profile=registry.profiles.find(p=>p.id===id);if(!profile)throw Error('本机未找到这个账号');const record=this.readRecord(id);this.writeRegistry({...registry,activeId:id});this.current={...profile};this.meta=record;this.conflict=null;this.storageIssue=null;this.pendingSnapshot=null;this.emit('restore',record.snapshot);this.changed();}
 create(name,avatar='雀'){if(!validName(name)||!AVATARS.includes(avatar))throw Error('昵称需1—20字，并选择头像。');const registry=this.readRegistry(),trimmed=name.trim();if(registry.profiles.some(p=>p.name.toLocaleLowerCase()===trimmed.toLocaleLowerCase()))throw Error('本机已有同名账号，请换一个昵称。');if(registry.profiles.length>=100)throw Error('本机账号已满，请先导出备份并删除不用的账号。');const profile={id:crypto.randomUUID(),name:trimmed,avatar,createdAt:new Date().toISOString()};this.writeRegistry({...registry,profiles:[...registry.profiles,profile]});this.select(profile.id);return profile;}
 rename(name,avatar){if(!this.current)throw Error('请先选择账号');if(!validName(name)||!AVATARS.includes(avatar))throw Error('昵称需1—20字，并选择头像。');const registry=this.readRegistry(),trimmed=name.trim();if(registry.profiles.some(p=>p.id!==this.current.id&&p.name.toLocaleLowerCase()===trimmed.toLocaleLowerCase()))throw Error('本机已有同名账号，请换一个昵称。');const updated={...this.current,name:trimmed,avatar};this.writeRegistry({...registry,profiles:registry.profiles.map(p=>p.id===updated.id?updated:p)});this.current=updated;this.changed();}
 capture(snapshot){
  if(!this.current||this.conflict||this.storageIssue)return false;this.validate(snapshot);if(snapshot===this.meta.snapshot)return true;
  const registry=this.readRegistry();if(!registry.profiles.some(p=>p.id===this.current.id)){this.clearCurrent(registry);return false;}
  const remote=this.readRecord(this.current.id);if(remote.revision!==this.meta.revision){this.conflict={local:snapshot,remote};this.changed();return false;}
  const state=JSON.parse(snapshot),savedAt=new Date().toISOString(),history=this.meta.history.slice();
  if(state.phase==='over'&&!history.some(r=>r.runId===this.meta.runId))history.unshift({runId:this.meta.runId,score:state.players[0].score,finishedAt:savedAt});
  const next={...this.meta,snapshot,revision:remote.revision+1,savedAt,history:history.slice(0,20)};
  try{this.storage.setItem(this.key(this.current.id),JSON.stringify(next));this.meta=next;this.pendingSnapshot=null;}catch{this.pendingSnapshot=snapshot;this.storageIssue='浏览器未能保存这一步进度。请先导出账号备份，释放空间或允许网站存储后重试。';}
  this.changed();return !this.storageIssue;
 }
 newRun(){if(!this.ready)throw Error('请先选择账号并处理存档问题');this.meta={...this.meta,runId:crypto.randomUUID(),snapshot:null};}
 clearCurrent(registry=this.registry){this.registry=registry;this.current=null;this.meta=fresh();this.conflict=null;this.storageIssue=null;this.pendingSnapshot=null;this.emit('restore',null);this.changed();}
 remove(id){const registry=this.readRegistry();if(!registry.profiles.some(p=>p.id===id))throw Error('账号已不存在');const profiles=registry.profiles.filter(p=>p.id!==id);this.writeRegistry({...registry,profiles,activeId:registry.activeId===id?null:registry.activeId});this.storage.removeItem(this.key(id));if(this.current?.id===id)this.clearCurrent(this.registry);else this.changed();}
 backup(){if(!this.current)throw Error('请先选择账号');const save={...this.meta,snapshot:this.pendingSnapshot||this.conflict?.local||this.meta.snapshot};this.checkRecord(save);return JSON.stringify({kind:'quexu-local-account',version:1,exportedAt:new Date().toISOString(),profile:{name:this.current.name,avatar:this.current.avatar},save},null,2);}
 importBackup(raw){if(typeof raw!=='string'||raw.length>2500000)throw Error('备份过大');let data;try{data=JSON.parse(raw);}catch{throw Error('不是有效的账号备份文件');}if(data?.kind!=='quexu-local-account'||data.version!==1||!validName(data.profile?.name)||!AVATARS.includes(data.profile?.avatar))throw Error('请选择雀序账号备份文件');const save=this.checkRecord(data.save),registry=this.readRegistry();if(registry.profiles.length>=100)throw Error('本机账号已满');let name=data.profile.name.trim(),suffix=1;const original=[...name];while(registry.profiles.some(p=>p.name.toLocaleLowerCase()===name.toLocaleLowerCase())){const ending=` (${suffix++})`;name=original.slice(0,20-ending.length).join('')+ending;}
  const profile={id:crypto.randomUUID(),name,avatar:data.profile.avatar,createdAt:new Date().toISOString()};this.storage.setItem(this.key(profile.id),JSON.stringify({...save,revision:1}));try{this.writeRegistry({...registry,profiles:[...registry.profiles,profile]});}catch(e){this.storage.removeItem(this.key(profile.id));throw e;}this.select(profile.id);return profile;
 }
 summary(id){try{const record=this.current?.id===id?this.meta:this.readRecord(id),state=record.snapshot?JSON.parse(record.snapshot):null;return {round:state?.round||1,score:state?.players?.[0]?.score||0,savedAt:record.savedAt,started:!!state};}catch{return {invalid:true};}}
 handleStorage(event){if(event.key===this.registryKey){try{const registry=this.readRegistry();if(this.current&&!registry.profiles.some(p=>p.id===this.current.id))this.clearCurrent(registry);else{this.registry=registry;if(this.current)this.current={...registry.profiles.find(p=>p.id===this.current.id)};this.changed();}}catch(e){this.emit('error',e.message);}return;}if(this.current&&event.key===this.key(this.current.id))try{const remote=this.readRecord(this.current.id);if(remote.revision!==this.meta.revision){this.conflict={local:this.pendingSnapshot||this.meta.snapshot,remote};this.changed();}}catch(e){this.emit('error',e.message);}}
 resolve(choice){if(!this.conflict)return;if(choice==='remote'){this.select(this.current.id);return;}if(choice!=='local')throw Error('请选择要继续的进度');const local=this.conflict.local;this.meta={...this.meta,revision:this.readRecord(this.current.id).revision};this.conflict=null;this.storageIssue=null;this.meta.snapshot=null;if(local){this.capture(local);if(this.ready)this.emit('restore',local);}this.changed();}
 retry(){const snapshot=this.pendingSnapshot;this.storageIssue=null;this.pendingSnapshot=null;if(snapshot)this.capture(snapshot);this.changed();}
}
