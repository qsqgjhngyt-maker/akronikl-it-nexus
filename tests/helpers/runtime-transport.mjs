// Опциональная воспроизводимая доставка настоящих pinned bytes для локального QA.
// Не входит в приложение. В offline все запросы завершаются ошибкой; компилятор не подменяется.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {RUNTIME_RESOURCES} from '../../pwa/runtime-manifest.js';
export async function bindRuntimeTransport(context,{offline=()=>false}={}){
 const dir=process.env.NEXUS_PINNED_RUNTIME_DIR;if(!dir)return;
 const files=new Map();
 for(const resource of RUNTIME_RESOURCES){
  const name=resource.url.endsWith('/+esm')?'runno-entry.js':resource.url.endsWith('/bundle.js')?'clang-bundle.js':new URL(resource.url).pathname.split('/').at(-1);
  const body=await readFile(path.join(dir,name));
  if(body.length!==resource.bytes||createHash('sha256').update(body).digest('hex')!==resource.sha256)throw Error('PINNED_RUNTIME_FIXTURE_HASH_MISMATCH');
  files.set(resource.url,{body,contentType:resource.mime});
 }
 await context.route('https://cdn.jsdelivr.net/**',async route=>{
  const record=files.get(route.request().url());
  if(offline()||!record||route.request().method()!=='GET')return route.abort('internetdisconnected');
  return route.fulfill({...record,status:200,headers:{'access-control-allow-origin':'*','cache-control':'public, max-age=31536000, immutable'}});
 });
 console.log('QA_TRANSPORT local SHA256-verified '+RUNTIME_RESOURCES.length+'-file Clang/WASI fixture; not CDN LIVE');
}
