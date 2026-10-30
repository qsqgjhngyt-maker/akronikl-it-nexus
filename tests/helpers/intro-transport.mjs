// Публичное медиа точной сборки. Тесты не обращаются к production/CDN.
import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{createHash}from'node:crypto';import path from'node:path';
import{INTRO_VIDEO_BASE}from'../../core/startup-intro-assets.js';
import{staticMime}from'../../pwa/static-mime.js';
export async function bindIntroTransport(context,{frontend,requests}){
 const manifest=JSON.parse(await readFile(path.join(frontend,'BUILD_MANIFEST.json')));
 await context.route(INTRO_VIDEO_BASE+'*',async route=>{
  const req=route.request(),u=new URL(req.url()),headers=await req.allHeaders(),name=u.href.slice(INTRO_VIDEO_BASE.length);
  assert.match(name,/^(?:desktop|mobile)(?:-lite)?\.(?:mp4|webm)$/);
  assert.equal(req.method(),'GET');assert.equal(Boolean(headers.cookie||headers.authorization),false);
  const file='intro-media/cinematic-v6/'+name,row=manifest.files.find(r=>r.file===file)||manifest.files.find(r=>r.file===manifest.prefix+file);
  assert.ok(row,'Current public video must be in producer manifest');
  const body=await readFile(path.join(frontend,row.file));assert.equal(body.length,row.bytes);assert.equal(createHash('sha256').update(body).digest('hex'),row.sha256);
  requests.push({path:u.pathname,method:'GET',publicMediaFixture:true,sha256:row.sha256});
  await route.fulfill({status:200,headers:{'content-type':staticMime(file),'access-control-allow-origin':'*','cache-control':'no-store'},body});
 });
 await context.route('https://qsqgjhngyt-maker.github.io/akronikl-it-nexus/intro-media/**',async route=>{
  const req=route.request(),u=new URL(req.url()),headers=await req.allHeaders();
  assert.match(u.href,/^https:\/\/qsqgjhngyt-maker\.github\.io\/akronikl-it-nexus\/intro-media\/(?:cinematic-v4\/(?:desktop|mobile)\.(?:mp4|webm)|cinematic-v3\/mobile\/(?:mp4\/part-00[0-3]\.mp4|webm\/part-00[0-3]\.webm))$/);
  assert.equal(req.method(),'GET');assert.equal(Boolean(headers.cookie||headers.authorization),false);
  const file=u.pathname.replace('/akronikl-it-nexus/',''),row=manifest.files.find(r=>r.file===file)||manifest.files.find(r=>r.file===manifest.prefix+file);assert.ok(row,'Public intro media must be in producer manifest');
  const body=await readFile(path.join(frontend,row.file));assert.equal(body.length,row.bytes);assert.equal(createHash('sha256').update(body).digest('hex'),row.sha256);requests.push({path:u.pathname,method:req.method(),publicMediaFixture:true});
  await route.fulfill({status:200,headers:{'content-type':file.endsWith('.mp4')?'video/mp4':'video/webm','access-control-allow-origin':'*','cache-control':'no-store'},body});
 });
}
