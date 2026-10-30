// Synthetic transport regression only. It never certifies real provider login.
import test from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';import {once} from 'node:events';import {pathToFileURL} from 'node:url';
import {installCandidateRouting} from '../tools/publication-auth-routing.mjs';
test('every 302/303 hop targets QA; browser URL and cookies retain first-party origin',{skip:!process.env.NEXUS_PLAYWRIGHT_MODULE},async()=>{
 const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE).href);let primaryHits=0,providerAuth;const seen=[],observed=[],failures=[];
 const primary=http.createServer((q,s)=>{primaryHits++;s.end('UNEXPECTED_PRODUCTION');});primary.listen(0,'127.0.0.1');await once(primary,'listening');const origin='http://localhost:'+primary.address().port;
 const idp=http.createServer((q,s)=>{providerAuth=q.headers.authorization;s.writeHead(302,{location:origin+'/callback'});s.end();});idp.listen(0,'127.0.0.1');await once(idp,'listening');
 const qa=http.createServer((q,s)=>{
  seen.push(q.url);if(q.url!=='/wrong-candidate')s.setHeader('x-nexus-auth-candidate','TEST_MARKER');
  if(q.url==='/start'){s.writeHead(302,{location:'http://127.0.0.1:'+idp.address().port+'/authorize'});s.end();}
  else if(q.url==='/callback'){s.writeHead(303,{location:origin+'/', 'set-cookie':'qa_session=REAL_TRANSPORT_TEST; Path=/; HttpOnly; SameSite=Lax'});s.end();}
  else if(q.url==='/account'){s.setHeader('content-type','application/json');s.end(JSON.stringify({cookie:q.headers.cookie??null}));}
  else if(q.url==='/entry.js'){s.setHeader('content-type','text/javascript');s.end('window.qaModuleLoaded=true;');}
  else{s.setHeader('content-type','text/html');s.end('<!doctype html><title>QA candidate</title><script type="module" src="/entry.js"></script>');}
 });qa.listen(0,'127.0.0.1');await once(qa,'listening');
 const browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_BIN});
 try{
  const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),routing=await installCandidateRouting(context,page,{origin,target:'http://127.0.0.1:'+qa.address().port,token:'TEST_IAM',marker:'TEST_MARKER',onResponse:r=>observed.push(r),onFailure:r=>failures.push(r)});
  await page.goto(origin+'/start',{waitUntil:'load',timeout:15000});assert.equal(page.url(),origin+'/');
  assert.equal(await page.evaluate(()=>window.qaModuleLoaded),true);
  const account=await page.evaluate(async()=>await(await fetch('/account')).json());assert.equal(account.cookie,'qa_session=REAL_TRANSPORT_TEST');
  assert.ok((await context.cookies(origin)).some(c=>c.name==='qa_session'));assert.equal(providerAuth,undefined);
  assert.equal(primaryHits,0);assert.equal(routing.hasFailed(),false,JSON.stringify({failures,observed,seen}));assert.deepEqual(seen.filter(p=>p!=='/favicon.ico'),['/start','/callback','/','/entry.js','/account']);assert.ok(observed.some(r=>r.path==='/callback'&&r.status===303));
  await assert.rejects(page.goto(origin+'/wrong-candidate',{timeout:5000}));assert.equal(routing.hasFailed(),true);assert.equal(primaryHits,0);
  await context.close();
 }finally{await browser.close();for(const s of [primary,idp,qa]){s.closeAllConnections();await new Promise(r=>s.close(r));}}
});
