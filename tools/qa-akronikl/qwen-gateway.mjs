// Isolated localhost QA gateway, never a deployment or a production auth route.
import http from 'node:http';
import path from 'node:path';
import {readFile,realpath} from 'node:fs/promises';
import {createQwenUpstream,QWEN_UPSTREAM,validateCloudRequest} from './qwen-upstream.mjs';
export async function readQwenKey(file){
  const value=file?(await readFile(file,'utf8')).replace(/^\uFEFF/u,'').trim():process.env.DASHSCOPE_API_KEY?.trim();
  if(typeof value!=='string'||!/^sk-[A-Za-z0-9_-]{16,}$/u.test(value))throw Error('CLOUD_KEY_REQUIRED');return value;
}
export async function startQwenQaServer({root,apiKey=null,onOutcome=null,upstream=null}={}){
  const base=await realpath(root);let origin='',active=0,requests=0,cancellations=0;
  const complete=upstream??(apiKey?createQwenUpstream({apiKey,onOutcome}):null);
  const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
  const html='<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Akronikl — Qwen cloud QA</title><body><main id="root"><button id="open">Akronikl</button></main><script type="module" src="/tools/qa-akronikl/cloud-browser-entry.mjs"></script></body></html>';
  const server=http.createServer(async(req,res)=>{
    const expected=new URL(origin).host;
    if(req.headers.host!==expected){json(res,403,{code:'HOST_DENIED'});return;}
    const url=new URL(req.url,origin);
    if(url.search){json(res,400,{code:'QUERY_DENIED'});return;}
    if(url.pathname==='/api/akronikl/qwen/ready'&&req.method==='GET'){json(res,200,{ready:!!complete,model:QWEN_UPSTREAM.model,generationTested:false});return;}
    if(url.pathname==='/api/akronikl/qwen'){
      if(req.method!=='POST'||req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json'){json(res,403,{code:'CLOUD_REQUEST_DENIED'});return;}
      if(!complete){json(res,503,{code:'CLOUD_KEY_REQUIRED'});return;}
      if(Number(req.headers['content-length'])>32768){req.resume();json(res,400,{code:'CLOUD_REQUEST_INVALID'});return;}
      if(active){json(res,429,{code:'CLOUD_BUSY'});return;}
      active++;const controller=new AbortController();
      const abort=()=>{if(!res.writableEnded&&!controller.signal.aborted){cancellations++;controller.abort();}};
      req.once('aborted',abort);res.once('close',abort);
      try{
        let bytes=0;const parts=[];
        for await(const part of req){bytes+=part.length;if(bytes>32768)throw Error('CLOUD_REQUEST_INVALID');parts.push(part);}
        let data;try{data=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw Error('CLOUD_REQUEST_INVALID');}
        validateCloudRequest(data);controller.signal.throwIfAborted();requests++;
        const answer=await complete(data,{signal:controller.signal});
        if(!controller.signal.aborted)json(res,200,answer);
      }catch(error){
        const code=typeof error?.message==='string'&&/^CLOUD_(?:REQUEST_INVALID|BUSY|REQUEST_CANCELLED|RESPONSE_INVALID|UPSTREAM_HTTP_\d{3})$/u.test(error.message)?error.message:'CLOUD_UNAVAILABLE';
        if(!res.destroyed&&!res.writableEnded)json(res,code==='CLOUD_REQUEST_INVALID'?400:code==='CLOUD_REQUEST_CANCELLED'?499:502,{code});
      }finally{active--;req.removeListener('aborted',abort);res.removeListener('close',abort);}
      return;
    }
    if(req.method!=='GET'){json(res,405,{code:'METHOD_DENIED'});return;}
    if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);return;}
    if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
    try{
      const prefix=['/akronikl/','/core/','/sandbox/','/tools/qa-akronikl/','/tests/fixtures/'];
      const requested=decodeURIComponent(url.pathname);if(!prefix.some(p=>requested.startsWith(p)))throw Error('PATH_DENIED');
      const f=await realpath(path.resolve(base,requested.slice(1)));if(!f.startsWith(base+path.sep))throw Error('PATH_DENIED');
      const relative='/'+path.relative(base,f).replaceAll(path.sep,'/');if(!prefix.some(p=>relative.startsWith(p)))throw Error('PATH_DENIED');
      const mime={'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.wasm':'application/wasm'}[path.extname(f)];if(!mime)throw Error('TYPE_DENIED');
      res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(await readFile(f));
    }catch{json(res,404,{code:'NOT_FOUND'});}
  });
  server.requestTimeout=10000;server.headersTimeout=10000;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});origin='http://127.0.0.1:'+server.address().port;
  return Object.freeze({origin,status:()=>({active,requests,cancellations,remoteComputeStoppedProven:false}),async close(){server.closeAllConnections();await new Promise(r=>server.close(r));}});
}
