import assert from 'node:assert/strict';
export async function assistantPreferencesBrowserScenarios({owner,tester,f,check}){
 const open=async page=>{await page.locator('[data-akronikl-open]:visible,#askAkronikl:visible').first().click();await page.locator('[data-akronikl-panel] [data-ak-state-sync][data-state=saved]').waitFor();return page.locator('[data-akronikl-panel]')};
 const model=async p=>{await p.locator('[data-akronikl-settings]').click();await p.locator('[aria-controls=ak-settings-model]').click()};
 await check('assistant close/reopen and reload preserve model/mode/theme and resume without another verification call',async()=>{
  const before=f.modelCalls();let p=await open(tester.page);await model(p);await p.locator('[data-akronikl-model-profile]').selectOption('external');await p.locator('[data-ak-cloud-model]').fill('Qwen3.8-Max');await p.locator('[data-ak-cloud-model]').blur();await p.locator('[data-ak-cloud-connect]').click();await p.locator('[data-akronikl-connection-status][data-connection-phase=connected]').waitFor();assert.equal(f.modelCalls(),before+1);
  await p.locator('[data-ak-chat-mode]').uncheck();await p.locator('[aria-controls=ak-settings-basics]').click();await p.locator('[data-ak-theme-select]').selectOption('dark');await p.locator('[data-ak-state-sync][data-state=saved]').waitFor();
  // Headless Chrome does not expose native tab visibility. Exercise the exact browser events and account recheck.
  await tester.page.evaluate(()=>{const panel=document.querySelector('[data-akronikl-panel]');panel.dataset.visibilitySentinel='same-panel';Object.defineProperty(document,'hidden',{configurable:true,value:true});Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal(await p.count(),1);assert.equal(await p.getAttribute('data-visibility-sentinel'),'same-panel');assert.equal(await p.locator('#ak-settings-basics').isVisible(),true);
  const rechecked=tester.page.waitForResponse(r=>new URL(r.url()).pathname==='/api/v2/account'&&r.status()===200);
  await tester.page.evaluate(()=>{delete document.hidden;delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'));});await rechecked;
  assert.equal(await p.getAttribute('data-visibility-sentinel'),'same-panel');assert.equal(await p.locator('#ak-settings-basics').isVisible(),true);assert.equal(await p.locator('[data-ak-theme-select]').inputValue(),'dark');assert.equal(f.modelCalls(),before+1);
  await p.locator('[data-akronikl-close]').click();await tester.page.locator('[data-akronikl-panel]').waitFor({state:'detached'});
  for(const reload of [false,true]){if(reload)await tester.page.reload();p=await open(tester.page);assert.equal(await p.getAttribute('data-ak-theme'),'dark');await model(p);assert.equal(await p.locator('[data-akronikl-model-profile]').inputValue(),'external');assert.equal(await p.locator('[data-ak-cloud-model]').inputValue(),'qwen3.8-max');assert.equal(await p.locator('[data-ak-chat-mode]').isChecked(),false);await p.locator('[data-akronikl-connection-status][data-connection-phase=connected]').waitFor();assert.equal(f.modelCalls(),before+1);await p.locator('[data-akronikl-close]').click();}
  const own=await open(owner.page);assert.equal(await own.getAttribute('data-ak-theme'),'auto');await model(own);assert.equal(await own.locator('[data-akronikl-model-profile]').inputValue(),'sources');await own.locator('[data-akronikl-close]').click();assert.equal(f.modelCalls(),before+1);
 });
}
