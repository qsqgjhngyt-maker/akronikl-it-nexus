import {default as workerModule} from '../cloudflare/nexus-sync-worker/src/index.js';
const assert=(v,m)=>{if(!v)throw new Error(m)};
const state={subjects:new Map(),tokens:new Map()};
class Stmt{
  constructor(sql){this.sql=sql;this.norm=sql.replace(/\s+/g,' ').trim();this.args=[]}bind(...args){this.args=args;return this}
  async first(){
    if(this.norm.includes('COUNT(*) AS n FROM account_subjects'))return{n:state.subjects.size};
    if(this.norm.includes('FROM account_tokens t JOIN account_subjects s')){
      const hash=this.args[0];const token=[...state.tokens.values()].find(x=>x.token_hash===hash&&x.status==='active');if(!token)return null;const subject=state.subjects.get(token.subject_id);if(!subject||subject.status!=='active')return null;return{subject_id:subject.id,display_name:subject.display_name,token_id:token.id};
    }
    return null;
  }
  async run(){
    if(this.norm.startsWith('INSERT INTO account_subjects')){const[id,display,status,created,updated]=this.args;state.subjects.set(id,{id,display_name:display,status,created_at:created,updated_at:updated});return{success:true}}
    if(this.norm.startsWith('INSERT INTO account_tokens')){const[id,subject_id,token_hash,label,status,created_at]=this.args;state.tokens.set(id,{id,subject_id,token_hash,label,status,created_at});return{success:true}}
    if(this.norm.startsWith('UPDATE account_tokens SET last_used_at'))return{success:true};
    return{success:true};
  }
}
const DB={prepare:sql=>new Stmt(sql),batch:async stmts=>{for(const stmt of stmts)await stmt.run();return stmts.map(()=>({success:true}))}};
const env={DB,AUTH_MODE:'nexus-token',ENVIRONMENT:'production',BOOTSTRAP_SECRET:'a-very-long-bootstrap-secret-123456789',ALLOWED_ORIGIN:'https://example.github.io'};
let res=await workerModule.fetch(new Request('https://sync.example/api/v1/health'),env),body=await res.json();
assert(res.status===200&&body.bootstrapOpen===true,'bootstrap must be open before first account');
res=await workerModule.fetch(new Request('https://sync.example/api/v1/bootstrap',{method:'POST',headers:{'content-type':'application/json','x-nexus-bootstrap-secret':env.BOOTSTRAP_SECRET},body:JSON.stringify({displayName:'Akronikl'})}),env);body=await res.json();
assert(res.status===201&&body.token?.startsWith('nxk_')&&body.subject?.id?.startsWith('user-'),'first owner bootstrap failed');const token=body.token;
res=await workerModule.fetch(new Request('https://sync.example/api/v1/bootstrap',{method:'POST',headers:{'content-type':'application/json','x-nexus-bootstrap-secret':env.BOOTSTRAP_SECRET},body:'{}'}),env);body=await res.json();
assert(res.status===409&&body.error?.code==='BOOTSTRAP_CLOSED','bootstrap must close after first account');
res=await workerModule.fetch(new Request('https://sync.example/api/v1/me',{headers:{authorization:`Bearer ${token}`}}),env);body=await res.json();
assert(res.status===200&&body.subject?.displayName==='Akronikl'&&body.authMode==='nexus-token','Nexus token /me auth failed');
res=await workerModule.fetch(new Request('https://sync.example/api/v1/me',{headers:{authorization:'Bearer nxk_invalid_invalid_invalid_invalid'}}),env);body=await res.json();
assert(res.status===401&&body.error?.code==='INVALID_TOKEN','invalid token must be rejected');
console.log('CLOUDFLARE_NEXUS_TOKEN_AUTH_PASS');
