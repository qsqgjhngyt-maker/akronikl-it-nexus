import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const app=await fs.readFile(path.join(root,'core/app.js'),'utf8');
const heavy=['../sandbox/sandbox.js','../effects/nexus-graphics-workshop.js','./administration.js'];
async function graph(){
 const seen=new Set();
 async function walk(rel){
  if(seen.has(rel))return;seen.add(rel);
  const code=await fs.readFile(path.join(root,rel),'utf8');
  const regex=/(?:^|;|\n)\s*(?:import|export)\s+(?:[^;'"\x60]*?\s+from\s*)?["']([^"']+)["']/gm;
  for(const hit of code.matchAll(regex)){
   if(!hit[1].startsWith('.'))continue;
   const file=path.posix.normalize(path.posix.join(path.posix.dirname(rel),hit[1]));
   await walk(path.posix.extname(file)?file:file+'.js');
  }
 }
 await walk('core/app.js');
 let bytes=0;for(const file of seen)bytes+=(await fs.stat(path.join(root,file))).size;
 return {modules:seen.size,bytes,files:seen};
}
test('Large tools no longer belong to the critical Home static import graph',async()=>{
 const result=await graph();
 // P4-Q adds progress, presence, the brand image and account self-deletion.
 // Measured source graph: 79 modules / 629956 bytes (previously 75 / 593926).
 // These are source budgets, not a claim about measured launch latency.
 assert.ok(result.modules<=80,'Unexpected startup module count: '+result.modules);
 assert.ok(result.bytes<=640000,'Unexpected startup source size: '+result.bytes);
 for(const module of heavy){
  assert.ok(app.includes("import('"+module+"')"),'Missing dynamic import: '+module);
  assert.ok(!app.includes('from '+String.fromCharCode(39)+module+String.fromCharCode(39)),'Heavy static import retained: '+module);
  assert.ok(!result.files.has(path.posix.normalize(path.posix.join('core',module))),'Heavy transitive startup import: '+module);
 }
});
test('Heavy routes load dependencies before render/bind',()=>{
 assert.match(app,/const runtimeReady=r\.lesson\|\|r\.practicum\?loadSandboxRuntime\(\):null/);
 assert.match(app,/await Promise\.all\(\[courseReady,runtimeReady,r\.lesson\?prepareCppGoldLesson/);
 assert.match(app,/\(await loadGraphicsWorkshop\(\)\)\.graphicsWorkshopMarkup\(t\)/);
 assert.match(app,/\(await loadAdministration\(\)\)\.administrationMarkup\(r\.tab\)/);
});
test('Lazy runtime exports preserved',async()=>{
 const sandbox=await import('../sandbox/sandbox.js');
 const graphics=await import('../effects/nexus-graphics-workshop.js');
 const admin=await import('../core/administration.js');
 assert.equal(typeof sandbox.createSandboxController,'function');
 assert.equal(typeof graphics.bindGraphicsWorkshop,'function');
 assert.equal(typeof graphics.graphicsWorkshopMarkup,'function');
 assert.equal(typeof admin.administrationMarkup,'function');
 assert.equal(typeof admin.bindAdministration,'function');
});
