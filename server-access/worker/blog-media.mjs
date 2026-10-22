import {Buffer} from 'node:buffer';
import {query,first,deny,exact,validRequestId,guard,atomic} from './admin-service.mjs';
import {decodeBlogLayout,blogMediaIds} from '../../core/blog-layout.js';
export const validMediaId=id=>typeof id==='string'&&/^[a-f0-9]{64}$/.test(id);
export async function mediaDTO(env,id,{publishedOnly=false}={}){
 if(env.CONTENT_MEDIA_ENABLED!=='true')deny('CONTENT_MEDIA_UNAVAILABLE',503);
 if(!validMediaId(id))deny('INVALID_INPUT');
 if(publishedOnly){
  // Выдача проверяет опубликованную версию, а не черновик и не факт загрузки файла.
  const posts=(await query(env.DB,"SELECT published_json FROM nexus_content_posts WHERE state='published' AND published_json IS NOT NULL LIMIT 100").all()).results||[];
  let permitted=false;for(const p of posts){const article=JSON.parse(p.published_json);const layout=decodeBlogLayout(article.body);if(layout&&blogMediaIds(layout).includes(id)){permitted=true;break}}
  if(!permitted)deny('NOT_FOUND',404);
 }
 const row=await first(env.DB,'SELECT id,jpeg_base64,width,height FROM nexus_content_media WHERE id=?1',id);if(!row)deny('NOT_FOUND',404);
 const bytes=Buffer.from(row.jpeg_base64,'base64');if(bytes.length>98304||bytes.toString('base64')!==row.jpeg_base64||Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex')!==id)deny('CONTENT_MEDIA_UNAVAILABLE',503);
 return {media:{id:row.id,mime:'image/jpeg',data:row.jpeg_base64,width:row.width,height:row.height}};
}
export async function uploadMedia(env,value){
 if(env.CONTENT_MEDIA_ENABLED!=='true'||env.CONTENT_MEDIA_UPLOAD_ENABLED!=='true')deny('CONTENT_MEDIA_UNAVAILABLE',503);
 const p=value.payload,m=p.content;
 if(!exact(p,['requestId','target','id','slug','version','action','content'])||!validRequestId(p.requestId)||p.target!=='media'||p.action!=='upload'||p.slug!==''||p.version!==0||!/^[a-f0-9-]{36}$/.test(p.id)||!exact(m,['id','mime','data','width','height'])||!validMediaId(m.id)||m.mime!=='image/jpeg'||typeof m.data!=='string'||m.data.length>131072||!/^[A-Za-z0-9+/]+={0,2}$/.test(m.data)||![m.width,m.height].every(n=>Number.isInteger(n)&&n>=1&&n<=1600))deny('INVALID_INPUT');
 const bytes=Buffer.from(m.data,'base64');if(bytes.toString('base64')!==m.data||!bytes.length||bytes.length>98304||bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217||Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex')!==m.id)deny('INVALID_INPUT');
 const stamp=new Date().toISOString();
 const existing=await first(env.DB,'SELECT id FROM nexus_content_media WHERE id=?1',m.id),usage=await first(env.DB,'SELECT COUNT(*) count,COALESCE(SUM(bytes),0) bytes FROM nexus_content_media');
 if(!existing&&(usage.count>=1000||usage.bytes+bytes.length>67108864))deny('CONTENT_MEDIA_QUOTA',409);
 const commands=[guard(env.DB,p.requestId,'before','EXISTS(SELECT 1 FROM nexus_content_media WHERE id=?3) OR ((SELECT COUNT(*) FROM nexus_content_media)<1000 AND (SELECT COALESCE(SUM(bytes),0) FROM nexus_content_media)+?4<=67108864)',[m.id,bytes.length]),
 query(env.DB,'INSERT OR IGNORE INTO nexus_content_media(id,jpeg_base64,width,height,bytes,created_by,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7)',m.id,m.data,m.width,m.height,bytes.length,value.actor.account_id,stamp),
 query(env.DB,'INSERT INTO nexus_content_media_audit(id,actor_id,session_id,target_id,action,created_at) VALUES(?1,?2,?3,?4,?5,?6)',p.requestId,value.actor.account_id,value.actor.session_id,m.id,'upload',stamp)];
 await atomic(env,commands);return {ok:true,media:{id:m.id,mime:m.mime,width:m.width,height:m.height}};
}
