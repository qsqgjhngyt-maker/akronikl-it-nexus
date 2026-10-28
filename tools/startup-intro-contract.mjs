// Отдельный контракт кандидата. Receipt и валидаторы принятой M5 неизменны.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const ROOT=fileURLToPath(new URL('../',import.meta.url));
export const BASE='d76d1613a1fbf6726d453e40366c306ea502d4c7';
export const IMPLEMENTATION='1d83e485bc9bc8a122b6a4eebd79f39a408f635a';
export const GENERATION='ui1a-startup-cinematic-candidate-20261028';
export const CONTRACT='startup-intro-candidate.json';
export const WORKFLOWS=Object.freeze({
 '.github/workflows/academy-gold-cpp-module-1.yml':{'gold-gate':'content'},
 '.github/workflows/academy-gold-cpp-module-2-preflight.yml':{preflight:'preflight','module2-gold':'browser','module1-regression':'integration'},
 '.github/workflows/academy-gold-cpp-module-3-publication.yml':{publication:'publication'}
});
export const CI_PATHS=Object.freeze([CONTRACT,'tools/startup-intro-contract.mjs','tools/startup-intro-ci-route.mjs','tools/check-startup-intro-ci.mjs','tests/startup-intro-contract.test.mjs','tests/startup-intro-retention.test.mjs','tests/startup-intro-browser-check.mjs','tests/offline-first-browser-check.mjs','tests/ui1a-deterministic-public-manifest.test.mjs',...Object.keys(WORKFLOWS)]);
const hash=b=>createHash('sha256').update(b).digest('hex');
const git=(root,...a)=>execFileSync('git',a,{cwd:root,maxBuffer:256*1024*1024});
export function validateMetadata(c){
 assert.deepEqual(Object.keys(c).sort(),['schema','kind','baseCommit','implementationCommit','generation','productionPublication','officialRelease'].sort(),'Неизвестное поле контракта');
 assert.deepEqual(c,{schema:1,kind:'startup-intro-implementation-candidate',baseCommit:BASE,implementationCommit:IMPLEMENTATION,generation:GENERATION,productionPublication:false,officialRelease:false},'Неподтверждённая область кандидата');
}
const documentation=f=>f.startsWith('docs/evidence/startup-cinematic-20261028/')||/^docs\/ru\/07-ui\/STARTUP_CINEMATIC_INTRO_[A-Z_]+\.md$/.test(f);
const dependency=f=>f.startsWith('server-access/node_modules/')||f.startsWith('tools/qa-browser-driver/node_modules/')||f.startsWith('evidence-startup-intro/');
export function assertPathAllowed(file,{baseFiles,implementationFiles,ciFiles=new Set(CI_PATHS)}={}){
 assert.ok(baseFiles.has(file)||implementationFiles.has(file)||ciFiles.has(file)||documentation(file)||dependency(file),'Недопустимый новый файл: '+file);
}
export function assertExpectedBytes(file,actual,expected){assert.ok(Buffer.from(actual).equals(Buffer.from(expected)),'Изменён защищённый файл: '+file)}
export function routeWorkflow(original,lanes){
 const lines=original.replaceAll('\r\n','\n').split('\n');let job=null,steps=false,inserted=false,count=0;const out=[];
 for(let i=0;i<lines.length;i++){
  const line=lines[i],j=line.match(/^  ([a-z0-9-]+):$/);if(j){job=j[1];steps=false;inserted=false}
  if(line==='    steps:')steps=true;
  if(steps&&lanes[job]&&/^      - name:/.test(line)&&!inserted){
   const lane=lanes[job];
   out.push('      - name: Проверить отдельный контракт Intro без изменения допуска M5','        id: startup_intro','        run: node tools/startup-intro-ci-route.mjs','      - name: Node.js 24 для изолированной проверки Intro',"        if: steps.startup_intro.outputs.enabled == 'true'",'        uses: actions/setup-node@v4','        with:',"          node-version: '24'",'      - name: Приёмка Intro — '+lane,"        if: steps.startup_intro.outputs.enabled == 'true'",'        run: node tools/check-startup-intro-ci.mjs --lane '+lane,'      - name: Сохранить доказательства Intro — '+lane,"        if: always() && steps.startup_intro.outputs.enabled == 'true'",'        uses: actions/upload-artifact@v4','        with:','          name: startup-intro-'+lane+'-${{ github.sha }}','          path: evidence-startup-intro/'+lane+'/','          retention-days: 14');
   inserted=true;count++;
  }
  if(inserted&&/^      - /.test(line)){
   out.push(line);
   if(/^        if:/.test(lines[i+1]||'')){
    const condition=lines[++i].slice('        if:'.length).trim();
    assert.equal(condition,'always()','Нужен ручной review нового legacy condition');
    out.push("        if: always() && steps.startup_intro.outputs.enabled != 'true'");
   }else out.push("        if: steps.startup_intro.outputs.enabled != 'true'");
  }else out.push(line);
 }
 assert.equal(count,Object.keys(lanes).length,'Потерян ожидаемый job');return out.join('\n');
}
export async function verifyStartupIntroContract({root=ROOT,writeEvidence=false}={}){
 const c=JSON.parse(await readFile(path.join(root,CONTRACT)));validateMetadata(c);
 git(root,'merge-base','--is-ancestor',BASE,'HEAD');
 const rows=ref=>git(root,'ls-tree','-r','-z',ref).toString().split('\0').filter(Boolean).map(row=>{const m=row.match(/^(\d+) blob ([a-f0-9]+)\t(.+)$/s);assert.ok(m,'Разрешены только Git blobs');return{mode:m[1],sha:m[2],file:m[3]}});
 const baseRows=rows(BASE),baseFiles=new Set(baseRows.map(r=>r.file));
 const changed=git(root,'diff','--name-only',BASE,IMPLEMENTATION).toString().trim().split('\n').filter(f=>!documentation(f));
 assert.equal(changed.length,19,'Область проверенной реализации изменилась');const implementationFiles=new Set(changed),ciFiles=new Set(CI_PATHS);
 const tracked=git(root,'ls-files','-z').toString().split('\0').filter(Boolean),extra=git(root,'ls-files','--others','--exclude-standard','-z').toString().split('\0').filter(Boolean);
 for(const file of new Set([...tracked,...extra]))assertPathAllowed(file,{baseFiles,implementationFiles,ciFiles});
 const checks=[];
 for(const row of baseRows){
  if(implementationFiles.has(row.file)||ciFiles.has(row.file))continue;
  const b=await readFile(path.join(root,row.file));
  const blob=createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');assert.equal(blob,row.sha,'Изменён принятый файл: '+row.file);
 }
 for(const file of implementationFiles){
  if(ciFiles.has(file))continue;
  const expected=git(root,'show',IMPLEMENTATION+':'+file),actual=await readFile(path.join(root,file));assertExpectedBytes(file,actual,expected);checks.push({file,bytes:actual.length,sha256:hash(actual)});
 }
 for(const [file,lanes]of Object.entries(WORKFLOWS))assertExpectedBytes(file,await readFile(path.join(root,file)),Buffer.from(routeWorkflow(git(root,'show',BASE+':'+file).toString(),lanes)));
 const result={status:'PASS',baseCommit:BASE,implementationCommit:IMPLEMENTATION,head:git(root,'rev-parse','HEAD').toString().trim(),protectedFiles:baseRows.length-implementationFiles.size,implementationFiles:checks,ciPaths:CI_PATHS,publicationReceiptUnchanged:true,contentIdentityCloudPwaAndHistoricalAssetsUnchanged:true,productionPublication:false,officialRelease:false};
 if(writeEvidence){const dir=path.resolve(writeEvidence);await mkdir(dir,{recursive:true});await writeFile(path.join(dir,'CONTRACT.json'),JSON.stringify(result,null,2)+'\n')}
 return result;
}
