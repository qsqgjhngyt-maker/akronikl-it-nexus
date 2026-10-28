// Local isolated host. Credentials arrive from the settings UI, never a file.
import http from 'node:http';
import {randomBytes,createHash} from 'node:crypto';
import path from 'node:path';
import {readFile,realpath} from 'node:fs/promises';
import {createCloudAdapter,validApiKey} from './cloud-adapters.mjs';
import {cloudSelection} from '../../akronikl/connections/cloud-catalog.js';
import {createCloudVault} from './cloud-vault.mjs';
const PREFIX='/api/akronikl/cloud';
const probe=Object.freeze({messages:[{role:'system',content:'Return JSON with exactly answer (a short string) and citations (array containing S1). No tools or actions.'},{role:'user',content:'Connection check. Reply briefly. S1: This is a connection check, not a factual quality test.'}],allowedCitations:['S1']});
async function readBody(req){
 if(Number(req.headers['content-length'])>32768){req.resume();throw Error('CLOUD_REQUEST_INVALID');}
 const parts=[];let bytes=0;for await(const p of req){bytes+=p.length;if(bytes>32768)throw Error('CLOUD_REQUEST_INVALID');parts.push(p);}
 try{return JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw Error('CLOUD_REQUEST_INVALID');}
}
export async function startCloudSettingsServer({root,createAdapter=options=>createCloudAdapter(options),onOutcome=null,vault=createCloudVault(),resolveAccount=null,personalPreview=false,ttlMs=30*60*1000,now=()=>Date.now()}={}){
 if(resolveAccount!==null&&typeof resolveAccount!=='function')throw Error('CLOUD_CONFIG_INVALID');
 const identity=resolveAccount??(()=>personalPreview?'local-personal-preview':null);
 async function account(req){let id;try{id=await identity(req);}catch{}if(typeof id!=='string'||!id||id.length>200)throw Error('CLOUD_ACCOUNT_REQUIRED');return id;}
 const base=await realpath(root),sessions=new Map(),pending=new Set(),pendingAccounts=new Map();let origin='',cookieName='',requests=0,connections=0,cancellations=0;
 const json=(res,status,data,headers={})=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(data));};
 function drop(id){const s=sessions.get(id);if(!s)return;sessions.delete(id);s.controller?.abort();s.adapter.dispose();}
 function sweep(){for(const [id,s]of sessions)if(now()-s.used>=ttlMs)drop(id);}
 function sessionId(req){const pair=(req.headers.cookie??'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='));return pair?.slice(cookieName.length+1)??null;}
 const ownerName='akronikl_owner_'+vault.id;
 function owner(req){const pair=(req.headers.cookie??'').split(';').map(x=>x.trim()).find(x=>x.startsWith(ownerName+'=')),value=pair?.slice(ownerName.length+1);return /^[A-Za-z0-9_-]{43}$/u.test(value??'')?value:null;}
 const scopedOwner=(token,id)=>!token?null:resolveAccount?createHash('sha256').update(id+'\0'+token).digest('base64url'):token;
 const ownerCookie=id=>`${ownerName}=${id}; HttpOnly; SameSite=Strict; Path=${PREFIX}; Max-Age=31536000`;
 const session=(req,accountId)=>{sweep();const id=sessionId(req),s=sessions.get(id);if(!s)throw Error('CLOUD_NOT_CONNECTED');if(s.accountId!==accountId){drop(id);throw Error('CLOUD_NOT_CONNECTED');}s.used=now();return s;};
 const cookie=(id,remove=false)=>`${cookieName}=${id}; HttpOnly; SameSite=Strict; Path=${PREFIX}${remove?'; Max-Age=0':''}`;
 const html='<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Akronikl — облачные подключения</title><style>body{font-family:system-ui,sans-serif;background:#edf2f6;color:#172033}button{font:inherit}</style><body><p>Akronikl · личный локальный профиль для проверки облачных подключений</p><main id="root"><button id="open">Akronikl</button></main><script type="module" src="/tools/qa-akronikl/cloud-settings-entry.mjs"></script></body></html>';
 const server=http.createServer(async(req,res)=>{
  if(req.headers.host!==new URL(origin).host){json(res,403,{code:'CLOUD_REQUEST_DENIED'});return;}
  const url=new URL(req.url,origin);if(url.origin!==origin||url.search){json(res,400,{code:'CLOUD_REQUEST_INVALID'});return;}
  if(url.pathname.startsWith(PREFIX)){
   let accountId;try{accountId=await account(req);}catch{json(res,401,{code:'CLOUD_ACCOUNT_REQUIRED'});return;}
   const stillAccount=async()=>{if(await account(req)!==accountId)throw Error('CLOUD_ACCOUNT_REQUIRED');};
   if(req.method==='GET'&&url.pathname===PREFIX+'/ready'){let s;try{s=session(req,accountId);}catch{}json(res,200,{available:true,identityScope:resolveAccount?'authenticated-account':'local-personal-preview',connected:!!s,...(s?{providerId:s.selection.providerId,modelId:s.selection.modelId}:{}),generationTested:false});return;}
   if(req.method==='GET'&&url.pathname===PREFIX+'/saved'){try{const connections=await vault.list(scopedOwner(owner(req),accountId));await stillAccount();json(res,200,{connections});}catch(e){json(res,e.message==='CLOUD_ACCOUNT_REQUIRED'?401:502,{code:e.message==='CLOUD_ACCOUNT_REQUIRED'?e.message:'CLOUD_VAULT_UNAVAILABLE'});}return;}
   if(req.method!=='POST'||req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json'){json(res,403,{code:'CLOUD_REQUEST_DENIED'});return;}
   const controller=new AbortController();pending.add(controller);pendingAccounts.set(controller,accountId);const abort=()=>{if(!res.writableEnded){cancellations++;controller.abort();}};req.once('aborted',abort);res.once('close',abort);
   let fresh=null;
   try{
    if(url.pathname===PREFIX+'/connect'){
     if(pending.size>4)throw Error('CLOUD_BUSY');sweep();if(sessions.size>=64)throw Error('CLOUD_BUSY');
     const data=await readBody(req);if(!data||Object.keys(data).some(k=>!['providerId','modelId','options','apiKey','remember','useSaved'].includes(k))||data.remember!==undefined&&typeof data.remember!=='boolean'||data.useSaved!==undefined&&typeof data.useSaved!=='boolean')throw Error('CLOUD_REQUEST_INVALID');
     const selection=cloudSelection({providerId:data.providerId,modelId:data.modelId,options:data.options??{}});
     let owned=owner(req),key=data.apiKey;if(!key&&data.useSaved)key=(await vault.get(scopedOwner(owned,accountId),selection.providerId))?.apiKey;
     if(!validApiKey(key))throw Error('CLOUD_KEY_INVALID');
     fresh=createAdapter({selection,apiKey:key,onOutcome});data.apiKey='';
     // Verify a real bounded request; listing a provider never claims connectivity.
     connections++;await fresh.complete(probe,{signal:controller.signal});controller.signal.throwIfAborted();
     await stillAccount();const remembered=data.remember===true;if(remembered){owned??=randomBytes(32).toString('base64url');await vault.put(scopedOwner(owned,accountId),{...selection,apiKey:key});}key='';controller.signal.throwIfAborted();await stillAccount();
     const old=sessionId(req);drop(old);const id=randomBytes(32).toString('base64url'),version=randomBytes(16).toString('base64url');sessions.set(id,{version,adapter:fresh,selection,owner:owned,accountId,used:now(),busy:false,controller:null});fresh=null;
     json(res,200,{connected:true,verified:true,remembered,connectionVersion:version,providerId:selection.providerId,modelId:selection.modelId},{'Set-Cookie':[cookie(id),...(remembered?[ownerCookie(owned)]:[])]});return;
    }
    if(url.pathname===PREFIX+'/forget'){const data=await readBody(req);if(Object.keys(data).join(',')!=='providerId')throw Error('CLOUD_REQUEST_INVALID');const id=cloudSelection({providerId:data.providerId,modelId:'validation-only'}).providerId,owned=owner(req);await vault.remove(scopedOwner(owned,accountId),id);for(const [sessionId,s]of sessions)if(owned&&s.owner===owned&&s.accountId===accountId&&s.selection.providerId===id)drop(sessionId);json(res,200,{forgotten:true});return;}
    if(url.pathname===PREFIX+'/disconnect'){const data=await readBody(req),id=sessionId(req),existing=sessions.get(id);if(existing&&(existing.accountId!==accountId||existing.version!==data.connectionVersion)){json(res,200,{disconnected:false});return;}drop(id);json(res,200,{disconnected:true},{'Set-Cookie':cookie('',true)});return;}
    if(url.pathname===PREFIX+'/generate'){
     const s=session(req,accountId);if(s.busy)throw Error('CLOUD_BUSY');s.busy=true;s.controller=controller;
     try{const data=await readBody(req);if(data.connectionVersion!==s.version)throw Error('CLOUD_NOT_CONNECTED');if(Object.keys(data).some(k=>!['connectionVersion','messages','allowedCitations'].includes(k)))throw Error('CLOUD_REQUEST_INVALID');requests++;const result=await s.adapter.complete({messages:data.messages,allowedCitations:data.allowedCitations},{signal:controller.signal});controller.signal.throwIfAborted();await stillAccount();json(res,200,result);}
     finally{s.busy=false;s.controller=null;}return;
    }
    throw Error('CLOUD_REQUEST_INVALID');
   }catch(e){
    const code=controller.signal.aborted?'CLOUD_REQUEST_CANCELLED':/^CLOUD_[A-Z_]+$/u.test(e?.message)?e.message:'CLOUD_SERVICE_UNAVAILABLE';
    if(!res.destroyed&&!res.writableEnded)json(res,code==='CLOUD_AUTH_FAILED'||code==='CLOUD_NOT_CONNECTED'||code==='CLOUD_ACCOUNT_REQUIRED'?401:code==='CLOUD_ACCESS_DENIED'?403:code==='CLOUD_BUSY'||code==='CLOUD_RATE_LIMITED'?429:code==='CLOUD_KEY_INVALID'||code==='CLOUD_CONFIG_INVALID'||code==='CLOUD_MODEL_INVALID'||code==='CLOUD_PROVIDER_INVALID'||code==='CLOUD_REQUEST_INVALID'?400:502,{code});
   }finally{fresh?.dispose();pending.delete(controller);pendingAccounts.delete(controller);req.removeListener('aborted',abort);res.removeListener('close',abort);}return;
  }
  if(req.method!=='GET'){json(res,405,{code:'METHOD_DENIED'});return;}
  if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);return;}
  if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  try{
   const requested=decodeURIComponent(url.pathname),prefixes=['/akronikl/','/core/','/sandbox/','/tools/qa-akronikl/','/tests/fixtures/'];if(!prefixes.some(p=>requested.startsWith(p)))throw Error();
   const file=await realpath(path.resolve(base,requested.slice(1)));if(!file.startsWith(base+path.sep))throw Error();
   const rel='/'+path.relative(base,file).replaceAll(path.sep,'/');if(!prefixes.some(p=>rel.startsWith(p)))throw Error();
   const type={'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.wasm':'application/wasm'}[path.extname(file)];if(!type)throw Error();
   res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(await readFile(file));
  }catch{json(res,404,{code:'NOT_FOUND'});}
 });
 server.requestTimeout=10000;server.headersTimeout=10000;
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});origin='http://127.0.0.1:'+server.address().port;cookieName='akronikl_cloud_'+server.address().port;
 const sweepTimer=setInterval(sweep,60000);sweepTimer.unref();
 return Object.freeze({origin,revokeAccount(id){for(const [p,accountId]of pendingAccounts)if(accountId===id)p.abort();for(const [sessionId,s]of sessions)if(s.accountId===id)drop(sessionId);},status(){sweep();return {sessions:sessions.size,pending:pending.size,requests,connections,cancellations,remoteComputeStoppedProven:false};},async close(){clearInterval(sweepTimer);for(const p of pending)p.abort();for(const id of sessions.keys())drop(id);server.closeAllConnections();await new Promise(r=>server.close(r));}});
}
