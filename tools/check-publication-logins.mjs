// The owner completes each real passkey/provider flow. No credentials, tokens,
// screenshots, traces, request bodies or provider callback URLs are saved.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';import {pathToFileURL} from 'node:url';
import {AUTH_ORIGIN,AUTH_METHODS,authEvidenceHash,validateAuthCandidate} from './publication-auth-gate.mjs';
import {need,yc,readAuthTestTarget} from './publication-auth-cloud.mjs';
import {installCandidateRouting} from './publication-auth-routing.mjs';
const providers={google:'accounts.google.com',yandex:'oauth.yandex.ru'};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
export async function collectPublicationLogins({plan,out,playwrightModule,chromeBin,methods=AUTH_METHODS}){
 const candidateId=validateAuthCandidate(plan.candidate);need(Array.isArray(methods)&&methods.length===3&&AUTH_METHODS.every(m=>methods.includes(m)),'ALL_THREE_METHODS_REQUIRED');
 need(authEvidenceHash(await readAuthTestTarget(plan))===authEvidenceHash(plan.candidate.testTarget),'CANDIDATE_READBACK_FAILED');
 await mkdir(out,{recursive:true});const save=(name,value)=>writeFile(join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
 const {chromium}=await import(pathToFileURL(resolve(playwrightModule)).href),token=yc(['iam','create-token'],{raw:true});
 need(token&&!/[\r\n]/.test(token),'IAM_TOKEN_INVALID');
 const browser=await chromium.launch({headless:false,executablePath:chromeBin,timeout:30000});
 const receipt={schema:1,kind:'observed-real-browser-logins',candidateId,testTarget:plan.candidate.testTarget,checkedAt:null,checks:[]};let activeMethod=null;
 try{
  for(const method of methods){
   activeMethod=method;const startedAt=new Date().toISOString(),context=await browser.newContext({serviceWorkers:'block'});let routingFailed=false,verifyStatus=null,callbackStatus=null,providerVisited=false;
   try{
    context.on('response',response=>{try{const req=response.request();if(req.isNavigationRequest()&&!req.frame().parentFrame()&&new URL(response.url()).hostname===providers[method]&&response.status()>=200&&response.status()<400)providerVisited=true;}catch{}});
    const page=await context.newPage();
    await installCandidateRouting(context,page,{origin:AUTH_ORIGIN,target:plan.url,token,marker:plan.candidate.imageDigest,onFailure:()=>{routingFailed=true;},onResponse:({path,status})=>{
     if(path==='/api/v2/account/passkey/authenticate/verify')verifyStatus=status;
     if(path==='/api/v2/account/oauth/'+method+'/callback')callbackStatus=status;
    }});
    // Browser fetches go through the same strict routing, including Cookie handling.
    const account=()=>page.evaluate(async()=>{const r=await fetch('/api/v2/account',{cache:'no-store',credentials:'same-origin'});let id=null;if(r.status===200){const body=await r.json();id=body?.account?.accountId;}return {status:r.status,id};});
    await page.goto(AUTH_ORIGIN+'/account/entry/',{waitUntil:'domcontentloaded',timeout:40000});
    const initial=await account();need(initial.status===401,'FRESH_CONTEXT_NOT_ANONYMOUS');
    console.log(JSON.stringify({status:'OWNER_LOGIN_REQUIRED',method,message:'В проверочном окне войдите выбранным способом. Пароли и коды остаются в браузере.'}));
    const deadline=Date.now()+5*60*1000;let signed;
    while(Date.now()<deadline){
     need(!routingFailed,'PRIVATE_CANDIDATE_ROUTING_FAILED');need(!page.isClosed(),'OWNER_CLOSED_CHECK_WINDOW');
     const observed=method==='passkey'?verifyStatus===200:providerVisited&&callbackStatus===303;
     if(observed&&new URL(page.url()).origin===AUTH_ORIGIN){try{const r=await account();if(r.status===200&&typeof r.id==='string'&&r.id.length){signed=r;break;}}catch{}}
     await delay(750);
    }
    need(signed,'OWNER_LOGIN_NOT_COMPLETED');
    await page.reload({waitUntil:'domcontentloaded',timeout:40000});const reloaded=await account();need(reloaded.status===200&&reloaded.id===signed.id,'RELOAD_SESSION_LOST');
    // Only the session created in this isolated context is revoked.
    const logout=await page.evaluate(async()=>{const r=await fetch('/api/v2/account/passkey/logout',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json','x-nexus-passkey-write':'1'},body:'{}'});return r.status;});
    need(logout===200,'QA_SESSION_LOGOUT_FAILED');const loggedOut=await account();need(loggedOut.status===401&&!routingFailed,'QA_SESSION_NOT_REVOKED');
    receipt.checks.push({method,status:'LIVE_FULL_LOGIN_PASS',startedAt,finishedAt:new Date().toISOString(),initialAccountStatus:401,verifyStatus:method==='passkey'?verifyStatus:null,providerVisited:method!=='passkey'&&providerVisited,callbackStatus:method==='passkey'?null:callbackStatus,accountStatus:200,reloadAccountStatus:200,logoutAccountStatus:401,accountBinding:authEvidenceHash({candidateId,accountId:signed.id}),simulated:false});
    await save(method+'-observed.json',receipt.checks.at(-1));console.log(JSON.stringify({status:'LIVE_FULL_LOGIN_PASS',method}));
   }finally{await context.close();}
  }
  need(new Set(receipt.checks.map(c=>c.accountBinding)).size===1,'METHODS_BELONG_TO_DIFFERENT_NEXUS_ACCOUNTS');
  need(authEvidenceHash(await readAuthTestTarget(plan))===authEvidenceHash(plan.candidate.testTarget),'CANDIDATE_CHANGED_DURING_LOGIN');
  receipt.checkedAt=new Date().toISOString();await save('logins.json',receipt);return receipt;
 }catch(error){
  await save('LOGINS_FAIL_'+Date.now()+'.json',{status:'FULL_LOGIN_CHECK_INCOMPLETE_PUBLICATION_BLOCKED',candidateId,method:activeMethod,completedMethods:receipt.checks.map(c=>c.method),code:/^[A-Z0-9_]+$/.test(error.message)?error.message:'BROWSER_CHECK_FAILED',checkedAt:new Date().toISOString()});throw error;
 }finally{await browser.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{const plan=JSON.parse(await readFile(process.argv[2],'utf8'));await collectPublicationLogins({plan,out:resolve(process.argv[3]),playwrightModule:process.env.NEXUS_PLAYWRIGHT_MODULE,chromeBin:process.env.NEXUS_CHROME_BIN});console.log('ALL_THREE_REAL_LOGINS_OBSERVED');}
 catch(e){console.error(/^[A-Z0-9_]+$/.test(e.message)?e.message:'BROWSER_CHECK_FAILED');process.exitCode=1;}
}
