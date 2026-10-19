// Единая Account-сессия для Cloud. По умолчанию закрыто; legacy-sync.js не изменяется.
import legacy from './legacy-sync.js';
import {readEligibleAccountFoundation} from './account-foundation.js';

export const CLOUD_INTERNAL_PATH = '/api/v2/cloud/internal';
const MAX_REQUEST = 1_600_000;
const MAX_RESPONSE = 2_100_000;
const encoder = new TextEncoder();
const reply = (status, body) => Response.json(body, {status, headers:{
  'cache-control':'no-store', 'vary':'*', 'x-content-type-options':'nosniff'
}});
class CloudError extends Error {
  constructor(status, code) { super(code); this.status=status; this.code=code; }
}
const fail = (status, code) => { throw new CloudError(status, code); };
const sha = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256',
  typeof bytes==='string'?encoder.encode(bytes):bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');

// Принимаются только существующие операции sync; bootstrap, identity и произвольный proxy запрещены.
export function cloudOperationPath(method, path) {
  if (typeof path!=='string' || path.length>2048 || /[?#\\]/.test(path)) return null;
  if (method==='GET' && (path==='/api/v1/me' || path==='/api/v1/projects')) return path;
  const match=/^\/api\/v1\/projects\/([^/]+)(\/audit)?$/.exec(path);
  if (!match || !['GET','PUT'].includes(method) || match[2] && method!=='GET') return null;
  try {
    const id=decodeURIComponent(match[1]);
    // Каноническое encodeURIComponent сохраняет stable IDs, включая импортированные Unicode IDs.
    if (!id || id.length>256 || id==='.' || id==='..' || /[/\\\u0000-\u001f\u007f]/.test(id) ||
        encodeURIComponent(id)!==match[1]) return null;
    return path;
  } catch { return null; }
}

async function readBytes(body, max) {
  const reader=body?.getReader(); if (!reader) fail(400,'INVALID_INPUT');
  let length=0;const parts=[];
  try {
    while (true) { const {done,value}=await reader.read();if(done)break;
      length+=value.byteLength;if(length>max)fail(413,'INPUT_TOO_LARGE');parts.push(value); }
    const bytes=new Uint8Array(length);let offset=0;
    for(const part of parts){bytes.set(part,offset);offset+=part.byteLength}return bytes;
  } finally { await reader.cancel().catch(()=>{});reader.releaseLock(); }
}
const parse = bytes => { try { return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)); }
  catch { fail(400,'INVALID_INPUT'); } };

async function verify(request, env) {
  const url=new URL(request.url);
  if (request.method!=='POST' || url.pathname!==CLOUD_INTERNAL_PATH || url.search ||
      request.headers.has('cookie') || request.headers.has('authorization') ||
      request.headers.get('content-type')!=='application/json') fail(401,'SERVICE_DENIED');
  const stamp=request.headers.get('x-nexus-service-timestamp');
  const nonce=request.headers.get('x-nexus-service-nonce');
  const signature=request.headers.get('x-nexus-service-signature');
  if (!/^\d{13}$/.test(stamp||'') || !/^[a-f0-9]{32}$/.test(nonce||'') ||
      !/^[a-f0-9]{64}$/.test(signature||'') || Math.abs(Date.now()-Number(stamp))>30000)
    fail(401,'SERVICE_DENIED');
  const bytes=await readBytes(request.body,MAX_REQUEST);
  const key=await crypto.subtle.importKey('raw',encoder.encode(env.CLOUD_SERVICE_KEY),
    {name:'HMAC',hash:'SHA-256'},false,['verify']);
  const canonical=`v1\nPOST\n${CLOUD_INTERNAL_PATH}\n${stamp}\n${nonce}\n${await sha(bytes)}`;
  if (!await crypto.subtle.verify('HMAC',key,
      Uint8Array.from(signature.match(/../g),x=>parseInt(x,16)),encoder.encode(canonical)))
    fail(401,'SERVICE_DENIED');
  const value=parse(bytes);
  if (!value || typeof value!=='object' || Array.isArray(value) ||
      Object.keys(value).sort().join(',')!=='expectedAccountId,method,path,payload,sessionCookie' ||
      !/^nxs_[A-Za-z0-9_-]{24,256}$/.test(value.sessionCookie||'') ||
      typeof value.expectedAccountId!=='string' ||
      !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(value.expectedAccountId) ||
      !cloudOperationPath(value.method,value.path) ||
      (value.method==='GET'?value.payload!==null:
        !value.payload || typeof value.payload!=='object' || Array.isArray(value.payload)))
    fail(401,'SERVICE_DENIED');
  // Существующая таблица 0008 хранит только случайные nonce, без cookie и пользовательских данных.
  const inserted=await env.DB.prepare(`INSERT OR IGNORE INTO account_service_nonces(nonce,expires_at)
    VALUES(?1,?2)`).bind(nonce,new Date(Number(stamp)+30000).toISOString()).run();
  if (!inserted.success || Number(inserted.meta?.changes)!==1) fail(401,'SERVICE_DENIED');
  const foundation=await readEligibleAccountFoundation(env.DB,await sha(value.sessionCookie));
  if (!foundation) fail(401,'SESSION_REQUIRED');
  // expectedAccountId никогда не выбирает actor. Только равенство подтверждённому сервером account.
  if (foundation.account.accountId!==value.expectedAccountId) fail(409,'ACCOUNT_SESSION_CHANGED');
  return {...value,account:foundation.account};
}

