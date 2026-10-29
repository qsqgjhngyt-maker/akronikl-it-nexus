import test from 'node:test';import assert from 'node:assert/strict';import {createChatTree} from '../akronikl/experience/chat-tree.js';import {publicRecord} from '../pwa/policy.js';import {staticMime} from '../pwa/static-mime.js';
test('history capacity reserves an answer before a paid request and leaves the draft state untouched',()=>{
 const tree=createChatTree();for(let i=0;i<121;i++)tree.append({role:'assistant',text:'я'.repeat(4900)});const before=tree.snapshot();tree.setByteLimit(new TextEncoder().encode(JSON.stringify(before)).length+10000);assert.throws(()=>tree.assertCanAsk({text:'Следующий вопрос.'}),/CHAT_LIMIT/);assert.deepEqual(tree.snapshot(),before);tree.remove(before.nodes[0].id);assert.doesNotThrow(()=>tree.assertCanAsk({text:'Свободное место восстановлено.'}));
 const full=createChatTree();for(let i=0;i<127;i++)full.append({role:'assistant',text:'a'});assert.throws(()=>full.assertCanAsk({text:'Would discard the answer'}),/CHAT_LIMIT/);
});
test('offline authority accepts only fixed voice worker queries, never API or arbitrary queries',()=>{
 const origin='https://nexus.invalid',record={url:'/releases/ui1a-p4q-test/akronikl/experience/piper-worker.js',mime:'text/javascript'},request=query=>new Request(origin+record.url+query);
 assert.equal(publicRecord(request('?voice=uyut7-pilot5&transport=chunks-v1'),origin,[record],'v'),record);for(const query of ['?voice=attacker','?voice=uyut7-pilot5&key=secret','?voice=uyut7-pilot5&voice=irina'])assert.equal(publicRecord(request(query),origin,[record],'v'),null);assert.equal(publicRecord(new Request(origin+'/api/akronikl/cloud/chats'),origin,[record],'v'),null);
});
test('document worker, WASM, font and audio MIME match their actual public delivery',()=>{
 for(const [file,mime]of [['pdf.worker.mjs','text/javascript'],['decoder.wasm','application/wasm'],['font.ttf','font/ttf'],['font.pfb','application/x-font-type1'],['uyut7.wav','audio/wav'],['LICENSE','text/plain'],['brand-mark.svg','image/svg+xml']])assert.equal(staticMime(file),mime);
});
