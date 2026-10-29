// Isolated in-memory execution of the existing BFF/Worker, not a deployment adapter.
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Readable} from 'node:stream';
import worker from '../../server-access/worker/entry.mjs';
import {createFeedbackHandler} from '../../server-access/bff/feedback.mjs';
import {createContentHandler} from '../../server-access/bff/content.mjs';
import {createPasskeyHandler} from '../../server-access/bff/passkey.mjs';
import {createAccountReadHandler,GATEWAY_ORIGIN,WORKER_ORIGIN} from '../../server-access/bff/account-read.mjs';
import {createEntryGateHandler,ENTRY_SHELL_URL} from '../../server-access/bff/entry-gate.mjs';
import {createOAuthHandler} from '../../server-access/bff/oauth.mjs';
import {createAccountControlHandler} from '../../server-access/bff/account-control.mjs';
export async function fixture(frontend,{oauth=false,control=false,databaseFile=null}={}){
 const db=new DatabaseSync(databaseFile??':memory:');db.exec('PRAGMA foreign_keys=ON');
 const migrations=['cloudflare/nexus-sync-worker/migrations/0002_nexus_account_tokens.sql','cloudflare/nexus-sync-worker/migrations/0004_identity_v2_session_foundation.sql',...['0005_login_methods_registry','0006_account_lifecycle_hardening','0007_identity_owner_and_issuance_guards','0008_account_service_nonces','0009_passkeys','0010_feedback','0011_oauth_service'].map(x=>'server-access/migrations/'+x+'.sql')];
 if(control){migrations.unshift('cloudflare/nexus-sync-worker/migrations/0001_sync_team_foundation.sql');migrations.splice(2,0,'cloudflare/nexus-sync-worker/migrations/0003_d1_only_project_snapshots.sql');migrations.push('server-access/migrations/0012_alpha_administration.sql','server-access/migrations/0013_account_avatars.sql','server-access/migrations/0014_community_content.sql')}
 if(databaseFile)db.exec('CREATE TABLE IF NOT EXISTS qa_fixture_migrations(name TEXT PRIMARY KEY)');
 for(const file of migrations){if(databaseFile&&db.prepare('SELECT 1 FROM qa_fixture_migrations WHERE name=?').get(file))continue;db.exec(await readFile(new URL('../../'+file,import.meta.url),'utf8'));if(databaseFile)db.prepare('INSERT INTO qa_fixture_migrations(name) VALUES(?)').run(file);}
 const statement=(sql,args=[])=>{
  const s=db.prepare(sql);
  return{
   bind:(...values)=>statement(sql,values),
   async first(){return s.get(...args)||null},
   async all(){return{success:true,results:s.all(...args)}},
   async run(){return this.execute()},
   execute(){
    if(/\bRETURNING\b/i.test(sql)){const results=s.all(...args);return{success:true,results,meta:{changes:results.length}}}
    return{success:true,results:[],meta:{changes:Number(s.run(...args).changes)}};
   }
  };
 };
 let beforeBatch=null;
 const DB={prepare:sql=>statement(sql),async batch(commands){if(beforeBatch){const hook=beforeBatch;beforeBatch=null;hook()}db.exec('BEGIN');try{const results=commands.map(x=>x.execute());db.exec('COMMIT');return results}catch(e){db.exec('ROLLBACK');throw e}}};
 const env={DB,PASSKEY_ENABLED:'true',PASSKEY_PROXY_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',PASSKEY_ORIGIN:GATEWAY_ORIGIN,PASSKEY_RP_ID:new URL(GATEWAY_ORIGIN).hostname,PASSKEY_WORKER_ORIGIN:WORKER_ORIGIN,PASSKEY_SERVICE_KEY:'SYNTHETIC_PASSKEY_SERVICE_KEY_ONLY_20261020',ACCOUNT_SERVICE_KEY:'SYNTHETIC_ACCOUNT_SERVICE_KEY_ONLY_20261020',ACCOUNT_INTERNAL_READ_ENABLED:'true',ACCOUNT_FOUNDATION_ENABLED:'true',ACCOUNT_READ_ENABLED:'true',NEXUS_ENTRY_GATE_ENABLED:'true'};
 if(oauth)Object.assign(env,{OAUTH_ENABLED:'true',OAUTH_PROXY_ENABLED:'true',OAUTH_SERVICE_KEY:'SYNTHETIC_OAUTH_SERVICE_KEY_ONLY_20261020',YANDEX_CLIENT_ID:'synthetic-yandex-client',YANDEX_CLIENT_SECRET:'SYNTHETIC_YANDEX_SECRET',COOKIE_INGRESS_V3_ENABLED:'true'});
 const invitation='npi_'+'I'.repeat(43),sha=x=>createHash('sha256').update(x).digest('hex');
 const now=new Date().toISOString();db.prepare("INSERT OR IGNORE INTO account_subjects(id,display_name,status,created_at,updated_at) VALUES('synthetic-owner','Synthetic','active',?,?)").run(now,now);
 db.prepare("INSERT OR IGNORE INTO nexus_passkey_invites(token_hash,account_id,purpose,expires_at) VALUES(?,'synthetic-owner','bootstrap',?)").run(sha(invitation),new Date(Date.now()+600000).toISOString());
 const asset=path=>readFile(new URL(path,frontend));
 const fetchImpl=async(url,options)=>{
  const target=new URL(url);
  if(oauth&&url==='https://oauth.yandex.ru/token'){
   const input=new URLSearchParams(options.body);
   if(input.get('code')!=='synthetic-approved-code'||input.get('client_secret')!==env.YANDEX_CLIENT_SECRET||!/^[A-Za-z0-9_-]{43}$/.test(input.get('code_verifier')||''))throw Error('SYNTHETIC_EXCHANGE_REJECTED');
   return Response.json({access_token:'SYNTHETIC_PROVIDER_TOKEN',token_type:'bearer',expires_in:3600});
  }
  if(oauth&&url==='https://login.yandex.ru/info?format=json'){
   if(new Headers(options.headers).get('authorization')!=='OAuth SYNTHETIC_PROVIDER_TOKEN')throw Error('SYNTHETIC_PROFILE_REJECTED');
   return Response.json({id:'synthetic-yandex-owner',client_id:env.YANDEX_CLIENT_ID,login:'synthetic',default_email:'synthetic@yandex.ru',real_name:'Synthetic'});
  }
  if(url===ENTRY_SHELL_URL)return new Response(await asset('nexus-shell.html'),{headers:{'content-type':'text/html'}});
  if(target.origin!==WORKER_ORIGIN||!target.pathname.startsWith('/api/v2/')||!target.pathname.includes('/internal')&&!['/api/v2/content/feed','/api/v2/feedback/reviews'].includes(target.pathname))throw Error('EXTERNAL_NETWORK_FORBIDDEN');
  return worker.fetch(new Request(url,options),env,{});
 };
 const passkey=createPasskeyHandler({env,fetchImpl}),account=createAccountReadHandler({env,fetchImpl});
 const gate=createEntryGateHandler({env,fetchImpl,landingBody:await asset('index.html')});
 const oauthHandler=createOAuthHandler({env,fetchImpl});
 const controlHandler=createAccountControlHandler({env,fetchImpl});
 const feedbackHandler=createFeedbackHandler({env,fetchImpl}),contentHandler=createContentHandler({env,fetchImpl});
 let mismatch=false;const metrics=[];
 async function dispatch(url,{method='GET',headers={},body}={}){
  const path=new URL(url).pathname,h={...headers,host:new URL(GATEWAY_ORIGIN).host};
  const marker=path.includes('/passkey/')?'passkeyIngressContract':path.includes('/oauth/')?'oauthIngressContract':path.includes('/control/')||path.includes('/profile')?'accountControlContract':'accountReadContract';
  h['x-yc-apigateway-operation-context']=Buffer.from(JSON.stringify(oauth||env.COOKIE_INGRESS_V3_ENABLED==='true'?{[marker]:'v3'}:{[marker]:'v2',cookieHeader:mismatch&&marker==='accountReadContract'?'-':h.cookie||'-'})).toString('base64');
  const req=Readable.from(body?[Buffer.from(body)]:[]);Object.assign(req,{method,url:path+new URL(url).search,headers:h,rawHeaders:Object.entries(h).flat(),socket:{remoteAddress:'127.0.0.1'}});
  let result;const res={headersSent:false,writeHead(status,headers){this.headersSent=true;result={status,headers,body:Buffer.alloc(0)}},end(body){result.body=Buffer.from(body||'')}};
  const start=performance.now();if(path.startsWith('/api/v2/account/passkey/'))await passkey(req,res);else if(path.startsWith('/api/v2/account/oauth/')&&oauth)await oauthHandler(req,res);else if(path.startsWith('/api/v2/account/control')||path.startsWith('/api/v2/account/profile'))await controlHandler(req,res);else if(path.startsWith('/api/v2/feedback/'))await feedbackHandler(req,res);else if(path.startsWith('/api/v2/content/'))await contentHandler(req,res);else if(path==='/api/v2/account')await account(req,res);else if(['/','/index.html','/nexus-shell.html'].includes(path))await gate(req,res);else return null;
  metrics.push({stage:path.includes('/options')?'options':path.includes('/verify')?'verify':path==='/api/v2/account'?'session':'document',status:result.status,durationMs:Math.round(performance.now()-start)});return result;
 }
 function enableControl(){
  if(!control)throw Error('CONTROL_FIXTURE_NOT_REQUESTED');
  db.prepare("INSERT OR IGNORE INTO nexus_admin_grants(account_id,status,created_at) VALUES('synthetic-owner','active',?)").run(new Date().toISOString());
  db.exec('UPDATE nexus_alpha_settings SET enforced=1,max_testers=3 WHERE id=1');
  Object.assign(env,{COMMUNITY_ENABLED:'true',CONTENT_ENABLED:'true',CONTENT_PROXY_ENABLED:'true',FEEDBACK_ENABLED:'true',FEEDBACK_PROXY_ENABLED:'true',FEEDBACK_SERVICE_KEY:'SYNTHETIC_FEEDBACK_SERVICE_KEY_ONLY_20261020',ADMIN_CONTROL_ENABLED:'true',ACCOUNT_CONTROL_PROXY_ENABLED:'true',ALPHA_ADMISSION_ENABLED:'true',ADMIN_PURGE_ENABLED:'true',COOKIE_INGRESS_V3_ENABLED:'true',ADMIN_SERVICE_KEY:'SYNTHETIC_CONTROL_SERVICE_KEY_ONLY_20261020'});
 }
 return{db,env,fetchImpl,invitation,dispatch,metrics,enableControl,enablePublicRegistration(){if(!control)throw Error('CONTROL_REQUIRED');env.PUBLIC_PASSKEY_REGISTRATION_ENABLED='true'},beforeBatch(fn){beforeBatch=fn},setMismatch(value){mismatch=value},close(){db.close()}};
}
