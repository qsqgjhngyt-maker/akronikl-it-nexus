// Контекст устанавливается bootstrap только после проверки серверной сессии.
// Это разделение данных интерфейса, а не шифрование локального хранилища.
const PREFIX='akronikl:it-nexus:account-store:v1:';
const LEGACY_OWNER='user-4849a9d6-4cd7-4ebe-8dba-1cf81b3dac8b';
const IDENTITY_KEY='akronikl:it-nexus:identity:v1';
const CLOUD_KEY='akronikl:it-nexus:cloudflare-sync:v1';
const ASSISTANT_CACHE='akronikl:it-nexus:assistant-cache:v1';
const LOCAL_KEYS=new Set([
  'akronikl:it-nexus:state:v1','akronikl:it-nexus:projects:v1','akronikl:it-nexus:prefs:v1',IDENTITY_KEY,
  CLOUD_KEY,'akronikl:it-nexus:sync-queue:v1','akronikl:it-nexus:audit:v1',
  'akronikl:it-nexus:identity-v2:cookie-session:v1','cpp_programming_pdf_course_v1','akronikl:it-nexus:cpp-final:v1'
]);
const LOCAL_PREFIXES=['akronikl:it-nexus:learning-resume:v1:','akronikl:it-nexus:graphics-drafts:v1:','akronikl:it-nexus:feedback-draft:v1:'];
const SESSION_KEYS=new Set(['akronikl:it-nexus:identity-v2:session:v1','akronikl:it-nexus:view-resume:v1']);
const SESSION_PREFIXES=['akronikl:code-studio:view:v1:'];
const parse=value=>{try{return JSON.parse(value)}catch{return null}};
const denied=code=>Object.assign(new Error(code),{code});
const validId=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(value);
const keysOf=store=>{const keys=[];for(let n=0;n<Number(store?.length||0);n++){const key=store.key(n);if(typeof key==='string')keys.push(key)}return keys};
// This cache is intentionally excluded from all legacy adoption lists.
const isKnown=(key,area)=>typeof key==='string'&&(area==='local'?key===ASSISTANT_CACHE||key===ASSISTANT_CACHE+':validity'||LOCAL_KEYS.has(key)||LOCAL_PREFIXES.some(prefix=>key.startsWith(prefix)):SESSION_KEYS.has(key)||SESSION_PREFIXES.some(prefix=>key.startsWith(prefix)));

