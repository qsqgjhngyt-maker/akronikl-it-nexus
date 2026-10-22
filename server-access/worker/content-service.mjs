import {decodeBlogLayout,blogMediaIds} from '../../core/blog-layout.js';
import {uploadMedia,mediaDTO,validMediaId} from './blog-media.mjs';
import {HOME_SLOTS} from '../../core/content-contract.js';
import {query,first,rows,deny,exact,validRequestId,guard,atomic} from './admin-service.mjs';
const text=(v,max,min=0)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);
const postDto=r=>({id:r.id,slug:r.slug,draft:JSON.parse(r.draft_json),published:r.published_json?JSON.parse(r.published_json):null,state:r.state,version:r.version,publishedAt:r.published_at});
export async function contentOperation(env,value){
 if(env.CONTENT_ENABLED!=='true')deny('CONTENT_UNAVAILABLE',503);
 const {DB:db}=env,{payload:p,actor,method}=value;
 const operationURL=new URL(value.path||'/api/v2/account/control/content','https://synthetic.invalid');
 if(method==='GET'&&operationURL.search==='?mediaStatus=1'){const exists=env.CONTENT_MEDIA_ENABLED==='true'&&!!await first(db,"SELECT name FROM sqlite_master WHERE type='table' AND name='nexus_content_media'");return {mediaAvailability:{enabled:!!exists&&env.CONTENT_MEDIA_UPLOAD_ENABLED==='true',maxBytes:98304,maxDimension:1600}}}
 if(operationURL.search){if(method!=='GET'||[...operationURL.searchParams.keys()].join(',')!=='media'||operationURL.searchParams.getAll('media').length!==1)deny('INVALID_INPUT');if(env.CONTENT_MEDIA_PARTS_ENABLED==='true')deny('CONTENT_MEDIA_PARTS_REQUIRED',503);return mediaDTO(env,operationURL.searchParams.get('media'))}
 if(method==='POST'&&p?.target==='media'){if(env.CONTENT_MEDIA_PARTS_ENABLED==='true')deny('CONTENT_MEDIA_PARTS_REQUIRED',503);return uploadMedia(env,value)}
 if(method==='GET'){
  const home=await first(db,'SELECT * FROM nexus_content_home WHERE id=1');
  return {posts:(await rows(query(db,'SELECT * FROM nexus_content_posts ORDER BY updated_at DESC LIMIT 100'))).map(postDto),home:{draft:JSON.parse(home.draft_json),published:JSON.parse(home.published_json),version:home.version}};
 }
 if(!exact(p,['requestId','target','id','slug','version','action','content'])||!validRequestId(p.requestId)||!['home','post'].includes(p.target)||!['save','publish','unpublish','delete'].includes(p.action)||!Number.isInteger(p.version)||p.version<0)deny('INVALID_INPUT');
 const home=p.target==='home',id=home?'home':p.id,stamp=new Date().toISOString();
 if(!home&&(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id)||typeof p.slug!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)||p.slug.length>80))deny('INVALID_INPUT');
 if(home){
  if(p.id!=='home'||p.slug!==''||p.action==='delete'||p.action==='unpublish'||!p.content||typeof p.content!=='object'||Array.isArray(p.content)||Object.entries(p.content).some(([k,v])=>!Object.hasOwn(HOME_SLOTS,k)||!text(v,HOME_SLOTS[k].max,1)))deny('INVALID_INPUT');
 }else if(p.action==='save'&&(!exact(p.content,['title','summary','body'])||!text(p.content.title,160,1)||!text(p.content.summary,500)||!text(p.content.body,20000,1)))deny('INVALID_INPUT');
 if(!home&&p.action==='save'){let layout;try{layout=decodeBlogLayout(p.content.body)}catch{deny('INVALID_INPUT')}if(layout)for(const id of blogMediaIds(layout)){if(env.CONTENT_MEDIA_ENABLED!=='true')deny('CONTENT_MEDIA_UNAVAILABLE',503);if(!await first(db,'SELECT id FROM nexus_content_media WHERE id=?1',id))deny('INVALID_INPUT')}}
 const current=home?await first(db,'SELECT * FROM nexus_content_home WHERE id=1'):await first(db,'SELECT * FROM nexus_content_posts WHERE id=?1',id);
 if(current?.version!==p.version&&!(p.version===0&&!current&&!home&&p.action==='save'))deny('CONTROL_CONFLICT',409);
 if(!home&&current&&current.slug!==p.slug)deny('INVALID_INPUT');
 if(!home&&current&&decodeBlogLayout(JSON.parse(current.draft_json).body)){
  if(p.action==='save'&&!decodeBlogLayout(p.content.body)||p.action==='publish'&&(!exact(p.content,['layoutVersion'])||p.content.layoutVersion!==1))deny('CONTENT_EDITOR_UPDATE_REQUIRED',409);
 }
 const commands=[],table=home?'nexus_content_home':'nexus_content_posts';
 if(current)commands.push(guard(db,p.requestId,'before','EXISTS(SELECT 1 FROM '+table+' WHERE id=?3 AND version=?4)',[home?1:id,p.version]));
 else commands.push(guard(db,p.requestId,'before','NOT EXISTS(SELECT 1 FROM nexus_content_posts WHERE id=?3 OR slug=?4)',[id,p.slug]));
 if(home){
  const json=JSON.stringify(p.content);
  if(p.action==='save')commands.push(query(db,'UPDATE nexus_content_home SET draft_json=?1,version=version+1,updated_at=?2 WHERE id=1',json,stamp));
  else commands.push(query(db,'UPDATE nexus_content_home SET published_json=draft_json,version=version+1,updated_at=?1 WHERE id=1',stamp));
 }else if(p.action==='save'){
  const json=JSON.stringify(p.content);
  commands.push(current?query(db,'UPDATE nexus_content_posts SET draft_json=?1,version=version+1,updated_at=?2 WHERE id=?3',json,stamp,id):query(db,"INSERT INTO nexus_content_posts(id,slug,draft_json,state,updated_at) VALUES(?1,?2,?3,'draft',?4)",id,p.slug,json,stamp));
 }else if(p.action==='publish')commands.push(query(db,"UPDATE nexus_content_posts SET published_json=draft_json,published_at=?1,state='published',version=version+1,updated_at=?1 WHERE id=?2",stamp,id));
 else if(p.action==='unpublish')commands.push(query(db,"UPDATE nexus_content_posts SET published_json=NULL,state='archived',version=version+1,updated_at=?1 WHERE id=?2",stamp,id));
 else commands.push(query(db,'DELETE FROM nexus_content_posts WHERE id=?1',id));
 commands.push(query(db,'INSERT INTO nexus_content_audit(id,actor_id,session_id,target_id,action,created_at) VALUES(?1,?2,?3,?4,?5,?6)',p.requestId,actor.account_id,actor.session_id,id,p.action,stamp));
 await atomic(env,commands);return {ok:true};
}
export async function publicContent(request,env){
 const headers={'cache-control':'no-store',vary:'*','x-content-type-options':'nosniff'};
 if(env.CONTENT_ENABLED!=='true'||request.method!=='GET')return Response.json({error:{code:'CONTENT_UNAVAILABLE'}},{status:503,headers});
 try{
  const url=new URL(request.url);
  if(url.hash)return Response.json({error:{code:'INVALID_INPUT'}},{status:400,headers});
  if([...url.searchParams.keys()].some(k=>!['slug','media'].includes(k))||[...url.searchParams.keys()].length>1||url.searchParams.getAll('slug').length>1||url.searchParams.getAll('media').length>1)return Response.json({error:{code:'INVALID_INPUT'}},{status:400,headers});
  if(url.searchParams.has('media')){try{if(env.CONTENT_MEDIA_PARTS_ENABLED==='true')deny('CONTENT_MEDIA_PARTS_REQUIRED',503);return Response.json(await mediaDTO(env,url.searchParams.get('media'),{publishedOnly:true}),{headers})}catch(e){return Response.json({error:{code:e.code||'CONTENT_UNAVAILABLE'}},{status:[400,404,503].includes(e.status)?e.status:503,headers})}}
  const slug=url.searchParams.get('slug');
  if(slug&&(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>80))return Response.json({error:{code:'INVALID_INPUT'}},{status:400,headers});
  const home=await first(env.DB,'SELECT published_json FROM nexus_content_home WHERE id=1');
  const posts=await rows(query(env.DB,"SELECT slug,published_json,published_at FROM nexus_content_posts WHERE state='published' AND published_json IS NOT NULL AND (?1 IS NULL OR slug=?1) ORDER BY published_at DESC,id LIMIT 20",slug));
  return Response.json({home:JSON.parse(home.published_json),posts:posts.map(r=>{const p=JSON.parse(r.published_json);return {slug:r.slug,title:p.title,summary:p.summary,...(slug?{body:p.body}:{}),...(decodeBlogLayout(p.body)?.cover?{cover:decodeBlogLayout(p.body).cover}:{}),publishedAt:r.published_at}})},{headers});
 }catch{return Response.json({error:{code:'CONTENT_UNAVAILABLE'}},{status:503,headers})}
}
