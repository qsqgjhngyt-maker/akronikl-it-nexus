import {clarityLocalFixture} from './helpers/cpp-clarity-local-fixture.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const out=path.resolve(process.env.NEXUS_REFERENCE_EVIDENCE);await mkdir(out,{recursive:true});
const f=await clarityLocalFixture(path.join(out,'vault')),p=f.page,metrics=[],timings=[];
try{
 for(const id of ['cpp.programming-process','cpp.first-cpp-program','cpp.data-types']){
  const start=performance.now();await p.evaluate(id=>location.hash='#course=cpp&lesson='+id+'&stage=practice&locale=ru',id);await p.locator('#editor').waitFor();timings.push({id,ms:performance.now()-start});
 }
 const source=Array.from({length:35},(_,i)=>i===5?'':i===9?'\t// tab and long line '+'.'.repeat(160):'// Line '+(i+1)).join('\n');
 await p.locator('#editor').fill(source);
 for(const width of [1366,390,320]){
  await p.setViewportSize({width,height:900});await p.locator('#editor').scrollIntoViewIfNeeded();
  metrics.push(await p.locator('#editor').evaluate((ed,width)=>{const pre=ed.closest('.code-editor-stage').querySelector('pre');const keys=['fontFamily','fontSize','lineHeight','padding','tabSize','whiteSpace','letterSpacing'];return{width,input:Object.fromEntries(keys.map(k=>[k,getComputedStyle(ed)[k]])),highlight:Object.fromEntries(keys.map(k=>[k,getComputedStyle(pre)[k]])),sourceUnchanged:ed.value.split('\n').length===35}},width));
  await p.screenshot({path:path.join(out,'editor-before-'+width+'.png')});
 }
 await writeFile(path.join(out,'EDITOR_BEFORE.json'),JSON.stringify({metrics,timings,scope:'Real renderer, synthetic local vault, before changes; physical devices not used'},null,2));
}finally{await f.close()}
