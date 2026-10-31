import assert from'node:assert/strict';import fs from'node:fs/promises';import path from'node:path';
// Общий набор для HTTP и file://: ответы берутся из авторского test fixture,
// защищённым экзаменом этот локальный self-check не объявляется.
export async function checkFinalAssessments({page,base,record,out,cold=false}){
 const prefix=cold?'OFFLINE FINAL: ':'FINAL: ';
 for(const course of ['onec','1c-enterprise']){
  const spec=JSON.parse(await fs.readFile(new URL(`../courses/${course}/final-assessment.json`,import.meta.url))),key='akronikl:it-nexus:onec-final:v1:'+course;
  await page.goto(base+`#course=${course}&assessment=final`);await page.locator('[data-final-form]').waitFor();
  const before=await page.evaluate(()=>Object.fromEntries(['onec','1c-enterprise'].map(id=>[id,localStorage.getItem('akronikl:it-nexus:onec-candidate:v1:'+id)])));
  await record(prefix+course+' · 3 варианта RU/EN, черновики, попытки и портфолио',async()=>{
   for(const locale of ['ru','en'])for(const variant of spec.variants){
    await page.goto(base+`#course=${course}&locale=${locale}&assessment=final`);await page.locator('[data-final-form]').waitFor();await page.selectOption('[data-final-variant]',variant.id);
    assert.equal(await page.locator('[data-final-form] fieldset').count(),24);assert.equal(await page.locator('[data-final-project] option').count(),3);
    const answers=variant.questionIds.map(id=>spec.questions.find(q=>q.id===id).correct);
    for(const [i,a]of answers.entries())await page.check(`input[name="final-${i}"][value="${a}"]`);
    await page.waitForFunction(k=>{const s=JSON.parse(localStorage.getItem(k));return Object.values(s?.drafts||{}).some(d=>d.answers.every(a=>a>=0))},key);
    await page.locator('[data-final-form] button').click();await page.locator('[data-final-status]').filter({hasText:'24/24'}).waitFor();
    assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).attempts.at(-1).grade.codeVerifiedServer,key),false);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   }
   const note='synthetic work / восстановление / <img src=x onerror=window.__injected=true>';
   await page.locator('[data-final-portfolio]').fill(note);await page.waitForFunction(k=>Object.values(JSON.parse(localStorage.getItem(k)).drafts).some(d=>d.note.includes('<img')),key);
   const selected=await page.locator('[data-final-variant]').inputValue();await page.reload();await page.locator('[data-final-form]').waitFor();await page.selectOption('[data-final-variant]',selected);assert.equal(await page.locator('[data-final-portfolio]').inputValue(),note);
   await page.locator('[data-final-attest]').check();await page.locator('[data-final-save-portfolio]').click();await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).portfolios.length===1,key);
   await page.locator('[data-final-save-portfolio]').click();await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).portfolios.length===2,key);
   assert.equal(await page.evaluate(()=>window.__injected),undefined);
   const download=page.waitForEvent('download');await page.locator('[data-final-export]').click();const d=await download,file=path.join(out,`${cold?'OFFLINE_':''}${course}_FINAL_EXPORT.json`);await d.saveAs(file);const data=JSON.parse(await fs.readFile(file));assert.equal(data.attempts.length,6);assert.equal(data.portfolios.length,2);assert.equal(data.unsavedDraft.note,note);assert.ok(data.draftVersions.length>=24);assert.equal(data.portfolios[0].nativeVerified,false);
   for(const[id,raw]of Object.entries(before))assert.equal(await page.evaluate(id=>localStorage.getItem('akronikl:it-nexus:onec-candidate:v1:'+id),id),raw);
  });
 }
 await record(prefix+'ошибка quota и повреждённая история: исходник и несохранённое портфолио экспортируются',async()=>{
  await page.goto(base+'#course=onec&assessment=final');await page.locator('[data-final-form]').waitFor();
  const key='akronikl:it-nexus:onec-final:v1:onec',raw=await page.evaluate(k=>localStorage.getItem(k),key);
  await page.evaluate(()=>{window.__set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.includes(':onec-final:'))throw Error('synthetic quota');return window.__set.call(this,k,v)}});
  await page.locator('[data-final-portfolio]').fill('UNSAVED quota recovery');await page.locator('[data-final-status][data-error=true]').waitFor();assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),raw);
  await page.evaluate(k=>{Storage.prototype.setItem=window.__set;localStorage.setItem(k,'broken-history')},key);await page.reload();await page.locator('[data-final-form]').waitFor();await page.locator('[data-final-portfolio]').fill('UNSAVED damaged history');await page.locator('[data-final-attest]').check();await page.locator('[data-final-save-portfolio]').click();await page.locator('[data-final-status][data-error=true]').waitFor();assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),'broken-history');
  const download=page.waitForEvent('download');await page.locator('[data-final-export]').click();const d=await download,file=path.join(out,`${cold?'OFFLINE_':''}FINAL_RECOVERY_EXPORT.json`);await d.saveAs(file);const data=JSON.parse(await fs.readFile(file));assert.equal(data.savedHistoryUnavailable,true);assert.equal(data.unsavedDraft.note,'UNSAVED damaged history');await page.evaluate(({k,v})=>localStorage.setItem(k,v),{k:key,v:raw});
 });
}
