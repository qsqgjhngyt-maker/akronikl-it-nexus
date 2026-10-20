const API='/api/v2/account/passkey';
const bytes=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),x=>x.charCodeAt(0));
const b64=value=>btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export async function request(path,input,{signal}={}){
 // One attempt only: a lost verify response may follow an already committed session.
 const requestSignal=signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000);requestSignal.throwIfAborted();
 const r=await fetch(API+path,{method:input===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',redirect:'error',signal:requestSignal,headers:input===undefined?{}:{'content-type':'application/json','x-nexus-passkey-write':'1'},...(input===undefined?{}:{body:JSON.stringify(input)})});
 requestSignal.throwIfAborted();
 if(!/^application\/json(?:\s*;|$)/i.test(r.headers.get('content-type')||''))throw Error('PASSKEY_RESPONSE_INVALID');
 const reader=r.body?.getReader();if(!reader)throw Error('PASSKEY_RESPONSE_INVALID');const parts=[];let size=0;
 try{while(true){const{done,value}=await reader.read();requestSignal.throwIfAborted();if(done)break;size+=value.length;if(size>65536)throw Error('PASSKEY_RESPONSE_INVALID');parts.push(value)}}finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
 const body=new Uint8Array(size);let offset=0;for(const part of parts){body.set(part,offset);offset+=part.length}
 let data;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(body))}catch{throw Error('PASSKEY_RESPONSE_INVALID')}
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('PASSKEY_RESPONSE_INVALID');
 if(!r.ok)throw Error(Object.hasOwn(names,data.error?.code)?data.error.code:'PASSKEY_UNAVAILABLE');return data;
}
function serialized(credential){
 if(credential.toJSON)return credential.toJSON();
 const r=credential.response,response={clientDataJSON:b64(r.clientDataJSON)};
 if('attestationObject' in r){response.attestationObject=b64(r.attestationObject);response.transports=r.getTransports?.()||[]}
 else {response.authenticatorData=b64(r.authenticatorData);response.signature=b64(r.signature);response.userHandle=r.userHandle?b64(r.userHandle):null}
 return{id:credential.id,rawId:b64(credential.rawId),type:credential.type,response,clientExtensionResults:credential.getClientExtensionResults(),authenticatorAttachment:credential.authenticatorAttachment};
}
export async function register(invitationToken){
 const payload=await request('/register/options',invitationToken?{invitationToken}:{}),o=payload.options;
 const publicKey=PublicKeyCredential.parseCreationOptionsFromJSON?PublicKeyCredential.parseCreationOptionsFromJSON(o):{...o,challenge:bytes(o.challenge),user:{...o.user,id:bytes(o.user.id)},excludeCredentials:(o.excludeCredentials||[]).map(k=>({...k,id:bytes(k.id)}))};
 const credential=await navigator.credentials.create({publicKey});if(!credential)throw Error('PASSKEY_CANCELLED');
 await request('/register/verify',{challengeId:payload.challengeId,response:serialized(credential)});
 return login();
}
export async function login({onStage=()=>{},signal}={}){
 // Diagnostics expose only stage and duration, never WebAuthn data or response text.
 const stage=async(name,fn)=>{signal?.throwIfAborted();const start=performance.now(),emit=value=>{try{if(!signal?.aborted)onStage(value)}catch{}};emit({stage:name,state:'start'});try{signal?.throwIfAborted();const value=await fn();signal?.throwIfAborted();emit({stage:name,state:'complete',durationMs:Math.round(performance.now()-start)});return value}catch(error){emit({stage:name,state:'error',durationMs:Math.round(performance.now()-start)});throw error}};
 const payload=await stage('options',()=>request('/authenticate/options',{},{signal})),o=payload.options;
 if(typeof payload.challengeId!=='string'||!payload.challengeId||payload.challengeId.length>80||!o||o.rpId!==globalThis.location?.hostname||o.userVerification!=='required')throw Error('PASSKEY_RESPONSE_INVALID');
 const publicKey=PublicKeyCredential.parseRequestOptionsFromJSON?PublicKeyCredential.parseRequestOptionsFromJSON(o):{...o,challenge:bytes(o.challenge),allowCredentials:(o.allowCredentials||[]).map(k=>({...k,id:bytes(k.id)}))};
 const credential=await stage('webauthn',()=>navigator.credentials.get({publicKey,...(signal?{signal}:{})}));if(!credential)throw Error('PASSKEY_CANCELLED');
 return stage('verify',async()=>{const result=await request('/authenticate/verify',{challengeId:payload.challengeId,response:serialized(credential)},{signal});if(result.ok!==true||Object.keys(result).length!==1)throw Error('PASSKEY_RESPONSE_INVALID');return result});
}
export const listKeys=()=>request('/keys');
export const revokeKey=methodId=>request('/revoke',{methodId});
export const logout=({signal}={})=>request('/logout',{},{signal});
const names={PASSKEY_UNAVAILABLE:'Вход пока не подключён. Попробуйте позже.',ENROLLMENT_REQUIRED:'Приглашение недействительно или уже использовано.',FRESH_LOGIN_REQUIRED:'Повторите вход ключом, затем добавьте или отключите ключ.',LAST_KEY_OR_NOT_FOUND:'Последний действующий ключ нельзя отключить. Сначала добавьте запасной.',PASSKEY_REJECTED:'Ключ не прошёл проверку. Повторите вход.',CHALLENGE_REJECTED:'Время подтверждения истекло. Начните заново.',SESSION_REQUIRED:'Сначала войдите ключом.',RATE_LIMITED:'Слишком много попыток. Подождите минуту.',ISSUANCE_UNCONFIRMED:'Не удалось подтвердить вход. Начните заново.'};
const english={PASSKEY_UNAVAILABLE:'Sign-in is not connected yet. Try again later.',ENROLLMENT_REQUIRED:'The invitation is invalid or has already been used.',FRESH_LOGIN_REQUIRED:'Sign in again before adding or disabling a key.',LAST_KEY_OR_NOT_FOUND:'You cannot disable the last active key. Add a backup key first.',PASSKEY_REJECTED:'The key could not be verified. Sign in again.',CHALLENGE_REJECTED:'Confirmation expired. Start again.',SESSION_REQUIRED:'Sign in with your key first.',RATE_LIMITED:'Too many attempts. Wait a minute.',ISSUANCE_UNCONFIRMED:'Sign-in could not be confirmed. Start again.'};
Object.assign(names,{INGRESS_REJECTED:'Сервер отклонил передачу Cookie. Вход не завершён.',FLOW_REQUIRED:'Сервер не получил подтверждение начала входа. Обновите страницу.',PASSKEY_RESPONSE_INVALID:'Сервер вернул некорректный ответ. Вход не подтверждён.',PASSKEY_CANCELLED:'Подтверждение отменено. Можно попробовать ещё раз.'});
Object.assign(english,{INGRESS_REJECTED:'The server rejected the cookie transport.',FLOW_REQUIRED:'The server did not receive the sign-in flow cookie. Reload the page.',PASSKEY_RESPONSE_INVALID:'The server returned an invalid response. Sign-in is unconfirmed.',PASSKEY_CANCELLED:'Confirmation was cancelled. You can try again.'});
export const message=(error,locale='ru')=>error.name==='NotAllowedError'?(locale==='en'?'Confirmation was cancelled or timed out.':'Подтверждение отменено или истекло время ожидания.'):(locale==='en'?english:names)[error.message]||(locale==='en'?'The action could not be completed. Try again.':'Не удалось выполнить действие. Попробуйте ещё раз.');
