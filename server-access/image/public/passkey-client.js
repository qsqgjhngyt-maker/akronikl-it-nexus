const API='/api/v2/account/passkey';
const bytes=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),x=>x.charCodeAt(0));
const b64=value=>btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export async function request(path,input){
 const r=await fetch(API+path,{method:input===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:input===undefined?{}:{'content-type':'application/json','x-nexus-passkey-write':'1'},...(input===undefined?{}:{body:JSON.stringify(input)})});
 const data=await r.json();if(!r.ok)throw Error(data.error?.code||'PASSKEY_UNAVAILABLE');return data;
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
export async function login(){
 const payload=await request('/authenticate/options',{}),o=payload.options;
 const publicKey=PublicKeyCredential.parseRequestOptionsFromJSON?PublicKeyCredential.parseRequestOptionsFromJSON(o):{...o,challenge:bytes(o.challenge),allowCredentials:(o.allowCredentials||[]).map(k=>({...k,id:bytes(k.id)}))};
 const credential=await navigator.credentials.get({publicKey});if(!credential)throw Error('PASSKEY_CANCELLED');
 return request('/authenticate/verify',{challengeId:payload.challengeId,response:serialized(credential)});
}
export const listKeys=()=>request('/keys');
export const revokeKey=methodId=>request('/revoke',{methodId});
export const logout=()=>request('/logout',{});
const names={PASSKEY_UNAVAILABLE:'Вход пока не подключён. Попробуйте позже.',ENROLLMENT_REQUIRED:'Приглашение недействительно или уже использовано.',FRESH_LOGIN_REQUIRED:'Повторите вход ключом, затем добавьте или отключите ключ.',LAST_KEY_OR_NOT_FOUND:'Последний действующий ключ нельзя отключить. Сначала добавьте запасной.',PASSKEY_REJECTED:'Ключ не прошёл проверку. Повторите вход.',CHALLENGE_REJECTED:'Время подтверждения истекло. Начните заново.',SESSION_REQUIRED:'Сначала войдите ключом.',RATE_LIMITED:'Слишком много попыток. Подождите минуту.',ISSUANCE_UNCONFIRMED:'Не удалось подтвердить вход. Начните заново.'};
const english={PASSKEY_UNAVAILABLE:'Sign-in is not connected yet. Try again later.',ENROLLMENT_REQUIRED:'The invitation is invalid or has already been used.',FRESH_LOGIN_REQUIRED:'Sign in again before adding or disabling a key.',LAST_KEY_OR_NOT_FOUND:'You cannot disable the last active key. Add a backup key first.',PASSKEY_REJECTED:'The key could not be verified. Sign in again.',CHALLENGE_REJECTED:'Confirmation expired. Start again.',SESSION_REQUIRED:'Sign in with your key first.',RATE_LIMITED:'Too many attempts. Wait a minute.',ISSUANCE_UNCONFIRMED:'Sign-in could not be confirmed. Start again.'};
export const message=(error,locale='ru')=>error.name==='NotAllowedError'?(locale==='en'?'Confirmation was cancelled or timed out.':'Подтверждение отменено или истекло время ожидания.'):(locale==='en'?english:names)[error.message]||(locale==='en'?'The action could not be completed. Try again.':'Не удалось выполнить действие. Попробуйте ещё раз.');
