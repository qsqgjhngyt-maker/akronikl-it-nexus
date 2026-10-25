// Смена языка через реальный учебный переключатель, без правки storage.
export async function goldLessonRoute(p,id,locale){
 const frame=()=>p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await frame();
 if(await p.locator('#courseLocale').getAttribute('data-value')!==locale){
  await p.evaluate(()=>{location.hash='#view=home'});await p.locator('.visual-home').waitFor();await frame();
  await p.evaluate(()=>scrollTo({top:0,left:0,behavior:'instant'}));await frame();
  const settings=p.locator('#visualSettings');if(await settings.getAttribute('open')===null)await settings.locator('summary').click();
  await p.locator('#courseLocale').scrollIntoViewIfNeeded();await frame();await p.locator('#courseLocale').focus();
  await p.evaluate(()=>scrollTo({top:0,left:0,behavior:'instant'}));await frame();
  await p.keyboard.press('ArrowDown');await p.keyboard.press(locale==='ru'?'Home':'End');await p.keyboard.press('Enter');
  await p.waitForFunction(locale=>document.querySelector('#courseLocale')?.dataset.value===locale,locale);
  if(await settings.getAttribute('open')!==null)await settings.locator('summary').click();
 }
 await p.evaluate(id=>{location.hash='#course=cpp&lesson='+id},id);
 await p.locator('[data-gold-lesson="'+id+'"][lang="'+locale+'"]').waitFor();await frame();
}
