import assert from 'node:assert/strict';

// Нативная клавиатура и AX tree; только синтетические страницы вызывающего fixture.
export async function checkGlossaryDrawer(page,{cdp,probeTree=false}={}){
 const drawer=page.locator('#termDrawer'),search=drawer.locator('#termSearch');
 const title=await drawer.locator('#termDrawerTitle').textContent();
 const ax=async()=>{
  const {nodes}=await cdp.send('Accessibility.getFullAXTree');
  return nodes.filter(n=>!n.ignored&&n.role?.value==='dialog'&&n.name?.value===title).length;
 };
 const closed=async()=>{
  assert.equal(await drawer.evaluate(d=>!d.open&&d.hidden&&d.inert&&d.getAttribute('aria-hidden')==='true'),true);
  assert.equal(await drawer.isVisible(),false);
  assert.equal(await search.evaluate(n=>{n.focus();return document.activeElement===n}),false,'Скрытый поиск не получает focus');
  if(probeTree)assert.equal(await ax(),0,'Скрытый словарь отсутствует в AX tree');
 };
 const opened=async trigger=>{
  assert.equal(await drawer.evaluate(d=>d.open&&!d.hidden&&!d.inert&&d.matches(':modal')),true);
  assert.equal(await search.evaluate(n=>n===document.activeElement),true);
  assert.equal(await trigger.getAttribute('aria-expanded'),'true');
  assert.equal(await trigger.getAttribute('aria-controls'),'termDrawer');
  assert.equal(await page.evaluate(()=>{document.querySelector('#editor').focus();return document.activeElement.id}),'termSearch','Фон не перехватывает focus');
  if(probeTree)assert.equal(await ax(),1,'У диалога есть доступное имя');
 };
 await closed();
 for(const id of ['openTerms','openTermsHead']){
  const trigger=page.locator('#'+id);await trigger.focus();await page.keyboard.press('Enter');await opened(trigger);
  const term=await drawer.locator('[data-term-card] code').first().textContent();await search.fill(term);
  const visible=drawer.locator('[data-term-card]:visible');assert.ok(await visible.count()>0);
  assert.ok((await visible.allTextContents()).every(text=>text.toLowerCase().includes(term.toLowerCase())));
  await search.fill('SYNTHETIC_NO_TERM_MATCH');assert.equal(await visible.count(),0);assert.match(await drawer.locator('#termStatus[role="status"]').textContent(),/не найдены|No terms found/);
  await search.fill('');assert.ok(await visible.count()>0);
  // Внутри три focus targets: закрыть, поиск и прокручиваемая область терминов.
  for(const key of ['Tab','Tab','Tab','Tab','Tab','Shift+Tab']){
   await page.keyboard.press(key);const focus=await drawer.evaluate(d=>({within:d.contains(document.activeElement),documentFocused:document.hasFocus(),active:document.activeElement?.id||document.activeElement?.tagName}));
   // Нативный dialog оставляет доступной адресную строку браузера; фон страницы — inert.
   assert.ok(focus.within||!focus.documentFocused,JSON.stringify({key,...focus}));
  }
  await search.focus();
  await page.keyboard.press('Escape');await closed();assert.equal(await trigger.evaluate(n=>n===document.activeElement),true);
  await trigger.click();await opened(trigger);await drawer.locator('#closeTerms').click();await closed();assert.equal(await trigger.evaluate(n=>n===document.activeElement),true);
 }
 const trigger=page.locator('#openTerms');await trigger.click();await opened(trigger);
 const rect=await drawer.boundingBox();assert.ok(rect.x>0);await page.mouse.click(1,Math.min(200,page.viewportSize().height/2));await closed();
 assert.equal(await trigger.evaluate(n=>n===document.activeElement),true);
 const linked=page.locator('.term-link[data-term]').first();let termLink=false;
 if(await linked.count()){
  const term=await linked.getAttribute('data-term');await linked.focus();await page.keyboard.press('Enter');
  assert.equal(await search.inputValue(),term);await page.keyboard.press('Escape');await closed();assert.equal(await linked.evaluate(n=>n===document.activeElement),true);termLink=true;
 }
 return {title,termLink,axProbe:probeTree,closedHiddenInert:true,focusAndKeyboard:true,search:true,headerAndFloatingTriggers:true,backdrop:true};
}
