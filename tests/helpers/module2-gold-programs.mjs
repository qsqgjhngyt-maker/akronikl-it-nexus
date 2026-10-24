// Исполняемые контракты берутся из самих учебных объектов, без копии эталонов.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GOLD_BASICS_LESSONS,goldLessonPath} from '../../core/academy-gold-catalog.js';
export async function module2GoldLessons(){const result=[];for(const id of GOLD_BASICS_LESSONS)for(const locale of ['ru','en'])result.push(JSON.parse(await readFile(new URL('../../'+goldLessonPath(id,locale),import.meta.url),'utf8')));return result;}
export async function module2GoldPrograms(){
 const unique=new Map();
 function add(g,part,source,cases,expectation='exact'){
  assert.equal(typeof source,'string',g.lessonId+': '+part);assert.ok(source.includes('int main('));
  const sourceSha256=createHash('sha256').update(source).digest('hex');
  const key=sourceSha256+':'+expectation,alias={lesson:g.lessonId,locale:g.locale,part};
  if(unique.has(key)){const found=unique.get(key);assert.deepEqual(found.cases,cases,'RU/EN contract mismatch: '+part);found.aliases.push(alias);}
  else unique.set(key,{id:g.lessonId.slice(4)+'-'+part,source,sourceSha256,cases,expectation,aliases:[alias]});
 }
 function variants(g,part,source,items=[]){for(const v of items){let code=source;for(const {from,to}of v.replace){assert.ok(code.includes(from)&&code.indexOf(from)===code.lastIndexOf(from),'Ambiguous variant: '+part+' '+v.id);code=code.replace(from,to);}add(g,part+'-'+v.id,code,[{stdin:v.stdin,stdout:v.stdout}]);}}
 for(const g of await module2GoldLessons()){
  for(const e of g.workedExamples){add(g,'example-'+e.id,e.code,[{stdin:e.stdin,stdout:e.expectedStdout},...(e.cases||[])],e.verification?.kind||'exact');variants(g,'example-'+e.id,e.code,e.verificationVariants);}
  for(const [part,a]of [['lab',g.laboratory],['practicum',g.blockPracticum],['project',g.modulePracticum]])if(a){
   add(g,part+'-starter',a.starterCode,[{stdin:a.cases[0].stdin,stdout:a.starterExpectedStdout}]);
   add(g,part+'-reference',a.referenceCode,a.cases.map(({stdin,stdout})=>({stdin,stdout})));variants(g,part,a.referenceCode,a.verificationVariants);
  }
  for(const n of g.diagnosticExamples||[])add(g,'diagnostic-'+n.id,n.code,[{stdin:'',stdout:''}],'compile-error');
 }
 return [...unique.values()];
}
export function matchesGoldOutput(p,actual,c){
 if(p.expectation!=='type-layout')return actual===c.stdout;
 const fields=actual.trim().split('\n').map(s=>s.split('='));
 const keys=['char_bytes','char_bits','int_bytes','long_bytes','long_long_bytes','pointer_bytes','char_signed','int_digits','int_max'];
 if(fields.length!==keys.length||fields.some(([k,v],i)=>k!==keys[i]||!/^\d+$/.test(v)))return false;
 const n=Object.fromEntries(fields.map(([k,v])=>[k,Number(v)]));
 const max=BigInt(fields.find(([k])=>k==='int_max')[1]);
 return n.char_bytes===1&&n.char_bits>=8&&n.int_bytes>=1&&n.long_bytes>=n.int_bytes&&n.long_long_bytes>=n.long_bytes&&n.pointer_bytes>=1&&[0,1].includes(n.char_signed)&&n.int_digits>=15&&max>=32767n&&n.int_digits<n.int_bytes*n.char_bits&&max===2n**BigInt(n.int_digits)-1n;
}