const allowedErrors=new Set(['INVALID_SESSION','PROJECT_NOT_FOUND','PROJECT_ID_MISMATCH',
  'SNAPSHOT_TOO_LARGE','REVISION_CONFLICT','OWNER_MISMATCH','WORKSPACE_REQUIRED',
  'WORKSPACE_NOT_FOUND','WORKSPACE_FORBIDDEN','ACCESS_DENIED','FORBIDDEN','NOT_FOUND','INVALID_JSON']);

// fetchLegacy инъецируется только тестом; production использует неизменённый ACL/revisions engine.
export function createCloudSessionService({fetchLegacy=legacy.fetch.bind(legacy)}={}) {
  return async (request,env,context) => {
    if (new URL(request.url).pathname!==CLOUD_INTERNAL_PATH) return null;
    if (env.CLOUD_SESSION_ENABLED!=='true' || !env.DB ||
        typeof env.CLOUD_SERVICE_KEY!=='string' || env.CLOUD_SERVICE_KEY.length<32)
      return reply(404,{error:{code:'CLOUD_UNAVAILABLE'}});
    try {
      const op=await verify(request,env);
      // Cookie никогда не отдаётся JS: credential существует только в private BFF→Worker запросе
      // и в локальном Request к уже принятому legacy engine. Новых токенов/аккаунтов здесь нет.
      const upstream=await fetchLegacy(new Request('https://cloud.internal'+op.path,{
        method:op.method,headers:{accept:'application/json','content-type':'application/json',
          authorization:`Bearer ${op.sessionCookie}`},
        ...(op.method==='PUT'?{body:JSON.stringify(op.payload)}:{})
      }),env,context);
      if (!upstream.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
        fail(502,'CLOUD_UNAVAILABLE');
      const bytes=await readBytes(upstream.body,MAX_RESPONSE);
      const data=parse(bytes);
      // В том числе исключает случайный echo transport credential новым/ошибочным legacy DTO.
      if (new TextDecoder().decode(bytes).includes(op.sessionCookie)) fail(502,'CLOUD_UNAVAILABLE');
      if (!upstream.ok) {
        const code=allowedErrors.has(data?.error?.code)?data.error.code:'CLOUD_UNAVAILABLE';
        const error={code};
        if (code==='REVISION_CONFLICT') {
          const details=data.error.details;
          error.details={serverRevision:Number.isSafeInteger(details?.serverRevision)?details.serverRevision:null,
            baseRevision:Number.isSafeInteger(details?.baseRevision)?details.baseRevision:null};
        }
        return reply([400,401,403,404,409,413,429].includes(upstream.status)?upstream.status:502,{error});
      }
      if (op.path==='/api/v1/me') {
        if (data?.subject?.id!==op.account.accountId) fail(502,'CLOUD_UNAVAILABLE');
        return reply(200,{subject:{id:op.account.accountId,displayName:op.account.displayName},
          authMode:'nexus-session'});
      }
      const keys=Object.keys(data||{}).sort().join(',');
      if (op.method==='PUT' ? keys!=='hash,ok,projectId,revision,sizeBytes,storage,updatedAt' :
          op.path==='/api/v1/projects' ? keys!=='projects' : op.path.endsWith('/audit') ? keys!=='events' :
          keys!=='meta,project') fail(502,'CLOUD_UNAVAILABLE');
      return reply(200,data);
    } catch(error) {
      // Ни exceptions, ни payload/headers не логируются: внутри находится HttpOnly credential.
      return reply(error instanceof CloudError?error.status:503,
        {error:{code:error instanceof CloudError?error.code:'CLOUD_UNAVAILABLE'}});
    }
  };
}
export const handleCloudSessionRequest=createCloudSessionService();
