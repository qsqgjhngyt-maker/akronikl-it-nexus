import assert from 'node:assert/strict';
import {createHash,createHmac,randomBytes,randomUUID} from 'node:crypto';
import {controlFixture} from '../tests/helpers/control-fixture.mjs';
import {handleFeedbackRequest} from './worker/feedback-service.js';
import {publicContent} from './worker/content-service.mjs';
const f=await controlFixture(),env={...f.env,COMMUNITY_ENABLED:'true',CONTENT_ENABLED:'true',FEEDBACK_ENABLED:'true',FEEDBACK_SERVICE_KEY:'SYNTHETIC_COMMUNITY_FEEDBACK_SERVICE_KEY_ONLY'};
const user=f.seed('synthetic-community-user',{username:'community.user'}),other=f.seed('synthetic-community-other',{username:'community.other'});
const moderator=f.seed('synthetic-community-moderator',{username:'community.mod'});
f.db.prepare('INSERT INTO feedback_permissions(account_id,can_moderate) VALUES(?,1)').run(moderator.id);
const sha=v=>createHash('sha256').update(v).digest('hex');
async function feedback(path,{actor=user,method='GET',payload=null}={}){
 const internal='/api/v2/feedback/internal',body=JSON.stringify({path:'/api/v2/feedback/'+path,method,payload,sessionHash:sha(actor.secret),expectedAccountId:actor.id}),stamp=String(Date.now()),nonce=randomBytes(16).toString('hex');
 const signature=createHmac('sha256',env.FEEDBACK_SERVICE_KEY).update(['v1','POST',internal,stamp,nonce,sha(body)].join('\n')).digest('hex');
 const response=await handleFeedbackRequest(new Request('https://synthetic.invalid'+internal,{method:'POST',body,headers:{'content-type':'application/json','x-nexus-service-timestamp':stamp,'x-nexus-service-nonce':nonce,'x-nexus-service-signature':signature}}),env);
 return {status:response.status,body:await response.json()};
}
const itemInput=(kind='message')=>({kind,type:kind==='review'?'review':'idea',body:'SYNTHETIC_PRIVATE_QUESTION_ONLY',publicName:'Synthetic',rating:5,courseId:'',consent:kind==='review',context:{},requestKey:randomUUID()});
const content=(payload,actor=f.owner)=>f.call('/api/v2/account/control/content',{actor,method:'POST',payload:{requestId:randomUUID(),...payload}},env);
const feed=async slug=>(await publicContent(new Request('https://synthetic.invalid/api/v2/content/feed'+(slug?'?slug='+slug:'')),env)).json();
let checks=0,item,reply,review,postId=randomUUID();
const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name)};
try{
 await check('administrator gets team capability without reusing email or browser claims',async()=>{
  const caps=await f.call('/api/v2/account/control/capabilities',{},env);assert.equal(caps.status,200);assert.equal(caps.body.canModerate,true);
  assert.equal((await feedback('me',{actor:f.owner})).body.canModerate,true);
  assert.equal((await feedback('moderation',{actor:user})).status,403);
  const limited=await f.call('/api/v2/account/control/capabilities',{actor:moderator},env);
  assert.equal(limited.body.canModerate,true);assert.equal(limited.body.canManage,false);
  assert.equal((await f.call('/api/v2/account/control/users',{actor:moderator},env)).status,403);
  assert.equal((await f.call('/api/v2/account/control/content',{actor:moderator},env)).status,403);
 });
 await check('author creates a real server message; another account cannot inspect or delete it',async()=>{
  const created=await feedback('items',{method:'POST',payload:itemInput()});assert.equal(created.status,200,JSON.stringify(created.body));item=created.body.item;
  assert.equal((await feedback('items/'+item.id+'/conversation',{actor:other})).status,404);
  assert.equal((await feedback('items/'+item.id+'/delete',{actor:other,method:'POST',payload:{requestId:randomUUID(),version:item.version}})).status,404);
 });
 await check('team reply is server-labelled, idempotent and private; author can reply without becoming team',async()=>{
  const requestId=randomUUID(),payload={requestId,body:'SYNTHETIC_TEAM_RESPONSE_ONLY'};
  assert.equal((await feedback('items/'+item.id+'/replies',{actor:f.owner,method:'POST',payload})).status,200);
  assert.equal((await feedback('items/'+item.id+'/replies',{actor:f.owner,method:'POST',payload})).status,200);
  assert.equal((await feedback('items/'+item.id+'/replies',{actor:f.owner,method:'POST',payload:{...payload,body:'changed'}})).status,409);
  assert.equal((await feedback('items/'+item.id+'/replies',{method:'POST',payload:{requestId:randomUUID(),body:'Спасибо, теперь понятно'}})).status,200);
  const thread=await feedback('items/'+item.id+'/conversation');assert.equal(thread.body.replies.length,2);
  reply=thread.body.replies.find(r=>r.team);assert.equal(reply.authorName,'Команда Nexus');assert.equal(thread.body.replies.find(r=>r.mine).team,false);
  assert.equal((await feedback('items/'+item.id+'/replies',{method:'POST',payload:{requestId:randomUUID(),body:'spoof',team:true}})).status,400);
 });
 await check('reply ownership is enforced; moderator can remove a reply without exposing its old body',async()=>{
  const path='items/'+item.id+'/replies/'+reply.id+'/delete';
  assert.equal((await feedback(path,{method:'POST',payload:{requestId:randomUUID(),version:1}})).status,404);
  assert.equal((await feedback(path,{actor:f.owner,method:'POST',payload:{requestId:randomUUID(),version:1}})).status,200);
  const thread=await feedback('items/'+item.id+'/conversation');assert.equal(thread.body.replies[0].body,null);assert.equal(thread.body.replies[0].deleted,true);
  assert.equal(f.db.prepare('SELECT body FROM feedback_replies WHERE id=?').get(reply.id).body,null);
 });
 await check('author deletion erases revisions/conversation and blocks stale edits or replayed creation',async()=>{
  const original=f.db.prepare('SELECT request_key FROM feedback_items WHERE id=?').get(item.id).request_key;
  assert.equal((await feedback('items/'+item.id+'/delete',{method:'POST',payload:{requestId:randomUUID(),version:item.version+1}})).status,409);
  assert.equal((await feedback('items/'+item.id+'/delete',{method:'POST',payload:{requestId:randomUUID(),version:item.version}})).status,200);
  assert.equal(f.db.prepare('SELECT count(*) n FROM feedback_replies WHERE item_id=?').get(item.id).n,0);
  assert.equal(f.db.prepare('SELECT count(*) n FROM feedback_revisions WHERE item_id=?').get(item.id).n,0);
  assert.equal((await feedback('items/'+item.id+'/conversation')).status,404);
  assert.equal((await feedback('items',{method:'POST',payload:{...itemInput(),requestKey:original}})).body.error.code,'ITEM_DELETED');
 });
 await check('approved consented review may be featured; author or moderator deletion removes it from public feed',async()=>{
  review=(await feedback('items',{method:'POST',payload:itemInput('review')})).body.item;
  for(const action of ['approve','feature']){const r=await feedback('items/'+review.id+'/moderate',{actor:f.owner,method:'PATCH',payload:{version:review.version,revision:review.revision,action,reason:''}});assert.equal(r.status,200);review=r.body.item}
  let pub=await handleFeedbackRequest(new Request('https://synthetic.invalid/api/v2/feedback/reviews?featured=1&limit=3'),env);assert.equal((await pub.json()).reviews.length,1);
  assert.equal((await feedback('items/'+review.id+'/delete',{actor:f.owner,method:'POST',payload:{requestId:randomUUID(),version:review.version}})).status,200);
  pub=await handleFeedbackRequest(new Request('https://synthetic.invalid/api/v2/feedback/reviews?featured=1&limit=3'),env);assert.equal((await pub.json()).reviews.length,0);
 });
 await check('draft articles stay private; only a fresh Passkey administrator can publish',async()=>{
  const payload={target:'post',id:postId,slug:'synthetic-first',version:0,action:'save',content:{title:'Первый пост',summary:'Кратко',body:'<script>never_execute()</script>\nТекст статьи'}};
  assert.equal((await content(payload,user)).status,403);
  assert.equal((await content(payload)).status,200);assert.equal((await feed()).posts.length,0);
  assert.equal((await content({...payload,version:1,action:'publish',content:{}})).status,200);
  assert.equal((await feed('synthetic-first')).posts[0].body,payload.content.body);
 });
 await check('published snapshot survives draft edits; stale writes and role-revocation races roll back',async()=>{
  const payload={target:'post',id:postId,slug:'synthetic-first',version:2,action:'save',content:{title:'Вторая версия',summary:'Кратко',body:'Новый черновик'}};
  assert.equal((await content(payload)).status,200);
  assert.equal((await feed()).posts[0].title,'Первый пост');
  assert.equal((await content(payload)).status,409);
  f.beforeBatch(()=>f.db.prepare("UPDATE nexus_admin_grants SET status='revoked' WHERE account_id=?").run(f.owner.id));
  assert.equal((await content({...payload,version:3,action:'publish',content:{}})).status,401);
  assert.equal((await feed()).posts[0].title,'Первый пост');
  f.db.prepare("UPDATE nexus_admin_grants SET status='active' WHERE account_id=?").run(f.owner.id);
 });
 await check('homepage draft publishes separately; unknown slots, HTML contracts and learning changes cannot enter',async()=>{
  const payload={target:'home',id:'home',slug:'',version:1,action:'save',content:{title:'Синтетическая главная'}};
  assert.equal((await content(payload)).status,200);assert.deepEqual((await feed()).home,{});
  assert.equal((await content({...payload,version:2,action:'publish'})).status,200);
  assert.equal((await feed()).home.title,'Синтетическая главная');
  assert.equal((await content({...payload,version:3,content:{course:'changed'}})).status,400);
  assert.equal((await content({...payload,target:'learning'})).status,400);
 });
 await check('unpublish removes public article; explicit deletion removes draft; ordinary account remains intact',async()=>{
  const p={target:'post',id:postId,slug:'synthetic-first',version:3,action:'unpublish',content:{}};
  assert.equal((await content(p)).status,200);assert.equal((await feed()).posts.length,0);
  assert.equal((await content({...p,version:4,action:'delete'})).status,200);
  assert.equal(f.db.prepare('SELECT id FROM nexus_content_posts WHERE id=?').get(postId),undefined);
  assert.ok(f.db.prepare('SELECT id FROM account_subjects WHERE id=?').get(other.id));
  assert.equal(f.db.prepare('PRAGMA foreign_key_check').all().length,0);
 });
 await check('account purge cleans deleted-message receipts and replies without touching other users',async()=>{
  const action=await f.call('/api/v2/account/control/users/'+user.id+'/action',{method:'POST',payload:{requestId:randomUUID(),version:1,action:'remove'}},env);assert.equal(action.status,200);
  const preview=await f.call('/api/v2/account/control/users/'+user.id+'/purge-preview',{method:'POST',payload:{requestId:randomUUID(),version:2}},env);assert.equal(preview.status,200,JSON.stringify(preview.body));
  const result=await f.call('/api/v2/account/control/users/'+user.id+'/purge',{method:'POST',payload:{requestId:randomUUID(),version:2,approvalToken:preview.body.approvalToken,confirmation:preview.body.confirmation}},env);assert.equal(result.status,200,JSON.stringify(result.body));
  assert.equal(f.db.prepare('SELECT count(*) n FROM feedback_deleted_items WHERE author_id=?').get(user.id).n,0);
  assert.ok(f.db.prepare('SELECT id FROM account_subjects WHERE id=?').get(other.id));
  assert.equal(f.db.prepare('PRAGMA foreign_key_check').all().length,0);
 });
 console.log(JSON.stringify({status:'PASS',checks,syntheticOnly:true,productionWrites:0}));
}finally{f.close()}
