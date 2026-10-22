import {Buffer} from 'node:buffer';
import {query,first,rows,deny,guard,atomic,sha} from './admin-service.mjs';
import {mediaDTO,uploadMedia} from './blog-media.mjs';
import {PART_CHARS,UPLOAD_TTL_MS,exact,uuid,digestId,validMeta,metaOf,partLength,jpegSizeMatches} from '../media-parts-contract.mjs';
const now=()=>new Date().toISOString();
const enabled=env=>{if(env.CONTENT_ENABLED!=='true'||env.CONTENT_MEDIA_ENABLED!=='true'||env.CONTENT_MEDIA_PARTS_ENABLED!=='true')deny('CONTENT_MEDIA_PARTS_UNAVAILABLE',503)};
// Проверяется внутри той же D1 transaction, что и изменение временных/media rows.
export const PARTS_AUTH_SQL="EXISTS(SELECT 1 FROM account_sessions s JOIN account_subjects a ON a.id=s.subject_id AND a.status='active' JOIN account_devices d ON d.id=s.device_id AND d.subject_id=a.id AND d.status='active' JOIN nexus_admin_grants g ON g.account_id=a.id AND g.status='active' JOIN session_login_methods slm ON slm.session_id=s.id AND slm.account_id=a.id JOIN login_methods lm ON lm.id=slm.login_method_id AND lm.account_id=a.id AND lm.status='active' AND lm.kind='passkey' JOIN nexus_passkey_credentials pk ON pk.login_method_id=lm.id AND pk.account_id=a.id WHERE s.id=?3 AND a.id=?4 AND s.secret_hash=?5 AND s.status='active' AND s.auth_strength='account-method-v1' AND s.revoked_at IS NULL AND s.created_at<=?6 AND s.created_at>?7 AND s.idle_expires_at>?6 AND s.absolute_expires_at>?6 AND s.created_at>strftime('%Y-%m-%dT%H:%M:%fZ','now','-5 minutes') AND s.idle_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now') AND s.absolute_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now') AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=a.id AND m.state IN('blocked','removed')))";
const authority=(env,v)=>guard(env.DB,v.payload.requestId,'before',PARTS_AUTH_SQL,[v.actor.session_id,v.actor.account_id,v.sessionHash,now(),new Date(Date.now()-300000).toISOString()]);
async function cleanup(env){
 // Не затрагивает сохранённые media, статьи, audit, аккаунты и пользовательские данные.
 await query(env.DB,'DELETE FROM nexus_content_media_uploads WHERE upload_id IN(SELECT upload_id FROM nexus_content_media_uploads WHERE expires_at<=?1 ORDER BY expires_at LIMIT 16)',now()).run();
}
const meta=r=>({id:r.media_id,mime:'image/jpeg',encodedLength:r.encoded_length,bytes:r.bytes,width:r.width,height:r.height,totalParts:r.total_parts});
const receipt=r=>({ok:true,uploadId:r.upload_id,meta:meta(r)});
function sameOwner(r,v){if(!r||r.account_id!==v.actor.account_id||r.session_id!==v.actor.session_id||r.expires_at<=now())deny('CONTENT_MEDIA_PARTS_CONFLICT',409)}
const pending=r=>{if(r.state!=='pending')deny('CONTENT_MEDIA_PARTS_CONFLICT',409)};
const liveCondition="EXISTS(SELECT 1 FROM nexus_content_media_uploads WHERE upload_id=?3 AND account_id=?4 AND session_id=?5 AND state='pending' AND expires_at>?6 AND expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now'))";
const liveGuard=(env,v,extra='',args=[])=>guard(env.DB,v.payload.requestId,'after',liveCondition+extra,[v.payload.uploadId,v.actor.account_id,v.actor.session_id,now(),...args]);
export async function mediaPartsOperation(env,v,{publishedOnly=false}={}){
 enabled(env);
 const p=v.payload;
 if(!p||!uuid(p.requestId)||v.method!=='POST')deny('INVALID_INPUT');
 if(p.phase==='read'){
  if(!exact(p,['requestId','phase','mediaId','index'])||!digestId(p.mediaId)||!Number.isInteger(p.index)||p.index<0||p.index>15)deny('INVALID_INPUT');
  // Никаких private/public capability из полей payload: режим задаёт только router.
  const {media}=await mediaDTO(env,p.mediaId,{publishedOnly}),m=metaOf(media);
  if(p.index>=m.totalParts)deny('INVALID_INPUT');
  const data=media.data.slice(p.index*PART_CHARS,(p.index+1)*PART_CHARS);
  return {part:{meta:m,index:p.index,data,sha256:await sha(data)}};
 }
 if(publishedOnly)deny('INVALID_INPUT');
 if(env.CONTENT_MEDIA_UPLOAD_ENABLED!=='true')deny('CONTENT_MEDIA_UNAVAILABLE',503);
 await cleanup(env);
 if(p.phase==='begin'){
  if(!exact(p,['requestId','phase','uploadId','originalRequestId','externalId','meta'])||!uuid(p.uploadId)||!uuid(p.originalRequestId)||!uuid(p.externalId)||!validMeta(p.meta))deny('INVALID_INPUT');
  let r=await first(env.DB,'SELECT * FROM nexus_content_media_uploads WHERE upload_id=?1',p.uploadId);
  if(r){sameOwner(r,v);if(r.request_id!==p.originalRequestId||r.external_id!==p.externalId||JSON.stringify(meta(r))!==JSON.stringify(p.meta))deny('CONTENT_MEDIA_PARTS_CONFLICT',409);pending(r);return receipt(r)}
  const m=p.meta,stamp=now(),expires=new Date(Date.now()+UPLOAD_TTL_MS).toISOString();
  const capacity="NOT EXISTS(SELECT 1 FROM nexus_content_media_uploads WHERE account_id=?3 AND state='pending' AND expires_at>?4) AND (SELECT COUNT(*) FROM nexus_content_media_uploads WHERE expires_at>?4)<16 AND (EXISTS(SELECT 1 FROM nexus_content_media WHERE id=?5) OR ((SELECT COUNT(*) FROM nexus_content_media)+(SELECT COUNT(*) FROM nexus_content_media_uploads WHERE state='pending' AND expires_at>?4)<1000 AND (SELECT COALESCE(SUM(bytes),0) FROM nexus_content_media)+(SELECT COALESCE(SUM(bytes),0) FROM nexus_content_media_uploads WHERE state='pending' AND expires_at>?4)+?6<=67108864))";
  await atomic(env,[authority(env,v),guard(env.DB,p.requestId,'after',capacity,[v.actor.account_id,stamp,m.id,m.bytes]),
   query(env.DB,"INSERT INTO nexus_content_media_uploads(upload_id,account_id,session_id,request_id,external_id,media_id,encoded_length,bytes,width,height,total_parts,state,created_at,expires_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,'pending',?12,?13)",p.uploadId,v.actor.account_id,v.actor.session_id,p.originalRequestId,p.externalId,m.id,m.encodedLength,m.bytes,m.width,m.height,m.totalParts,stamp,expires)]);
  r=await first(env.DB,'SELECT * FROM nexus_content_media_uploads WHERE upload_id=?1',p.uploadId);return receipt(r);
 }
 if(!uuid(p.uploadId))deny('INVALID_INPUT');
 const r=await first(env.DB,'SELECT * FROM nexus_content_media_uploads WHERE upload_id=?1',p.uploadId);sameOwner(r,v);
 if(p.phase==='abort'){
  if(!exact(p,['requestId','phase','uploadId']))deny('INVALID_INPUT');
  pending(r);
  await atomic(env,[authority(env,v),liveGuard(env,v),query(env.DB,"UPDATE nexus_content_media_uploads SET state='aborted' WHERE upload_id=?1",p.uploadId),query(env.DB,'DELETE FROM nexus_content_media_parts WHERE upload_id=?1',p.uploadId)]);
  return {ok:true,uploadId:p.uploadId};
 }
 if(p.phase==='part'){
  pending(r);
  if(!exact(p,['requestId','phase','uploadId','index','data','sha256'])||!Number.isInteger(p.index)||p.index<0||p.index>=r.total_parts||typeof p.data!=='string'||p.data.length!==partLength(r.encoded_length,p.index)||!/^[A-Za-z0-9+/]+={0,2}$/.test(p.data)||p.index<r.total_parts-1&&p.data.includes('=')||Buffer.from(p.data,'base64').toString('base64')!==p.data||!digestId(p.sha256)||await sha(p.data)!==p.sha256)deny('INVALID_INPUT');
  await atomic(env,[authority(env,v),liveGuard(env,v," AND NOT EXISTS(SELECT 1 FROM nexus_content_media_parts WHERE upload_id=?3 AND part_index=?7 AND (data<>?8 OR part_sha256<>?9))",[p.index,p.data,p.sha256]),
   query(env.DB,'INSERT OR IGNORE INTO nexus_content_media_parts(upload_id,part_index,data,part_sha256) VALUES(?1,?2,?3,?4)',p.uploadId,p.index,p.data,p.sha256)]);
  return {ok:true,uploadId:p.uploadId,index:p.index,sha256:p.sha256};
 }
 if(p.phase==='commit'){
  if(!exact(p,['requestId','phase','uploadId','sha256'])||p.sha256!==r.media_id)deny('INVALID_INPUT');
  if(r.state==='committed')return {ok:true,media:{id:r.media_id,mime:'image/jpeg',width:r.width,height:r.height}};
  pending(r);
  const parts=await rows(query(env.DB,'SELECT part_index,data,part_sha256 FROM nexus_content_media_parts WHERE upload_id=?1 ORDER BY part_index',p.uploadId));
  if(parts.length!==r.total_parts)deny('CONTENT_MEDIA_PARTS_INCOMPLETE',409);
  for(let i=0;i<parts.length;i++)if(parts[i].part_index!==i||parts[i].data.length!==partLength(r.encoded_length,i)||await sha(parts[i].data)!==parts[i].part_sha256)deny('CONTENT_MEDIA_PARTS_CONFLICT',409);
  const data=parts.map(x=>x.data).join(''),bytes=Buffer.from(data,'base64');
  if(data.length!==r.encoded_length||bytes.length!==r.bytes||bytes.toString('base64')!==data||!jpegSizeMatches(bytes,r.width,r.height)||Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex')!==r.media_id)deny('CONTENT_MEDIA_PARTS_CONFLICT',409);
  const original={...v,payload:{requestId:r.request_id,target:'media',id:r.external_id,slug:'',version:0,action:'upload',content:{id:r.media_id,mime:'image/jpeg',data,width:r.width,height:r.height}}};
  // Старый uploadMedia остаётся единственным писателем media/audit. JPEG повторно не кодируется.
  return uploadMedia(env,original,{reservationId:p.uploadId,before:[authority(env,v),liveGuard(env,v)],after:[
   query(env.DB,"UPDATE nexus_content_media_uploads SET state='committed' WHERE upload_id=?1",p.uploadId),
   query(env.DB,'DELETE FROM nexus_content_media_parts WHERE upload_id=?1',p.uploadId)]});
 }
 deny('INVALID_INPUT');
}
