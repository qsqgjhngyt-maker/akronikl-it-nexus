// Operator-only staging creator. No production IDs, data copies or deployments.
// Secrets stay in the explicitly supplied private state directory, never stdout.
import {readFile,writeFile,mkdir,readdir,chmod} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {randomBytes,createHash,createHmac} from 'node:crypto';
import {validateStage,stageName,stagingRPC} from './contract.mjs';
export {validateStage,stageName,stagingRPC} from './contract.mjs';
const root=new URL('../',import.meta.url),account='59d8152fe41bf5e4bc8cdade5ade6e30';
const sha=x=>createHash('sha256').update(x).digest('hex');
const random=()=>randomBytes(32).toString('base64url');
async function apiAuth(){
 const path=process.env.NEXUS_STAGING_CF_AUTH_FILE||process.env.USERPROFILE+'/.wrangler/config/default.toml';
 const token=/^oauth_token\s*=\s*"([^"]+)"/m.exec(await readFile(path,'utf8'))?.[1];if(!token)throw Error('CF_LOGIN_REQUIRED');return token;
}
async function client(){
 const token=await apiAuth();
 return async(method,path,data)=>{
  const r=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+path,{method,
   headers:{authorization:'Bearer '+token,...(data instanceof FormData?{}:{'content-type':'application/json'})},
   ...(data?{body:data instanceof FormData?data:JSON.stringify(data)}:{}),signal:AbortSignal.timeout(45000)});
  const value=await r.json();if(!r.ok||!value.success)throw Error('CF_REQUEST_FAILED_'+r.status+'_'+(value.errors?.[0]?.code||'UNKNOWN'));
  return value.result;
 };
}
export async function createStage(directory,email){
 if(!/^[a-z0-9.!#$%&'*+/=?^_~{|}-]+@[a-z0-9.-]+\.[a-z]{2,63}$/.test(email||''))throw Error('TEST_EMAIL_REQUIRED');
 directory=resolve(directory);await mkdir(directory,{recursive:true});
 const file=join(directory,'staging.private.json');
 try{await readFile(file);throw Error('STAGING_STATE_EXISTS')}catch(e){if(e.code!=='ENOENT')throw e}
 const api=await client(),name='nexus-password-staging-'+randomBytes(6).toString('hex');
 const subdomain=(await api('GET','/workers/subdomain')).subdomain;
 const state={schema:1,purpose:'invited-password-isolated-staging',name,subdomain,workerOrigin:`https://${name}.${subdomain}.workers.dev`,
  testEmail:email,mailMode:'capture',passwordKey:random(),accountKey:random(),adminKey:random(),createdAt:new Date().toISOString(),status:'creating'};
 const save=async()=>{await writeFile(file,JSON.stringify(state,null,2)+'\n',{mode:0o600});await chmod(file,0o600)};
 await save();
 const db=await api('POST','/d1/database',{name});state.databaseId=db.uuid;await save();validateStage(state);
 const query=async(sql,params=[])=>{
  validateStage(state);
  const result=await api('POST','/d1/database/'+state.databaseId+'/query',{sql,params});
  if(result.some(r=>r.success===false))throw Error('STAGING_SQL_FAILED');return result;
 };
 const files=['0001_sync_team_foundation','0002_nexus_account_tokens','0003_d1_only_project_snapshots','0004_identity_v2_session_foundation'].map(n=>'../../cloudflare/nexus-sync-worker/migrations/'+n+'.sql');
 const migrations=(await readdir(new URL('migrations/',root))).filter(n=>n.endsWith('.sql')).sort();
 state.migrations=[];
 for(const relative of [...files,...migrations.map(n=>'migrations/'+n)]){
  // foundation paths are relative to server-access/staging, others to server-access.
  const url=relative.startsWith('../')?new URL(relative,import.meta.url):new URL(relative,root),sql=await readFile(url,'utf8');
  await query(sql);state.migrations.push({file:relative,sha256:sha(sql)});await save();
 }
 // Synthetic fixture operator only. This is not an enrollment bypass in application
 // code: seed is confined to the newly-created staging DB and never copied to prod.
 const {controlFixture}=await import('../../tests/helpers/control-fixture.mjs');
 const f=await controlFixture();
 try{
  for(const table of ['account_subjects','login_methods','nexus_passkey_users','nexus_passkey_credentials','account_devices','account_sessions','session_login_methods','nexus_admin_grants'])
   for(const row of f.db.prepare('SELECT * FROM '+table).all()){
    const keys=Object.keys(row);await query('INSERT INTO '+table+'('+keys.join(',')+') VALUES('+keys.map(()=>'?').join(',')+')',Object.values(row));
   }
  await query('UPDATE nexus_alpha_settings SET enforced=1 WHERE id=1');
  state.fixtureOwner={accountId:f.owner.id,sessionHash:sha(f.owner.secret)};
 }finally{f.close()}
 const code=await readFile(new URL('worker-bundle/entry.mjs',root),'utf8');state.workerSHA256=sha(code);
 const wrapper="import app from './entry.mjs'; const allowed=new Set(['/api/v2/account/internal/read','/api/v2/account/internal/control','/api/v2/account/internal/invited-password']); export default {fetch(r,e,c){return allowed.has(new URL(r.url).pathname)?app.fetch(r,e,c):new Response('Not found',{status:404})}};";
 const flags={ALPHA_ADMISSION_ENABLED:'true',INVITED_PASSWORD_ENABLED:'true',ADMIN_CONTROL_ENABLED:'true',ACCOUNT_FOUNDATION_ENABLED:'true',ACCOUNT_INTERNAL_READ_ENABLED:'true'};
 const form=new FormData();
 form.set('metadata',JSON.stringify({main_module:'stage.mjs',compatibility_date:'2026-09-23',compatibility_flags:['nodejs_compat'],observability:{enabled:false},bindings:[
  {type:'d1',name:'DB',id:state.databaseId},...Object.entries(flags).map(([name,text])=>({type:'plain_text',name,text})),
  ...Object.entries({INVITED_PASSWORD_SERVICE_KEY:state.passwordKey,ACCOUNT_SERVICE_KEY:state.accountKey,ADMIN_SERVICE_KEY:state.adminKey}).map(([name,text])=>({type:'secret_text',name,text}))
 ]}));
 form.set('stage.mjs',new Blob([wrapper],{type:'application/javascript+module'}),'stage.mjs');
 form.set('entry.mjs',new Blob([code],{type:'application/javascript+module'}),'entry.mjs');
 await api('PUT','/workers/scripts/'+name,form);
 await api('POST','/workers/scripts/'+name+'/subdomain',{enabled:true,previews_enabled:false});
 state.status='ready-mail-capture';await save();
 const integrity=await query('PRAGMA foreign_key_check');if(integrity.some(r=>r.results?.length))throw Error('STAGING_FOREIGN_KEYS_FAILED');
 // Check public bypass and unsigned internal calls without displaying any payload.
 for(const [path,expected] of [['/api/v2/account',404],['/api/v2/account/internal/invited-password',401]]){
  const r=await fetch(state.workerOrigin+path,{method:'POST',headers:{'content-type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)});
  if(r.status!==expected)throw Error('STAGING_ACCESS_PROBE_FAILED_'+r.status);
 }
 const response=await stagingRPC(state,'/api/v2/account/internal/control',state.adminKey,{path:'/api/v2/account/control/invites',method:'POST',
  payload:{requestId:crypto.randomUUID(),ttlMinutes:60,trialMinutes:60,email},sessionHash:state.fixtureOwner.sessionHash,expectedAccountId:state.fixtureOwner.accountId,dtoVersion:2});
 if(!response.ok)throw Error('STAGING_FIXTURE_INVITATION_FAILED');
 state.invitation=await response.json();await save();
 return {status:state.status,workerOrigin:state.workerOrigin,databaseName:name,databaseId:state.databaseId,migrations:state.migrations.length,productionWrites:0};
}
export async function migrateStage(directory){
 const file=join(resolve(directory),'staging.private.json'),state=validateStage(JSON.parse(await readFile(file,'utf8'))),api=await client();
 const actual=await api('GET','/d1/database/'+state.databaseId);if(actual.name!==state.name)throw Error('STAGING_DATABASE_NAME_MISMATCH');
 const files=(await readdir(new URL('migrations/',root))).filter(n=>n.endsWith('.sql')).sort();
 let applied=0;
 for(const name of files){
  const relative='migrations/'+name;if(state.migrations.some(m=>m.file===relative))continue;
  const sql=await readFile(new URL(relative,root),'utf8');
  const result=await api('POST','/d1/database/'+state.databaseId+'/query',{sql,params:[]});if(result.some(r=>r.success===false))throw Error('STAGING_SQL_FAILED');
  state.migrations.push({file:relative,sha256:sha(sql)});await writeFile(file,JSON.stringify(state,null,2)+'\n',{mode:0o600});applied++;
 }
 return {status:'STAGING_MIGRATIONS_CURRENT',applied,databaseName:state.name,total:state.migrations.length,productionWrites:0};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  if(process.argv[2]==='create')console.log(JSON.stringify(await createStage(process.argv[3],process.argv[4])));
  else if(process.argv[2]==='migrate')console.log(JSON.stringify(await migrateStage(process.argv[3])));
  else throw Error('CREATE_ACTION_REQUIRED');
 }catch(e){console.error(/^[A-Z0-9_]+$/.test(e.message)?e.message:'STAGING_PREPARATION_FAILED');process.exitCode=1}
}
