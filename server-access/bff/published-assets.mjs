import {readFileSync} from 'node:fs';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {ENTRY_SHELL_URL} from './entry-gate.mjs';
import {GATEWAY_ORIGIN} from './account-read.mjs';
import {staticMime} from '../../pwa/static-mime.js';
const hash=b=>createHash('sha256').update(b).digest('hex');
const mime=staticMime;
export function createPublishedAssets({env={},root=fileURLToPath(new URL('../frontend/',import.meta.url)),fetchImpl=fetch,origin=GATEWAY_ORIGIN}={}){
 if(env.NEXUS_P4Q_BUILD_ENABLED!=='true')return Object.freeze({handle:async()=>false,fetchImpl});
 const index=JSON.parse(readFileSync(path.join(root,'PUBLISHED_FILES.json'),'utf8')),files=new Map();
 if(index.version!==1||!/^ui1a-p4q-[a-z0-9-]+$/.test(index.generation)||!Array.isArray(index.files))throw Error('PUBLIC_BUILD_INVALID');
 for(const r of index.files){if(typeof r.path!=='string'||!/^\/[A-Za-z0-9._/@+-]+(?:\/[A-Za-z0-9._@+-]+)*$/.test(r.path)||r.path.split('/').some(p=>p==='..'||p==='.')||!Number.isSafeInteger(r.bytes)||r.bytes>2400000||!/^[a-f0-9]{64}$/.test(r.sha256)||files.has(r.path))throw Error('PUBLIC_BUILD_INVALID');files.set(r.path,r);}
 const shell=readFileSync(path.join(root,'nexus-shell.html')),shellRecord=index.shell;if(shell.length!==shellRecord?.bytes||hash(shell)!==shellRecord.sha256)throw Error('PUBLIC_BUILD_INVALID');
 return Object.freeze({fetchImpl:async(url,init)=>url===ENTRY_SHELL_URL?new Response(shell,{headers:{'content-type':'text/html; charset=utf-8','content-length':String(shell.length)}}):fetchImpl(url,init),async handle(req,res){
  let url;try{url=new URL(req.url,origin);}catch{return false;}const r=files.get(url.pathname);if(!r)return false;
  if(url.origin!==origin||req.headers.host!==new URL(origin).host||url.hash||url.search.length>512){res.writeHead(403,{'cache-control':'no-store','vary':'*'});res.end();return true;}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'cache-control':'no-store','vary':'*'});res.end();return true;}
  const bytes=await readFile(path.join(root,r.path.slice(1)));if(bytes.length!==r.bytes||hash(bytes)!==r.sha256)throw Error('PUBLIC_ASSET_CHANGED');
  res.writeHead(200,{'content-type':mime(r.path),'content-length':bytes.length,'cache-control':r.immutable?'public, max-age=31536000, immutable':'no-cache','etag':'"'+r.sha256+'"','vary':'Accept-Encoding','x-content-type-options':'nosniff',...(r.path==='/service-worker.js'?{'service-worker-allowed':'/'}:{})});res.end(req.method==='HEAD'?undefined:bytes);return true;
 }});
}
