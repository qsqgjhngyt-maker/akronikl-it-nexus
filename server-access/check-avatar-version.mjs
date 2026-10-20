import assert from 'node:assert/strict';
import jpeg from 'jpeg-js';
import {controlFixture} from '../tests/helpers/control-fixture.mjs';
import {sanitizeAvatar} from './avatar-codec.mjs';
const f=await controlFixture(),user=f.seed('synthetic-avatar-version',{username:'avatar.user'});
const raw=jpeg.encode({data:Buffer.alloc(128*128*4,255),width:128,height:128},80).data;
const image=sanitizeAvatar(raw.toString('base64'));
const call=(path,version,requestId=crypto.randomUUID())=>f.call('/api/v2/account/profile/avatar'+path,{actor:user,method:'POST',payload:{requestId,version,...(path===''?{jpegBase64:image}:{})}});
try{
 const saved=await call('',0);assert.equal(saved.status,200);assert.equal(saved.body.avatarVersion,1);
 assert.equal((await call('',0)).status,409);
 const removed=await call('/remove',1);assert.equal(removed.status,200);assert.equal(removed.body.avatar,null);
 assert.equal(removed.body.avatarVersion,2,'Removal must retain a monotonically increasing revision');
 for(const stale of [0,1]){
  assert.equal((await call('',stale)).status,409,'A stale tab must not resurrect a removed photo');
  assert.equal((await call('/remove',stale)).status,409);
 }
 const read=await f.call('/api/v2/account/profile',{actor:user});
 assert.equal(read.body.avatar,null);assert.equal(read.body.avatarVersion,2);
 const requestId=crypto.randomUUID(),replacement=await call('',2,requestId);
 assert.equal(replacement.status,200);assert.equal(replacement.body.avatarVersion,3);
 assert.equal((await call('',3,requestId)).status,409,'Reusing a write request cannot create another revision');
 console.log(JSON.stringify({status:'PASS',checks:8,staleResurrectionBlocked:true,removeRevisionRetained:true,syntheticOnly:true}));
}finally{f.close()}
