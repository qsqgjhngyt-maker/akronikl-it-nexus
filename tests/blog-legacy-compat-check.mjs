import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {randomUUID} from 'node:crypto';
import {controlFixture} from './helpers/control-fixture.mjs';
import {encodeBlogLayout,restoreLayoutArticle,LAYOUT_PREFIX} from '../core/blog-layout.js';
import {blogBodyMarkup as legacyBody} from '../releases/ui1a-alpha10-cms-20261022/core/blog-presentation.js';
import {blogBodyMarkup as currentBody} from '../core/blog-presentation.js';
import {createAccountControlHandler} from '../server-access/bff/account-control.mjs';
import {createContentHandler} from '../server-access/bff/content.mjs';
import {GATEWAY_ORIGIN} from '../server-access/bff/account-read.mjs';
import {handleAdminService} from '../server-access/worker/admin-service.mjs';
import {publicContent} from '../server-access/worker/content-service.mjs';
const f=await controlFixture(),env={...f.env,CONTENT_ENABLED:'true',CONTENT_MEDIA_ENABLED:'true',CONTENT_MEDIA_UPLOAD_ENABLED:'true',CONTENT_PROXY_ENABLED:'true',ACCOUNT_CONTROL_PROXY_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',COOKIE_INGRESS_V3_ENABLED:'true'},id=randomUUID(),path='/api/v2/account/control/content';let checks=0;
const body=encodeBlogLayout({schemaVersion:1,cover:null,blocks:[{id:randomUUID(),kind:'text',text:'Читаемый текст старому клиенту <script>bad</script>',width:50,align:'left',ratio:'auto',columns:1,surface:'panel',images:[]}]});
const request=(action,version,content)=>f.call(path,{method:'POST',payload:{requestId:randomUUID(),target:'post',id,slug:'legacy-safe',version,action,content}},env);
const fetchImpl=async(url,options)=>{assert.equal(new Headers(options.headers).has('cookie'),false);return url.includes('/internal/control')?handleAdminService(new Request(url,options),env):publicContent(new Request(url,options),env)};
const control=createAccountControlHandler({env,fetchImpl}),content=createContentHandler({env,fetchImpl});
async function read(handler,url){const headers={host:new URL(GATEWAY_ORIGIN).host,'x-nexus-account-expectation':f.owner.id,cookie:'__Host-nexus_session='+f.owner.secret,'x-yc-apigateway-operation-context':Buffer.from('{"accountControlContract":"v3"}').toString('base64')},req=Readable.from([]);Object.assign(req,{url,method:'GET',headers,rawHeaders:Object.entries(headers).flat()});const res={writeHead(status,headers){this.status=status;this.headers=headers},end(raw){this.body=JSON.parse(raw)}};assert.equal(await handler(req,res),true);assert.equal(res.headers['cache-control'],'no-store');assert.equal(res.headers.vary,'*');assert.equal(res.headers['set-cookie'],undefined);return res}
const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name)};
try{
 assert.equal((await request('save',0,{title:'Legacy compatibility',summary:'',body})).status,200);
 await check('old CMS receives readable update notice; new CMS restores the exact full layout',async()=>{const r=await read(control,path);assert.equal(r.status,200);const article=r.body.posts[0].draft;assert.equal(article.layout,body);assert.ok(!article.body.includes(LAYOUT_PREFIX));assert.match(article.body,/Обновите Nexus/);assert.equal(restoreLayoutArticle(article).body,body)});
 await check('old installed editor cannot downgrade or publish a structured draft, and stored bytes/version survive',async()=>{for(const result of [await request('save',1,{title:'Overwrite attempt',summary:'',body:'Legacy plaintext overwrite'}),await request('publish',1,{}),await request('publish',1,{layoutVersion:2}),await request('publish',1,{layoutVersion:1,unknown:true})]){assert.equal(result.status,409);assert.equal(result.body.error.code,'CONTENT_EDITOR_UPDATE_REQUIRED')}const row=f.db.prepare('SELECT draft_json,version FROM nexus_content_posts WHERE id=?').get(id);assert.equal(JSON.parse(row.draft_json).body,body);assert.equal(row.version,1)});
 await check('current explicit publish succeeds; accepted old public renderer never displays encoded JSON',async()=>{assert.equal((await request('publish',1,{layoutVersion:1})).status,200);const r=await read(content,'/api/v2/content/feed?slug=legacy-safe');assert.equal(r.status,200);const article=r.body.posts[0];assert.equal(article.layout,body);assert.ok(!article.body.includes(LAYOUT_PREFIX));const old=legacyBody(article.body),modern=currentBody(restoreLayoutArticle(article).body);assert.ok(old.includes('Читаемый текст'));assert.ok(!old.includes(LAYOUT_PREFIX));assert.ok(!old.includes('<script>'));assert.ok(modern.includes('blog-width-50'));assert.ok(!modern.includes('<script>'))});
 await check('plain legacy content remains writable/publishable without a layout marker; forged layout response rejected',async()=>{const p={requestId:randomUUID(),target:'post',id:randomUUID(),slug:'old-plain',version:0,action:'save',content:{title:'Old article',summary:'',body:'PLAIN_LEGACY_TEXT'}};assert.equal((await f.call(path,{method:'POST',payload:p},env)).status,200);assert.equal((await f.call(path,{method:'POST',payload:{...p,requestId:randomUUID(),version:1,action:'publish',content:{}}},env)).status,200);assert.throws(()=>restoreLayoutArticle({body:'safe',layout:'<script>bad</script>'}));assert.equal(restoreLayoutArticle({body:'plain'}).body,'plain')});
 console.log(JSON.stringify({status:'PASS',checks,realCredentials:false,productionWrites:0,oldRenderer:'exact retained accepted Alpha10.1 module',authEnvelopeChanged:false}));
}finally{f.close()}