// Отдельный контроллер позволяет проверять миграцию на синтетических Storage.
export function createAccountStorageController({localStorage,sessionStorage,legacyOwnerAccountId=LEGACY_OWNER}={}){
  let context=null,locked=false,local=null,session=null;
  const requireContext=()=>{if(!context||locked)throw denied('VERIFIED_ACCOUNT_REQUIRED');return context};
  const prefix=accountId=>PREFIX+encodeURIComponent(accountId)+':';
  const scopedKey=(key,area)=>{const account=requireContext();if(!isKnown(key,area))throw denied('PRIVATE_STORAGE_KEY_REJECTED');return prefix(account.accountId)+key};
  const migrate=accountId=>{
    const targetPrefix=prefix(accountId),marker=targetPrefix+'__legacy-adoption:v1';
    const identity=parse(local.getItem(IDENTITY_KEY));
    const recorded=parse(local.getItem(marker));
    const eligible=recorded?recorded.eligible===true:accountId===legacyOwnerAccountId||identity?.accountSubjectId===accountId;
    const sessionMarker=targetPrefix+'__legacy-session-adoption:v1';
    let sessionCopied=0;
    if(eligible&&session?.getItem&&session?.setItem&&session.getItem(sessionMarker)===null){
      for(const key of ['akronikl:it-nexus:view-resume:v1',...keysOf(session).filter(key=>SESSION_PREFIXES.some(base=>key.startsWith(base)))]){
        const raw=session.getItem(key);if(raw!==null&&session.getItem(targetPrefix+key)===null){session.setItem(targetPrefix+key,raw);sessionCopied++}
      }
      session.setItem(sessionMarker,JSON.stringify({schemaVersion:1,copied:sessionCopied}));
    }
    if(recorded)return {adopted:false,reason:'already-checked',copied:0,sessionCopied};
    if(!eligible){local.setItem(marker,JSON.stringify({schemaVersion:1,eligible:false,copied:0}));return {adopted:false,reason:'unmatched-owner',copied:0}}
    const principals=new Set([identity?.localPrincipalId,identity?.accountSubjectId].filter(validId));
    const sourceKeys=[...LOCAL_KEYS].filter(key=>!['akronikl:it-nexus:identity-v2:cookie-session:v1','akronikl:it-nexus:cpp-final:v1'].includes(key));
    const targetKeys=new Map();
    for(const key of keysOf(local)){
      for(const base of LOCAL_PREFIXES)for(const principal of principals){
        const sourcePrefix=base+encodeURIComponent(principal);
        if(base.includes('feedback-draft')){
          // Черновик, уже связанный с другим серверным аккаунтом, не усыновляется.
          if(key.startsWith(sourcePrefix+':local:')||key.startsWith(sourcePrefix+':account:'+encodeURIComponent(accountId)+':')){
            sourceKeys.push(key);targetKeys.set(key,base+encodeURIComponent(accountId)+key.slice(sourcePrefix.length));
          }
        }else if(key===sourcePrefix||key===base+principal){sourceKeys.push(key);targetKeys.set(key,base+encodeURIComponent(accountId))}
      }
    }
    let copied=0,skippedCloud=false;
    for(const key of new Set(sourceKeys)){
      const destination=targetPrefix+(targetKeys.get(key)||key);
      const raw=local.getItem(key);if(raw===null||local.getItem(destination)!==null)continue;
      // Legacy bearer никогда не становится credential другого аккаунта.
      if(key===CLOUD_KEY&&parse(raw)?.subjectId!==accountId){skippedCloud=true;continue}
      local.setItem(destination,raw);copied++;
    }
    // Записывается последним: при quota/error следующий вход продолжает копию.
    local.setItem(marker,JSON.stringify({schemaVersion:1,eligible:true,copied,skippedCloud}));
    return {adopted:true,copied,sessionCopied,skippedCloud};
  };
  const facade=area=>{
    requireContext();const store=area==='local'?local:session;
    if(!store)throw denied('PRIVATE_STORAGE_UNAVAILABLE');
    const capture=context;
    const current=()=>{if(requireContext()!==capture)throw denied('ACCOUNT_STORAGE_CONTEXT_CHANGED')};
    return Object.freeze({
      getItem(key){current();return store.getItem(scopedKey(key,area))},
      setItem(key,value){current();return store.setItem(scopedKey(key,area),String(value))},
      removeItem(key){current();return store.removeItem(scopedKey(key,area))},
      key(index){current();return keysOf(store).filter(key=>key.startsWith(prefix(capture.accountId))).map(key=>key.slice(prefix(capture.accountId).length)).filter(key=>isKnown(key,area))[index]??null},
      get length(){current();return keysOf(store).filter(key=>key.startsWith(prefix(capture.accountId))&&isKnown(key.slice(prefix(capture.accountId).length),area)).length},
      clear(){throw denied('BROAD_STORAGE_CLEAR_FORBIDDEN')}
    });
  };
  return Object.freeze({
    initializeAccountStorage(dto){
      const account=dto?.account||dto;
      if(!account||account.status!=='active'||!validId(account.accountId))throw denied('VERIFIED_ACCOUNT_REQUIRED');
      if(locked)throw denied('ACCOUNT_STORAGE_LOCKED');
      if(context){if(context.accountId!==account.accountId)throw denied('ACCOUNT_SWITCH_REQUIRES_NAVIGATION');return {account:context,adopted:false,reason:'already-initialized'}}
      local=localStorage??globalThis.localStorage;session=sessionStorage??globalThis.sessionStorage;
      if(!local?.getItem||!local?.setItem)throw denied('PRIVATE_STORAGE_UNAVAILABLE');
      const result=migrate(account.accountId);
      context=Object.freeze({accountId:account.accountId,displayName:String(account.displayName||''),status:'active'});
      return {account:context,...result};
    },
    lockAccountStorage(){locked=true;context=null},
    verifiedAccount(){return locked?null:context},isLocked(){return locked},
    accountLocalStorage(){return facade('local')},
    accountSessionStorage(){return facade('session')}
  });
}

const controller=createAccountStorageController();
export const initializeAccountStorage=dto=>controller.initializeAccountStorage(dto);
export const lockAccountStorage=()=>controller.lockAccountStorage();
export const verifiedAccount=()=>controller.verifiedAccount();
export const accountStorageLocked=()=>controller.isLocked();
export const accountLocalStorage=()=>controller.accountLocalStorage();
export const accountSessionStorage=()=>controller.accountSessionStorage();
export const accountStoragePrefix=accountId=>{if(!validId(accountId))throw denied('INVALID_ACCOUNT_ID');return PREFIX+encodeURIComponent(accountId)+':'};
