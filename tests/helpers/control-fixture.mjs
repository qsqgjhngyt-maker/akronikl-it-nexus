import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {createHash,createHmac,randomBytes,randomUUID} from 'node:crypto';
import {handleAdminService} from '../../server-access/worker/admin-service.mjs';
export const sha=value=>createHash('sha256').update(value).digest('hex');
export async function controlFixture(){
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
 const files=['0001_sync_team_foundation','0002_nexus_account_tokens','0003_d1_only_project_snapshots','0004_identity_v2_session_foundation'].map(x=>'cloudflare/nexus-sync-worker/migrations/'+x+'.sql');
 files.push(...['0005_login_methods_registry','0006_account_lifecycle_hardening','0007_identity_owner_and_issuance_guards','0008_account_service_nonces','0009_passkeys','0010_feedback','0011_oauth_service','0012_alpha_administration','0013_account_avatars','0014_community_content','0015_blog_media'].map(x=>'server-access/migrations/'+x+'.sql'));
 for(const file of files)db.exec(await readFile(new URL('../../'+file,import.meta.url),'utf8'));
 const statement=(sql,args=[])=>{
  const s=db.prepare(sql);
  return {
   bind:(...values)=>statement(sql,values),
   async first(){return s.get(...args)||null},
   async all(){return {success:true,results:s.all(...args)}},
   async run(){return this.execute()},
   execute(){
    if(/\bRETURNING\b/i.test(sql)){const results=s.all(...args);return {success:true,results,meta:{changes:results.length}}}
    return {success:true,results:[],meta:{changes:Number(s.run(...args).changes)}};
   }
  };
 };
 let hook=null;
 const DB={prepare:sql=>statement(sql),async batch(commands){if(hook){const run=hook;hook=null;run()}db.exec('BEGIN');try{const out=commands.map(c=>c.execute());db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}};
 const env={DB,ADMIN_CONTROL_ENABLED:'true',ALPHA_ADMISSION_ENABLED:'true',ADMIN_PURGE_ENABLED:'true',ADMIN_SERVICE_KEY:'SYNTHETIC_ACCOUNT_CONTROL_SERVICE_KEY_ONLY',OAUTH_ENABLED:'true',OAUTH_SERVICE_KEY:'SYNTHETIC_OAUTH_SERVICE_KEY_ONLY_20261020'};
 const stamp=()=>new Date().toISOString();
 function seed(id,{admin=false,kind='passkey',username,state='active'}={}){
  const created=stamp(),future=new Date(Date.now()+3600000).toISOString(),secret='nxs_'+randomBytes(32).toString('base64url'),method=id+'-method',session=id+'-session';
  db.prepare("INSERT INTO account_subjects(id,display_name,status,created_at,updated_at) VALUES(?,?,'active',?,?)").run(id,'Synthetic '+id,created,created);
  if(!admin)db.prepare('INSERT INTO nexus_alpha_members(account_id,state,created_at,updated_at) VALUES(?,?,?,?)').run(id,state,created,created);
  db.prepare("INSERT INTO login_methods(id,account_id,kind,status,created_at) VALUES(?,?,?,'active',?)").run(method,id,kind,created);
  if(kind==='passkey'){
   db.prepare('INSERT INTO nexus_passkey_users(account_id,user_id) VALUES(?,?)').run(id,randomBytes(32).toString('base64url'));
   db.prepare("INSERT INTO nexus_passkey_credentials(id,account_id,login_method_id,public_key,counter,device_type,backed_up,transports_json,last_commit_id,created_at) VALUES(?,?,?,'SYNTHETIC_PUBLIC_KEY',0,'multiDevice',1,'[]','synthetic',?)").run(id+'-credential',id,method,created);
  }
  if(username)db.prepare('INSERT INTO nexus_account_profiles(account_id,username,created_at) VALUES(?,?,?)').run(id,username,created);
  db.prepare("INSERT INTO account_devices(id,subject_id,status,first_seen_at,last_seen_at) VALUES(?,?,'active',?,?)").run(id+'-device',id,created,created);
  db.prepare("INSERT INTO account_sessions(id,subject_id,device_id,secret_hash,status,auth_strength,created_at,last_seen_at,idle_expires_at,absolute_expires_at) VALUES(?,?,?,?,'active','account-method-v1',?,?,?,?)").run(session,id,id+'-device',sha(secret),created,created,future,future);
  db.prepare('INSERT INTO session_login_methods(session_id,login_method_id,account_id,created_at) VALUES(?,?,?,?)').run(session,method,id,created);
  if(admin)db.prepare("INSERT INTO nexus_admin_grants(account_id,status,created_at) VALUES(?,'active',?)").run(id,created);
  return {id,secret,session,method};
 }
 const owner=seed('synthetic-owner',{admin:true});
 db.exec('UPDATE nexus_alpha_settings SET enforced=1 WHERE id=1');
 function signed(path,{actor=owner,method='GET',payload=null,nonce=randomBytes(16).toString('hex'),timestamp=String(Date.now()),headers={}}={}){
  const body=JSON.stringify({path,method,payload,sessionHash:sha(actor.secret),expectedAccountId:actor.id});
  const signature=createHmac('sha256',env.ADMIN_SERVICE_KEY).update(['v1','POST','/api/v2/account/internal/control',timestamp,nonce,sha(body)].join('\n')).digest('hex');
  return new Request('https://synthetic-worker.invalid/api/v2/account/internal/control',{method:'POST',body,headers:{'content-type':'application/json','x-nexus-service-timestamp':timestamp,'x-nexus-service-nonce':nonce,'x-nexus-service-signature':signature,...headers}});
 }
 async function call(path,options={},override=env){
  const response=await handleAdminService(signed(path,options),override);
  return {status:response.status,body:await response.json(),headers:response.headers};
 }
 return {db,env,owner,seed,signed,call,stamp,beforeBatch(fn){hook=fn},requestId:randomUUID,close(){db.close()}};
}
