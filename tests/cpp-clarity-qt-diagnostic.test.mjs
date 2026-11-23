import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {mkdtemp,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {observeQtPageErrors} from './helpers/cpp-clarity-qt-pageerror-diagnostic.mjs';

async function fixture(frames=[]) {
 const page=new EventEmitter(),errors=[];
 page.url=()=> 'https://synthetic.invalid/lesson?token=SYNTHETIC_QUERY#private';
 page.viewportSize=()=>({width:390,height:844});page.frames=()=>frames;
 page.on('pageerror',error=>errors.push(error.message));
 const dir=await mkdtemp(path.join(os.tmpdir(),'nexus-qt-diagnostic-'));
 const file=path.join(dir,'B06_QT_PAGEERROR_DIAGNOSTIC.json');
 const observer=observeQtPageErrors({page,file,browserVersion:'synthetic-version',browserMode:'unit fixture',generation:'synthetic',profile:{id:'synthetic'}});
 return {page,errors,file,observer};
}
test('Пассивный наблюдатель сохраняет штатный сбор ошибок и фазу события, удаляет URL-параметры',async()=>{
 const f=await fixture([{url:()=> 'https://user:SYNTHETIC_PASSWORD@synthetic.invalid/artifacts/abc/'+ 'a'.repeat(64)+'?auth=SYNTHETIC_QUERY',evaluate:async()=>({canvases:[],iframes:[]})}]);
 f.observer.setPhase('Stop/Run',{programId:'synthetic-program',bundleIndex:7});
 const error=Error('synthetic canvas failure');error.stack='Error\n at https://synthetic.invalid/program.js?token=SYNTHETIC_QUERY#private\n at data:text/plain,SYNTHETIC_PAYLOAD';
 f.page.emit('pageerror',error);f.observer.setPhase('next program',{programId:'later'});
 const report=await f.observer.flush(),text=await readFile(f.file,'utf8');
 assert.deepEqual(f.errors,['synthetic canvas failure']);assert.equal(f.page.listenerCount('pageerror'),2);
 assert.equal(report.events[0].phase.programId,'synthetic-program');assert.equal(report.events[0].phase.action,'Stop/Run');
 for(const privateText of ['SYNTHETIC_QUERY','SYNTHETIC_PASSWORD','SYNTHETIC_PAYLOAD','a'.repeat(64)])assert.ok(!text.includes(privateText));
 assert.equal(report.events[0].url,'https://synthetic.invalid/lesson');assert.equal(report.totalPageErrors,1);
});
test('Недоступный frame записывается как недоступный, исходная ошибка не скрывается',async()=>{
 const f=await fixture([{url:()=> 'about:blank',evaluate:async()=>{throw Error('Execution context destroyed');}}]);
 f.page.emit('pageerror',Error('synthetic original failure'));const report=await f.observer.flush();
 assert.equal(f.errors.length,1);assert.equal(report.events[0].frames[0].availability,'unavailable');
 assert.equal(report.events[0].frames[0].rect,undefined);assert.equal(report.existingErrorCollectionChanged,false);
});
test('Отсутствие pageerror не создаёт события и не запускает чтение геометрии',async()=>{
 const f=await fixture([{evaluate:()=>{throw Error('Should not be called');}}]);const report=await f.observer.flush();
 assert.deepEqual(f.errors,[]);assert.deepEqual(report.events,[]);assert.equal(report.totalPageErrors,0);
});
