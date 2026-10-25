import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {getCppOutline,getCppCourse} from '../core/course-registry.js';

const projectRoot = new URL('../',import.meta.url);
const fixtures = ['courses/cpp/manifest.json','courses/cpp/curriculum.json', 'courses/cpp/data/lessons.ru.json','courses/cpp/data/lessons.en.json','courses/cpp/data/practicums.ru.json','courses/cpp/data/projects.ru.json'];
const fileSizes = Object.fromEntries(await Promise.all(fixtures.map(async p=>[p,(await fs.stat(fileURLToPath(new URL(p, projectRoot)))).size])));
const requests=[];
globalThis.fetch = async (url,opts={})=>{
 const str = String(url),path = str.slice(projectRoot.href.length);
 assert.ok(str.startsWith(projectRoot.href),'GET stays within the public fixture directory');
 assert.ok(fixtures.includes(path),'Unexpected course asset: '+path);
 assert.equal(opts.cache,'no-store','Existing no-store policy remains unchanged');
 requests.push(path);
 return {ok:true,status:200,json:async()=>JSON.parse(await fs.readFile(fileURLToPath(new URL(path,projectRoot)),'utf8'))};
};

test('HOME obtains only minimal verified C++ outline',async()=>{
 const outline=await getCppOutline();
 assert.equal(outline.manifest.id,'cpp');
 assert.equal(outline.curriculum.lessons.length,45);
 assert.deepEqual(new Set(requests),new Set(fixtures.slice(0,2)));
 assert.equal(requests.length,2);
 assert.ok(requests.reduce((s,p)=>s+fileSizes[p],0)<=30000,'Outline including the versioned five-topic expansion must remain <=30KB');
});

test('Opening full C++ after HOME preserves all data, IDs and reuses verified outline',async()=>{
 const outline=await getCppOutline();
 const full=await getCppCourse();
 assert.strictEqual(full.manifest,outline.manifest);
 assert.strictEqual(full.curriculum,outline.curriculum);
 assert.equal(full.lessonsRu.lessons.length,45);
 assert.equal(full.lessonsEn.lessons.length,8);
 assert.deepEqual(new Set(requests),new Set(fixtures));
 assert.equal(requests.length,6,'No duplicate metadata request');
 const lessonIds=outline.curriculum.lessons.map(x=>x.id);
 assert.deepEqual(full.curriculum.lessons.map(x=>x.id),lessonIds,'Stable C++ lesson IDs');
});

test('Repeated full load does not introduce extra network I/O',async()=>{
 const first=await getCppCourse();
 const second=await getCppCourse();
 assert.strictEqual(first,second);
 assert.equal(requests.length,6);
});

test('COURSE outline failure does not permanently poison navigation',async()=>{
 let fail=true,seen=0;
 globalThis.fetch = async (url,opts)=>{
  const path=String(url).slice(projectRoot.href.length);seen++;
  if(fail && path==='courses/cpp/manifest.json'){fail=false;throw Error('synthetic temporary offline');}
  return {ok:true,status:200,json:async()=>JSON.parse(await fs.readFile(fileURLToPath(new URL(path,projectRoot)),'utf8'))};
 };
 const {getCppOutline:other} = await import('../core/course-registry.js?fresh-retry-case');
 await assert.rejects(other(),/synthetic temporary offline/);
 const result=await other();
 assert.equal(result.manifest.id,'cpp');
 assert.ok(seen>=4,'Attempted both initial resources and retried after failure');
});

test('Simultaneous Home / Code Hub entry deduplicates all in-flight C++ resources',async()=>{
 const calls=[];
 globalThis.fetch=async (url, opts)=>{
  const path=String(url).slice(projectRoot.href.length);calls.push(path);
  await new Promise(resolve=>setTimeout(resolve,3));
  return {ok:true,status:200,json:async()=>JSON.parse(await fs.readFile(fileURLToPath(new URL(path,projectRoot)),'utf8'))};
 };
 const module=await import('../core/course-registry.js?concurrent');
 const [o,full1,full2]=await Promise.all([
  module.getCppOutline(),module.getCppCourse(),module.getCppCourse()
 ]);
 assert.strictEqual(full1,full2);
 assert.strictEqual(full1.manifest,o.manifest);
 assert.equal(calls.length,6);
 assert.deepEqual(new Set(calls),new Set(fixtures));
});

test('APP route wiring uses lazy course path without weakening C++ full routes',async()=>{
 const app=await fs.readFile(fileURLToPath(new URL('../core/app.js',import.meta.url)),'utf8');
 assert.match(app,/r\.view==='home'\|\|r\.view==='academy'\)\{if\(!cpp\)cppLanding\?\?=await getCppOutline\(\)/);
 assert.match(app,/cppContinuation\(\)\{return learningResume\.continuation\(cpp\|\|cppLanding,/);
 assert.match(app,/r\.course==='cpp'\)\{const courseReady=cpp\|\|getCppCourse\(\)/);
 assert.match(app,/r\.view==='programming'\)\{programming\?\?=await getProgrammingLanguages\(\);cpp\?\?=await getCppCourse\(\)/);
 // Static Academy rendering uses the public catalog, not lesson body content.
 assert.equal(app.includes("else if(r.view==='home'||r.view==='academy'){cpp??=await getCppCourse()"),false);
});
