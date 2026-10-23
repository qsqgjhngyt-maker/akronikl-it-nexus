// Локальная копия не является серверной сессией. Ключ существует только в памяти.
const DB='nexus-offline-workspaces-v1',ITERATIONS=310000,MAX_BYTES=32*1024*1024;
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const fail=code=>Object.assign(new Error(code),{code});
const random=n=>crypto.getRandomValues(new Uint8Array(n));
const copy=value=>structuredClone(value);
const phraseOK=value=>typeof value==='string'&&value.trim().length>=12&&value.length<=1024;
const aad=(id,revision)=>encoder.encode('nexus-local-copy-v1:'+id+':'+revision);
const request=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
async function derive(phrase,salt){
 if(!phraseOK(phrase))throw fail('LOCAL_PHRASE_REQUIRED');
 const material=await crypto.subtle.importKey('raw',encoder.encode(phrase),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:ITERATIONS},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export function validLocalPayload(p){
 if(p?.schemaVersion!==1||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(p.owner?.accountId||'')||!p.projects||Array.isArray(p.projects)||typeof p.projects!=='object'||!p.state||typeof p.state!=='object'||!p.base||typeof p.base!=='object')throw fail('LOCAL_COPY_INVALID');
 for(const [id,project] of Object.entries(p.projects)){
  if(!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(id)||['constructor','prototype'].includes(id)||id!==project.id||typeof project.title!=='string'||!Array.isArray(project.workspace?.files)||project.workspace.files.some(f=>typeof f.path!=='string'||typeof f.content!=='string'))throw fail('LOCAL_COPY_INVALID');
 }
 return p;
}
export function createVaultStore({indexedDB=globalThis.indexedDB,name=DB}={}){
 let opening;
 const open=()=>opening??=new Promise((resolve,reject)=>{
  if(!indexedDB)return reject(fail('LOCAL_STORE_UNAVAILABLE'));
  const req=indexedDB.open(name,1);req.onupgradeneeded=()=>req.result.createObjectStore('vaults',{keyPath:'id'});
  req.onerror=()=>reject(req.error);req.onblocked=()=>reject(fail('LOCAL_STORE_BLOCKED'));
  req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>{db.close();opening=null};resolve(db)};
 }).catch(e=>{opening=null;throw e});
 async function get(id){const db=await open();return request(db.transaction('vaults').objectStore('vaults').get(id))}
 async function commit(row,expected=null){
  const db=await open();
  return new Promise((resolve,reject)=>{
   let tx,reason;try{tx=db.transaction('vaults','readwrite',{durability:'strict'});if(tx.durability!=='strict')throw fail('STRICT_DURABILITY_REQUIRED')}catch(e){return reject(e)}
   tx.oncomplete=()=>resolve();tx.onabort=()=>reject(reason||tx.error||fail('LOCAL_SAVE_ABORTED'));tx.onerror=()=>{reason??=tx.error};
   const store=tx.objectStore('vaults'),req=store.get(row.id);
   req.onsuccess=()=>{if((req.result?.revision??null)!==expected){reason=fail('LOCAL_COPY_CONFLICT');tx.abort()}else {try{store.put(row)}catch(error){reason=error;tx.abort()}}};
  });
 }
 async function seal(id,revision,payload,key,salt){
  validLocalPayload(payload);const bytes=encoder.encode(JSON.stringify(payload));if(bytes.byteLength>MAX_BYTES)throw fail('LOCAL_COPY_TOO_LARGE');
  const iv=random(12),ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(id,revision)},key,bytes);
  return {id,revision,format:1,iterations:ITERATIONS,salt,iv,ciphertext};
 }
 function session(row,key,payload){
  let locked=false,tail=Promise.resolve();
  return {
   get id(){return row.id},get revision(){return row.revision},
   read(){if(locked)throw fail('LOCAL_COPY_LOCKED');return copy(payload)},
   save(next){
    const snapshot=copy(validLocalPayload(next));
    const operation=tail.then(async()=>{
     if(locked)throw fail('LOCAL_COPY_LOCKED');
     let nextRow=await seal(row.id,row.revision+1,snapshot,key,row.salt),branched=false;
     try{await commit(nextRow,row.revision)}catch(error){
      if(error.code!=='LOCAL_COPY_CONFLICT')throw error;
      // Другая вкладка уже записала свою версию: обе копии сохраняются.
      nextRow=await seal(crypto.randomUUID(),1,snapshot,key,row.salt);await commit(nextRow);branched=true;
     }
     row=nextRow;payload=snapshot;return {id:row.id,revision:row.revision,branched};
    });
    tail=operation.catch(()=>{});return operation;
   },
   async flush(){await tail;if(locked)throw fail('LOCAL_COPY_LOCKED')},
   async lock(){await tail;locked=true;payload=null;key=null}
  };
 }
 return Object.freeze({
  async list(){const db=await open();const ids=await request(db.transaction('vaults').objectStore('vaults').getAllKeys());return ids.map(id=>({id}))},
  async create(payload,phrase){
   const salt=random(16),key=await derive(phrase,salt),row=await seal(crypto.randomUUID(),1,copy(payload),key,salt);
   await commit(row);return session(row,key,copy(payload));
  },
  async unlock(id,phrase){
   const row=await get(id);
   if(!row||row.format!==1||row.iterations!==ITERATIONS||!(row.salt instanceof Uint8Array)||row.salt.length!==16||!(row.iv instanceof Uint8Array)||row.iv.length!==12||row.ciphertext?.byteLength>MAX_BYTES+16)throw fail('LOCAL_UNLOCK_FAILED');
   try{
    const key=await derive(phrase,row.salt),bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:row.iv,additionalData:aad(row.id,row.revision)},key,row.ciphertext);
    return session(row,key,validLocalPayload(JSON.parse(decoder.decode(bytes))));
   }catch{throw fail('LOCAL_UNLOCK_FAILED')}
  },
  async close(){if(opening)(await opening).close();opening=null}
 });
}
