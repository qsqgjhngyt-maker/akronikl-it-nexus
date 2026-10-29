import test from 'node:test';import assert from 'node:assert/strict';
import {allowedIntroV6ProductPath,introV6Scope,GENERATION,VALIDATED} from '../tools/intro-v6-scope.mjs';
test('Новый допуск ограничен заставкой и новым immutable поколением',()=>{
 for(const f of ['core/startup-intro.js','intro-media/cinematic-v6/mobile.mp4','releases/'+GENERATION+'/core/startup-intro.js'])assert.equal(allowedIntroV6ProductPath(f),true);
 for(const f of ['core/app.js','core/bootstrap.js','server-access/public/entry.js','core/account-storage.js','courses/cpp/curriculum.json','pwa/service-worker.js','releases/ui1a-cpp-course-final-refresh-20261029/core/app.js','.github/workflows/cpp-course-final.yml'])assert.equal(allowedIntroV6ProductPath(f),false,f);
});
test('Фактические bytes совпадают с уже проверенной сборкой',async()=>{const scope=await introV6Scope();assert.equal(scope.validatedCommit,VALIDATED);assert.equal(scope.identityAndContentUnchanged,true);assert.ok(scope.productFiles>0)});
