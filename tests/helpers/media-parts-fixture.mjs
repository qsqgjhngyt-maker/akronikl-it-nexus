import {readFile} from 'node:fs/promises';
import {createHash,createHmac,randomBytes,randomUUID} from 'node:crypto';
import {controlFixture} from './control-fixture.mjs';
import {sanitizeBlogImage} from '../../server-access/blog-image-codec.mjs';
import {handleAdminService} from '../../server-access/worker/admin-service.mjs';
import {MEDIA_PARTS_PATH,PUBLIC_MEDIA_PARTS_PATH,metaOf,PART_CHARS} from '../../server-access/media-parts-contract.mjs';
export const sha=v=>createHash('sha256').update(v).digest('hex');
export async function mediaPartsFixture(){
 const f=await controlFixture();f.db.exec(await readFile(new URL('../../server-access/migrations/0016_blog_media_parts.sql',import.meta.url),'utf8'));
 Object.assign(f.env,{CONTENT_ENABLED:'true',CONTENT_MEDIA_ENABLED:'true',CONTENT_MEDIA_UPLOAD_ENABLED:'true',CONTENT_MEDIA_PARTS_ENABLED:'true'});
 const media=sanitizeBlogImage((await readFile(new URL('../fixtures/synthetic-media-1280.jpg',import.meta.url))).toString('base64'));
 const external=()=>({requestId:randomUUID(),target:'media',id:randomUUID(),slug:'',version:0,action:'upload',content:media});
 function signed(envelope,{nonce=randomBytes(16).toString('hex'),timestamp=String(Date.now()),signature}={}){
  const body=typeof envelope==='string'?envelope:JSON.stringify(envelope);
  const sig=signature??createHmac('sha256',f.env.ADMIN_SERVICE_KEY).update(['v1','POST','/api/v2/account/internal/control',timestamp,nonce,sha(body)].join('\n')).digest('hex');
  return new Request('https://synthetic.invalid/api/v2/account/internal/control',{method:'POST',body,headers:{'content-type':'application/json','x-nexus-service-timestamp':timestamp,'x-nexus-service-nonce':nonce,'x-nexus-service-signature':sig}});
 }
 const envelope=(payload,{actor=f.owner,publicRead=false,expected=actor?.id}={})=>({path:publicRead?PUBLIC_MEDIA_PARTS_PATH:MEDIA_PARTS_PATH,method:'POST',payload,sessionHash:publicRead?null:sha(actor.secret),expectedAccountId:publicRead?null:expected});
 async function call(payload,options={}){
  const response=await handleAdminService(signed(envelope(payload,options)),options.env||f.env);
  return {status:response.status,body:await response.json(),headers:response.headers};
 }
 const begin=(p=external(),uploadId=randomUUID())=>({requestId:randomUUID(),phase:'begin',uploadId,originalRequestId:p.requestId,externalId:p.id,meta:metaOf(p.content)});
 const part=(b,i,m=media)=>{const data=m.data.slice(i*PART_CHARS,(i+1)*PART_CHARS);return {requestId:randomUUID(),phase:'part',uploadId:b.uploadId,index:i,data,sha256:sha(data)}};
 const commit=b=>({requestId:randomUUID(),phase:'commit',uploadId:b.uploadId,sha256:b.meta.id});
 const abort=b=>({requestId:randomUUID(),phase:'abort',uploadId:b.uploadId});
 const read=(index=0,id=media.id)=>({requestId:randomUUID(),phase:'read',mediaId:id,index});
 async function filled({p=external(),actor=f.owner,order}={}){
  const b=begin(p);let r=await call(b,{actor});if(r.status!==200)throw Error('FIXTURE_BEGIN_'+r.status);
  for(const i of order||Array.from({length:b.meta.totalParts},(_,i)=>i)){r=await call(part(b,i,p.content),{actor});if(r.status!==200)throw Error('FIXTURE_PART_'+r.status)}
  return b;
 }
 const counts=()=>({media:f.db.prepare('SELECT COUNT(*) n FROM nexus_content_media').get().n,audit:f.db.prepare('SELECT COUNT(*) n FROM nexus_content_media_audit').get().n,parts:f.db.prepare('SELECT COUNT(*) n FROM nexus_content_media_parts').get().n});
 // Отдельная синтетическая база: очистка тестовых rate counters не относится к production.
 const resetRate=()=>f.db.exec('DELETE FROM nexus_admin_rate_limits');
 const seed=(id,options={})=>{const actor=f.seed(id,{...options,admin:false});if(options.admin)f.db.prepare("INSERT INTO nexus_admin_grants(account_id,status,created_at) VALUES(?,'active',?)").run(id,new Date().toISOString());return actor};
 return {...f,seed,media,external,signedParts:signed,envelope,callParts:call,begin,part,commit,abort,read,filled,counts,resetRate};
}
