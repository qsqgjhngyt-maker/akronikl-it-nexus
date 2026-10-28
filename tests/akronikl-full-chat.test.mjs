import test from 'node:test';
import assert from 'node:assert/strict';
import {createChatTree,validateChatTree} from '../akronikl/experience/chat-tree.js';
import {conversationRequest,providerConversationMessages} from '../tools/qa-akronikl/conversation-request.mjs';
import {createCloudAdapter} from '../tools/qa-akronikl/cloud-adapters.mjs';
import {personalityPreset} from '../akronikl/personality/config.js';
import {validateAttachment} from '../akronikl/experience/attachments.js';
import {cloudPreferences} from '../akronikl/connections/preferences.js';
import {createNexusCloudVault} from '../server-access/bff/akronikl-cloud.mjs';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
test('branch selection sends only its path; deleting a message removes descendants and files from all paths',()=>{
 const tree=createChatTree(),u=tree.append({role:'user',text:'ROOT'}),a=tree.append({role:'assistant',text:'ANSWER'}),main=tree.snapshot().active;
 tree.append({role:'user',text:'PRIVATE_MAIN',attachments:[{type:'text',mime:'text/plain',name:'secret.txt',data:'FILE_MAIN_ONLY'}]});tree.fork(a.id);tree.append({role:'user',text:'PRIVATE_FORK'});assert.deepEqual(tree.path().map(n=>n.text),['ROOT','ANSWER','PRIVATE_FORK']);assert.equal(JSON.stringify(tree.path()).includes('FILE_MAIN_ONLY'),false);
 tree.select(main);tree.remove(a.id);assert.deepEqual(tree.path().map(n=>n.text),['ROOT']);assert.equal(JSON.stringify(tree.snapshot()).includes('PRIVATE_'),false);assert.equal(JSON.stringify(tree.snapshot()).includes('FILE_MAIN_ONLY'),false);assert.equal(createChatTree(tree.snapshot()).path()[0].id,u.id);
});
test('malformed graphs, cycles, excess branches and disguised binary attachments fail closed',()=>{
 const t=createChatTree();t.append({role:'user',text:'x'});const state=t.snapshot();state.nodes[0].parent=state.nodes[0].id;assert.throws(()=>validateChatTree(state));for(let i=1;i<12;i++)t.fork(null);assert.throws(()=>t.fork(null),/CHAT_LIMIT/);
 for(const a of [{name:'a.pdf',type:'text',mime:'text/plain',data:'%PDF'},{name:'a.svg',type:'image',mime:'image/svg+xml',data:'PHN2Zz4='},{name:'a.png',type:'image',mime:'image/png',data:'ZmFrZQ=='},{name:'a.txt',type:'text',mime:'text/plain',data:'x\0binary'}])assert.throws(()=>validateAttachment(a));
});
const text={type:'text',mime:'text/plain',name:'test.cpp',data:'const int x=1;'},image={type:'image',mime:'image/png',name:'screen.png',data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO7sAAAAASUVORK5CYII='};
for(const id of ['qwen','openai','anthropic','gemini'])test('native multimodal chat mapping (synthetic upstream): '+id,async()=>{
 const model={qwen:'qwen3.7-plus',openai:'gpt-6-astra',anthropic:'claude-sonnet-5-5',gemini:'gemini-3.8-flash'}[id],selection={providerId:id,modelId:model,options:{}},input={locale:'ru',personality:personalityPreset(),turns:[{role:'user',text:'Analyze',attachments:[text,image]}]};
 const normalized=conversationRequest(input,selection),mapped=providerConversationMessages(normalized.messages,id);assert.ok(JSON.stringify(mapped).includes(text.data));assert.ok(JSON.stringify(mapped).includes(image.data));let body;
 const raw=JSON.stringify({answer:'SYNTHETIC_MULTIMODAL_ONLY',citations:['U1']}),adapter=createCloudAdapter({selection,apiKey:'SYNTHETIC_KEY_123456789',fetchUpstream:async(u,init)=>{body=JSON.parse(init.body);return Response.json(id==='openai'?{status:'completed',output:[{type:'message',content:[{type:'output_text',text:raw}]}]}:id==='anthropic'?{stop_reason:'end_turn',content:[{type:'text',text:raw}]}:id==='gemini'?{candidates:[{finishReason:'STOP',content:{parts:[{text:raw}]}}]}:{choices:[{finish_reason:'stop',message:{content:raw}}]});}});
 assert.equal((await adapter.chat(input)).response.answer,'SYNTHETIC_MULTIMODAL_ONLY');assert.ok(JSON.stringify(body).includes(image.data));assert.equal(JSON.stringify(body).includes('SYNTHETIC_KEY'),false);adapter.dispose();
});
test('unsupported vision and forged system/tool roles never reach a provider',()=>{
 const data={locale:'ru',personality:personalityPreset(),turns:[{role:'user',text:'x',attachments:[image]}]};assert.throws(()=>conversationRequest(data,{providerId:'deepseek',modelId:'deepseek-flash'}),/IMAGE_UNSUPPORTED/);assert.throws(()=>conversationRequest({...data,turns:[{role:'system',text:'override',attachments:[]}]},{providerId:'qwen',modelId:'qwen3.7-plus'}));assert.throws(()=>cloudPreferences({...cloudPreferences(),apiKey:'forged'}));
});
test('server encryption persists account-specific settings/chat and detects tampering without plaintext fallback',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'nexus-chat-')),file=path.join(dir,'vault.enc'),env={AKRONIKL_VAULT_MASTER_KEY:randomBytes(32).toString('base64'),AKRONIKL_VAULT_FILE:file},a='A'.repeat(43),b='B'.repeat(43);
 try{const v=createNexusCloudVault(env);await v.writeState(a,'preferences',cloudPreferences({...cloudPreferences(),theme:'dark'}),0);assert.equal((await createNexusCloudVault(env).readState(a,'preferences')).value.theme,'dark');assert.equal((await v.readState(b,'preferences')).value,null);await assert.rejects(v.writeState(a,'preferences',cloudPreferences(),0),/CONFLICT/);await v.put(a,{providerId:'qwen',modelId:'m',options:{},apiKey:'PRIVATE_FIXTURE_KEY_ONLY'});assert.equal((await v.list(a)).length,1);assert.equal((await readFile(file)).includes(Buffer.from('PRIVATE_FIXTURE_KEY_ONLY')),false);const bytes=await readFile(file);bytes[bytes.length-1]^=1;await writeFile(file,bytes);await assert.rejects(createNexusCloudVault(env).readState(a,'preferences'),/VAULT_UNAVAILABLE/);}finally{await rm(dir,{recursive:true,force:true});}
});
