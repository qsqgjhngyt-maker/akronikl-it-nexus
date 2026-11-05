import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const args=Object.fromEntries(process.argv.slice(2).reduce((r,x,i,a)=>x.startsWith('--')?[...r,[x.slice(2),a[i+1]]]:r,[]));
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(args.root||path.join(here,'../review/cpp-clarity-r3'));
const repo=path.resolve(args.repo||path.join(here,'..'));
const port=Number(args.port||47653);
const ref='courses/onec-education/native/downloads/NexusTrainingServiceDeskReportsV2.cf';
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.bsl':'text/plain; charset=utf-8','.query':'text/plain; charset=utf-8','.cf':'application/octet-stream'};
const files=[];function visit(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())visit(p);else files.push({path:path.relative(root,p).replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')});}}visit(root);files.sort((a,b)=>a.path.localeCompare(b.path));
const digest=crypto.createHash('sha256').update(JSON.stringify(files)).digest('hex');
if(args.fingerprint){process.stdout.write(JSON.stringify({assetDigest:digest,files:files.length})+'\n');process.exit(0);}
const server=http.createServer((req,res)=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}let url;try{url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}if(url.startsWith('/api')){res.writeHead(401);return res.end('Account APIs are unavailable in the isolated review preview.');}if(url==='/health'){res.setHeader('Content-Type',mime['.json']);return res.end(JSON.stringify({status:'review-only',baseline:'ec6f6b9d432566585a12c16e123b066dc199ec8a',assetDigest:digest,files:files.length,auth:false,runtime:false,privatePersistence:false}));}
let file;if(url==='/references/NexusTrainingServiceDeskReportsV2.cf')file=path.join(repo,ref);else{const key=url==='/'?'index.html':url.slice(1);if(!files.some(f=>f.path===key)){res.writeHead(404);return res.end('Not in review manifest');}file=path.join(root,key);}try{const body=fs.readFileSync(file);res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.writeHead(200);res.end(req.method==='HEAD'?undefined:body);}catch{res.writeHead(404);res.end('Resource unavailable');}});
server.listen(port,'127.0.0.1',()=>process.stdout.write(`R3 review: http://127.0.0.1:${port}/\nAsset digest: ${digest}\n`));
