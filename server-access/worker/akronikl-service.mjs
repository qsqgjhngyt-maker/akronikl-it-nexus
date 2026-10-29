import {readEligibleAccountFoundation} from './account-foundation.js';
export const AKRONIKL_INTERNAL_PATH='/api/v2/akronikl/internal';
const encoder=new TextEncoder(),hex=b=>[...new Uint8Array(b)].map(n=>n.toString(16).padStart(2,'0')).join('');
const sha=async b=>hex(await crypto.subtle.digest('SHA-256',b));
const reply=(status,data)=>Response.json(data,{status,headers:{'cache-control':'no-store','vary':'*','x-content-type-options':'nosniff'}});
const fail=(code='CLOUD_VAULT_UNAVAILABLE',status=503)=>{throw Object.assign(Error(code),{status});};
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===keys.split(',').sort().join(',');
const provider=v=>['qwen','openai','anthropic','gemini','kimi','deepseek','gigachat','openrouter'].includes(v);
const slot=v=>['preferences','chats'].includes(v)||typeof v==='string'&&v.startsWith('key:')&&provider(v.slice(4));
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v),version=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{22}$/.test(v);
const cipher=(v,max=1900000)=>typeof v==='string'&&v.length>=40&&v.length<=max&&/^[A-Za-z0-9+/]+={0,2}$/.test(v);
async function verify(request,env){
 const u=new URL(request.url);if(request.method!=='POST'||u.pathname!==AKRONIKL_INTERNAL_PATH||u.search||request.headers.has('cookie')||request.headers.has('authorization')||request.headers.get('content-type')!=='application/json')fail('CLOUD_REQUEST_DENIED',401);
 const stamp=request.headers.get('x-nexus-service-timestamp'),nonce=request.headers.get('x-nexus-service-nonce'),signature=request.headers.get('x-nexus-service-signature');
 if(!/^\d{13}$/.test(stamp??'')||!/^[a-f0-9]{32}$/.test(nonce??'')||!hash(signature)||Math.abs(Date.now()-Number(stamp))>30000)fail('CLOUD_REQUEST_DENIED',401);
 const reader=request.body?.getReader();if(!reader)fail('CLOUD_REQUEST_INVALID',400);const parts=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1950000)fail('CLOUD_REQUEST_INVALID',413);parts.push(value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const b of parts){bytes.set(b,offset);offset+=b.length;}
 const key=await crypto.subtle.importKey('raw',encoder.encode(env.AKRONIKL_SERVICE_KEY),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('HMAC',key,Uint8Array.from(signature.match(/../g),s=>parseInt(s,16)),encoder.encode(`v1\nPOST\n${AKRONIKL_INTERNAL_PATH}\n${stamp}\n${nonce}\n${await sha(bytes)}`)))fail('CLOUD_REQUEST_DENIED',401);
 let value;try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail('CLOUD_REQUEST_INVALID',400);}
 if(!exact(value,'action,expectedAccountId,payload,sessionHash')||!hash(value.sessionHash)||typeof value.expectedAccountId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(value.expectedAccountId))fail('CLOUD_REQUEST_DENIED',401);
 // Recheck after streaming/crypto. Cleanup belongs only to this RPC replay namespace.
 if(Math.abs(Date.now()-Number(stamp))>30000)fail('CLOUD_REQUEST_DENIED',401);
 await env.DB.prepare('DELETE FROM nexus_akronikl_nonces WHERE nonce IN(SELECT nonce FROM nexus_akronikl_nonces WHERE expires_at<?1 ORDER BY expires_at LIMIT 128)').bind(Date.now()).run();
 const n=await env.DB.prepare('INSERT OR IGNORE INTO nexus_akronikl_nonces(nonce,expires_at) VALUES(?1,?2)').bind(nonce,Number(stamp)+30000).run();if(!n.success||n.meta?.changes!==1)fail('CLOUD_REQUEST_DENIED',401);
 const foundation=await readEligibleAccountFoundation(env.DB,value.sessionHash,undefined,env);if(!foundation)fail('CLOUD_ACCOUNT_REQUIRED',401);if(foundation.account.accountId!==value.expectedAccountId)fail('CLOUD_ACCOUNT_REQUIRED',409);
 return value;
}
export async function handleAkroniklService(request,env){
 if(env.AKRONIKL_STATE_ENABLED!=='true'||!env.DB||typeof env.AKRONIKL_SERVICE_KEY!=='string'||env.AKRONIKL_SERVICE_KEY.length<32)return reply(404,{code:'CLOUD_VAULT_UNAVAILABLE'});
 try{
  const v=await verify(request,env),id=v.expectedAccountId,p=v.payload,now=Date.now(),q=(s,...args)=>env.DB.prepare(s).bind(...args);
  // Separate assistant namespace: a large history write cannot exhaust the shared account database.
  await q('DELETE FROM nexus_akronikl_limits WHERE rowid IN(SELECT rowid FROM nexus_akronikl_limits WHERE expires_at<=?1 LIMIT 128)',now).run();
  const cleanup=['lease.release','lease.drop','state.remove'].includes(v.action),write=['state.write','lease.save'].includes(v.action);
  for(const [kind,period,max]of cleanup?[['cleanup',60000,30],['cleanup',86400000,1440]]:[['rpc',60000,180],['rpc',86400000,5000],...(write?[['write',60000,30]]:[])]){const start=Math.floor(now/period),bucket=kind+':'+period+':'+start,row=await q('INSERT INTO nexus_akronikl_limits(account_id,bucket,count,expires_at) VALUES(?1,?2,1,?3) ON CONFLICT(account_id,bucket) DO UPDATE SET count=count+1 WHERE count<?4 RETURNING count',id,bucket,(start+1)*period,max).first();if(!row)fail('CLOUD_RATE_LIMITED',429);}
  if(v.action==='state.read'&&exact(p,'slot')&&slot(p.slot))return reply(200,await q('SELECT revision,ciphertext FROM nexus_akronikl_state WHERE account_id=?1 AND slot=?2',id,p.slot).first()??{revision:0,ciphertext:null});
  if(v.action==='keys.list'&&exact(p,'')){const {results=[]}=await q("SELECT slot,ciphertext FROM nexus_akronikl_state WHERE account_id=?1 AND slot LIKE 'key:%' ORDER BY slot",id).all();return reply(200,{records:results});}
  if(v.action==='provider.epoch'&&exact(p,'providerId')&&provider(p.providerId))return reply(200,{epoch:(await q('SELECT count FROM nexus_akronikl_limits WHERE account_id=?1 AND bucket=?2',id,'epoch:'+p.providerId).first())?.count??0});
  const keyWrite=typeof p?.slot==='string'&&p.slot.startsWith('key:');
  if(v.action==='state.write'&&exact(p,keyWrite?'slot,revision,ciphertext,providerEpoch':'slot,revision,ciphertext')&&slot(p.slot)&&(!keyWrite||Number.isSafeInteger(p.providerEpoch)&&p.providerEpoch>=0)&&Number.isSafeInteger(p.revision)&&p.revision>=0&&cipher(p.ciphertext,p.slot==='chats'?1900000:20000)){
   const epoch=keyWrite?p.providerEpoch:null,guard='(?5 IS NULL OR ?5=COALESCE((SELECT count FROM nexus_akronikl_limits WHERE account_id=?1 AND bucket=?6),0))';
   const row=await q('INSERT INTO nexus_akronikl_state(account_id,slot,revision,ciphertext) SELECT ?1,?2,1,?3 WHERE ?4=0 AND '+guard+' ON CONFLICT(account_id,slot) DO UPDATE SET revision=revision+1,ciphertext=excluded.ciphertext WHERE revision=?4 AND '+guard+' RETURNING revision',id,p.slot,p.ciphertext,p.revision,epoch,'epoch:'+p.slot.slice(4)).first();
   // Existing nonzero rows use UPDATE; INSERT SELECT above deliberately cannot insert a missing revision.
   const updated=row??(p.revision>0?await q('UPDATE nexus_akronikl_state SET revision=revision+1,ciphertext=?3 WHERE account_id=?1 AND slot=?2 AND revision=?4 AND '+guard+' RETURNING revision',id,p.slot,p.ciphertext,p.revision,epoch,'epoch:'+p.slot.slice(4)).first():null);
   if(!updated)fail('CLOUD_SETTINGS_CONFLICT',409);return reply(200,updated);
  }
  if(v.action==='state.remove'&&exact(p,'slot')&&typeof p.slot==='string'&&p.slot.startsWith('key:')&&slot(p.slot)){await env.DB.batch([q('DELETE FROM nexus_akronikl_state WHERE account_id=?1 AND slot=?2',id,p.slot),q('DELETE FROM nexus_akronikl_connections WHERE account_id=?1 AND provider_id=?2',id,p.slot.slice(4)),q('INSERT INTO nexus_akronikl_limits(account_id,bucket,count,expires_at) VALUES(?1,?2,1,253402300799000) ON CONFLICT(account_id,bucket) DO UPDATE SET count=count+1',id,'epoch:'+p.slot.slice(4))]);return reply(200,{removed:true});}
  if(v.action==='lease.save'&&exact(p,'tokenHash,version,providerId,expiresAt,ciphertext,replaceTokenHash,providerEpoch')&&hash(p.tokenHash)&&version(p.version)&&provider(p.providerId)&&(p.replaceTokenHash===null||hash(p.replaceTokenHash))&&Number.isSafeInteger(p.providerEpoch)&&p.providerEpoch>=0&&Number.isSafeInteger(p.expiresAt)&&p.expiresAt>now&&p.expiresAt<=now+1800000&&cipher(p.ciphertext,20000)){
   await q('DELETE FROM nexus_akronikl_connections WHERE token_hash IN(SELECT token_hash FROM nexus_akronikl_connections WHERE expires_at<=?1 LIMIT 128)',now).run();
   const row=await q('INSERT INTO nexus_akronikl_connections(token_hash,account_id,session_hash,provider_id,version,expires_at,ciphertext) SELECT ?1,?2,?3,?4,?5,?6,?7 WHERE (SELECT count(*) FROM nexus_akronikl_connections WHERE account_id=?2 AND expires_at>?9 AND NOT(?8 IS NOT NULL AND token_hash=?8 AND session_hash=?3))<8 AND ?10=COALESCE((SELECT count FROM nexus_akronikl_limits WHERE account_id=?2 AND bucket=?11),0) RETURNING token_hash',p.tokenHash,id,v.sessionHash,p.providerId,p.version,p.expiresAt,p.ciphertext,p.replaceTokenHash,now,p.providerEpoch,'epoch:'+p.providerId).first();if(!row)fail('CLOUD_BUSY',429);return reply(200,{saved:true});
  }
  if(v.action==='lease.read'&&exact(p,'tokenHash')&&hash(p.tokenHash))return reply(200,{lease:await q('SELECT version,ciphertext,expires_at FROM nexus_akronikl_connections WHERE token_hash=?1 AND account_id=?2 AND session_hash=?3 AND expires_at>?4',p.tokenHash,id,v.sessionHash,now).first()});
  if(v.action==='lease.drop'&&exact(p,'tokenHash,version')&&hash(p.tokenHash)&&version(p.version)){await q('DELETE FROM nexus_akronikl_connections WHERE token_hash=?1 AND account_id=?2 AND session_hash=?3 AND version=?4',p.tokenHash,id,v.sessionHash,p.version).run();return reply(200,{removed:true});}
  if(v.action==='lease.acquire'&&exact(p,'tokenHash,version,lockId')&&hash(p.tokenHash)&&version(p.version)&&hash(p.lockId)){
   const row=await q('INSERT INTO nexus_akronikl_locks(account_id,token_hash,session_hash,version,busy_until,lock_id) SELECT ?2,?1,?3,?4,?5,?6 WHERE EXISTS(SELECT 1 FROM nexus_akronikl_connections WHERE token_hash=?1 AND account_id=?2 AND session_hash=?3 AND version=?4 AND expires_at>?7) ON CONFLICT(account_id) DO UPDATE SET token_hash=excluded.token_hash,session_hash=excluded.session_hash,version=excluded.version,busy_until=excluded.busy_until,lock_id=excluded.lock_id WHERE busy_until<=?7 RETURNING version',p.tokenHash,id,v.sessionHash,p.version,now+90000,p.lockId,now).first();if(!row)fail('CLOUD_BUSY',429);return reply(200,{acquired:true});
  }
  if(v.action==='lease.release'&&exact(p,'tokenHash,version,lockId')&&hash(p.tokenHash)&&version(p.version)&&hash(p.lockId)){await q('DELETE FROM nexus_akronikl_locks WHERE token_hash=?1 AND account_id=?2 AND session_hash=?3 AND version=?4 AND lock_id=?5',p.tokenHash,id,v.sessionHash,p.version,p.lockId).run();return reply(200,{released:true});}
  if(v.action==='limit.consume'&&exact(p,'kind')&&['connect','generate'].includes(p.kind)){
   await q('DELETE FROM nexus_akronikl_limits WHERE rowid IN(SELECT rowid FROM nexus_akronikl_limits WHERE expires_at<=?1 LIMIT 128)',now).run();
   for(const [period,max]of [[60000,p.kind==='connect'?4:12],[86400000,p.kind==='connect'?40:200]]){const start=Math.floor(now/period),bucket=p.kind+':'+period+':'+start;const row=await q('INSERT INTO nexus_akronikl_limits(account_id,bucket,count,expires_at) VALUES(?1,?2,1,?3) ON CONFLICT(account_id,bucket) DO UPDATE SET count=count+1 WHERE count<?4 RETURNING count',id,bucket,(start+1)*period,max).first();if(!row)fail('CLOUD_RATE_LIMITED',429);}return reply(200,{allowed:true});
  }
  fail('CLOUD_REQUEST_INVALID',400);
 }catch(e){const code=/^CLOUD_[A-Z_]+$/.test(e?.message)?e.message:'CLOUD_VAULT_UNAVAILABLE';return reply(e.status??503,{code});}
}
