// Windows CurrentUser DPAPI. No plaintext credential file or hard-coded master key.
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir,rename,unlink} from 'node:fs/promises';
import {createHash,randomBytes} from 'node:crypto';
import path from 'node:path';
const HEADER=Buffer.from('AKRONIKL-DPAPI-V1\n');
async function dpapi(bytes,decrypt=false){
 if(process.platform!=='win32')throw Error('CLOUD_VAULT_UNAVAILABLE');
 const script=`$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Security; $b=[Convert]::FromBase64String([Console]::In.ReadToEnd()); $r=[System.Security.Cryptography.ProtectedData]::${decrypt?'Unprotect':'Protect'}($b,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($r))`;
 return new Promise((resolve,reject)=>{
  const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,stdio:['pipe','pipe','pipe']});const parts=[];let size=0,failed=false;
  const fail=()=>{if(failed)return;failed=true;child.kill();reject(Error('CLOUD_VAULT_UNAVAILABLE'));};const timer=setTimeout(fail,15000);
  child.stdout.on('data',b=>{size+=b.length;if(size>48*1024*1024)fail();else parts.push(b);});child.stderr.resume();child.on('error',fail);child.stdin.on('error',fail);
  child.on('close',code=>{clearTimeout(timer);if(failed)return;if(code!==0){fail();return;}try{const text=Buffer.concat(parts).toString('utf8').trim();if(!/^[A-Za-z0-9+/=]+$/u.test(text))throw Error();resolve(Buffer.from(text,'base64'));}catch{fail();}});
  child.stdin.end(bytes.toString('base64'));
 });
}
export function createCloudVault({file=path.join(process.env.LOCALAPPDATA??'','Akronikl','cloud-connections.dpapi'),codec=null,protection='Windows DPAPI CurrentUser'}={}){
 const location=path.resolve(file),ownerId=owner=>typeof owner==='string'&&/^[A-Za-z0-9_-]{32,100}$/u.test(owner)?createHash('sha256').update(owner).digest('hex'):null;
 const protect=codec?.protect??(b=>dpapi(b)),unprotect=codec?.unprotect??(b=>dpapi(b,true));let queue=Promise.resolve();
 async function load(){
  let bytes;try{bytes=await readFile(location);}catch(e){if(e.code==='ENOENT')return {version:1,owners:{}};throw Error('CLOUD_VAULT_UNAVAILABLE');}
  if(bytes.length>32*1024*1024||!bytes.subarray(0,HEADER.length).equals(HEADER))throw Error('CLOUD_VAULT_UNAVAILABLE');
  try{const data=JSON.parse((await unprotect(bytes.subarray(HEADER.length))).toString('utf8'));if(data.version!==1||!data.owners||typeof data.owners!=='object')throw Error();return data;}catch{throw Error('CLOUD_VAULT_UNAVAILABLE');}
 }
 async function save(data){
  const temp=location+'.'+randomBytes(8).toString('hex')+'.tmp';
  try{const plain=Buffer.from(JSON.stringify(data),'utf8');if(plain.length>30*1024*1024)throw Error();const bytes=await protect(plain);await mkdir(path.dirname(location),{recursive:true});await writeFile(temp,Buffer.concat([HEADER,bytes]),{mode:0o600});await rename(temp,location);}
  catch{throw Error('CLOUD_VAULT_UNAVAILABLE');}finally{await unlink(temp).catch(()=>{});}
 }
 function serialized(fn){const task=queue.then(fn);queue=task.catch(()=>{});return task;}
 const publicRecord=r=>({providerId:r.providerId,modelId:r.modelId,options:r.options});
 return Object.freeze({id:createHash('sha256').update(location.toLowerCase()).digest('hex').slice(0,16),protection,
  async list(owner){const id=ownerId(owner);if(!id)return [];return serialized(async()=>Object.entries((await load()).owners[id]??{}).filter(([key])=>!key.startsWith('$')).map(([,r])=>publicRecord(r)));},
  async readState(owner,key){const id=ownerId(owner);if(!id||!['preferences','chats'].includes(key))throw Error('CLOUD_ACCOUNT_REQUIRED');return serialized(async()=>structuredClone((await load()).owners[id]?.['$'+key]??{revision:0,value:null}));},
  async writeState(owner,key,value,revision){const id=ownerId(owner);if(!id||!['preferences','chats'].includes(key))throw Error('CLOUD_ACCOUNT_REQUIRED');return serialized(async()=>{const data=await load(),before=data.owners[id]?.['$'+key];if(!Number.isSafeInteger(revision)||revision!==(before?.revision??0))throw Error('CLOUD_SETTINGS_CONFLICT');if(!data.owners[id]&&Object.keys(data.owners).length>=64)throw Error('CLOUD_VAULT_UNAVAILABLE');data.owners[id]??={};const result={revision:revision+1,value};data.owners[id]['$'+key]=result;await save(data);return structuredClone(result);});},
  async get(owner,providerId){const id=ownerId(owner);if(!id)return null;return serialized(async()=>{const r=(await load()).owners[id]?.[providerId];return r?structuredClone(r):null;});},
  async put(owner,record){const id=ownerId(owner);if(!id)throw Error('CLOUD_VAULT_UNAVAILABLE');return serialized(async()=>{const data=await load();if(!data.owners[id]&&Object.keys(data.owners).length>=64)throw Error('CLOUD_VAULT_UNAVAILABLE');data.owners[id]??={};data.owners[id][record.providerId]={...record};await save(data);return publicRecord(record);});},
  async remove(owner,providerId){const id=ownerId(owner);if(!id)return;return serialized(async()=>{const data=await load();if(data.owners[id]){delete data.owners[id][providerId];if(!Object.keys(data.owners[id]).length)delete data.owners[id];await save(data);}});},
 });
}
