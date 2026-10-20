import assert from 'node:assert/strict';
export async function communityBrowserScenarios({owner,tester,testerId,f,origin,check}){
 const queue=id=>owner.page.locator('[data-conversation="'+id+'"]').locator('..').locator('..');
 async function submit(kind,body){
  await tester.page.goto(origin+'/#view=feedback');await tester.page.locator('[data-feedback-mine]').waitFor();
  await tester.page.locator('[data-feedback-open="'+kind+'"]').first().click();
  const form=tester.page.locator('dialog[open] [data-feedback-form]');
  await form.locator('[name=body]').fill(body);
  if(kind==='review'){await form.locator('[name=publicName]').fill('Synthetic Reviewer');await form.locator('[name=consent]').check();await form.locator('[name=rating][value="5"]').check()}
  await form.locator('button[type=submit]').waitFor({state:'visible'});
  await form.locator('button[type=submit]').click();
  await tester.page.waitForFunction(()=>document.querySelector('[data-form-result]')?.textContent.startsWith('Сохранено на сервере.'));
  await tester.page.locator('[data-dialog-close]').click();
  return f.db.prepare('SELECT id FROM feedback_items WHERE author_id=? AND kind=? ORDER BY created_at DESC LIMIT 1').get(testerId,kind).id;
 }
 let messageId,reviewId;
 await check('sidebar administration is server-gated; team receives and answers a real user question',async()=>{
  await owner.page.goto(origin+'/#view=home');
  await owner.page.locator('.side-nav [data-team-navigation]').waitFor();
  await tester.page.goto(origin+'/#view=home');await tester.page.locator('.side-nav').waitFor();
  await tester.page.waitForTimeout(100);
  assert.equal(await tester.page.locator('.side-nav [data-team-navigation]').count(),0);
  messageId=await submit('message','SYNTHETIC_BROWSER_QUESTION_ONLY');
  await owner.page.goto(origin+'/#view=admin&tab=feedback');
  await owner.page.locator('[data-feedback-moderation] [data-queue-list]').waitFor();
  await queue(messageId).locator('[data-conversation]').click();
  const dialog=owner.page.locator('[data-community-dialog][open]');
  await dialog.locator('[name=body]').fill('SYNTHETIC_BROWSER_TEAM_REPLY_ONLY');
  await dialog.locator('button[type=submit]').click();
  await dialog.getByText('Ответ отправлен.',{exact:true}).waitFor();
  assert.equal(f.db.prepare('SELECT is_team FROM feedback_replies WHERE item_id=?').get(messageId).is_team,1);
  await dialog.locator('[data-close]').click();
  await tester.page.reload();await tester.page.locator('[data-conversation="'+messageId+'"]').click();
  const received=tester.page.locator('[data-community-dialog][open]');
  await received.getByText('SYNTHETIC_BROWSER_TEAM_REPLY_ONLY',{exact:true}).waitFor();
  assert.match(await received.innerText(),/Команда Nexus/);
  await received.locator('[data-close]').click();
 });
 await check('user can cancel deletion then delete its whole message and private thread',async()=>{
  await tester.page.locator('[data-feedback-delete="'+messageId+'"]').click();
  await tester.page.locator('[data-community-dialog] [data-close]').click();
  assert.ok(f.db.prepare('SELECT id FROM feedback_items WHERE id=?').get(messageId));
  await tester.page.locator('[data-feedback-delete="'+messageId+'"]').click();
  await tester.page.locator('[data-confirm-delete]').click();
  await tester.page.waitForFunction(id=>!document.querySelector('[data-feedback-item="'+id+'"]'),messageId);
  assert.equal(f.db.prepare('SELECT count(*) n FROM feedback_replies WHERE item_id=?').get(messageId).n,0);
  assert.equal(f.db.prepare('SELECT count(*) n FROM feedback_revisions WHERE item_id=?').get(messageId).n,0);
 });
 await check('moderator approves and features a consented review; author deletion removes public selection',async()=>{
  reviewId=await submit('review','SYNTHETIC_BROWSER_REVIEW_SELECTION_ONLY');
  await owner.page.locator('[data-queue-refresh]').click();
  await queue(reviewId).locator('[data-decision=approve]').click();
  let decision=owner.page.locator('dialog[open]');await decision.locator('button[type=submit]').click();
  await queue(reviewId).locator('[data-decision=feature]').waitFor();
  await queue(reviewId).locator('[data-decision=feature]').click();
  decision=owner.page.locator('dialog[open]');await decision.locator('button[type=submit]').click();
  await queue(reviewId).locator('[data-decision=unfeature]').waitFor();
  await tester.page.goto(origin+'/#view=home');
  await tester.page.locator('[data-home-reviews]').getByText('SYNTHETIC_BROWSER_REVIEW_SELECTION_ONLY',{exact:true}).waitFor();
  assert.ok(await tester.page.locator('[data-home-reviews] .feedback-card').count()<=3);
  await tester.page.goto(origin+'/#view=feedback');await tester.page.locator('[data-feedback-delete="'+reviewId+'"]').click();await tester.page.locator('[data-confirm-delete]').click();
  await tester.page.waitForFunction(id=>!document.querySelector('[data-feedback-item="'+id+'"]'),reviewId);
  await tester.page.goto(origin+'/#view=home');await tester.page.locator('#visualHomeTitle').waitFor();
  await tester.page.waitForTimeout(100);
  assert.equal(await tester.page.getByText('SYNTHETIC_BROWSER_REVIEW_SELECTION_ONLY',{exact:true}).count(),0);
 });
 await check('content editor saves a private draft, previews text safely, then publishes the blog article',async()=>{
  await owner.page.goto(origin+'/#view=admin&tab=content');
  await owner.page.locator('[data-content-editor] [data-home-form]').waitFor();
  await owner.page.locator('[data-content-new]').click();
  const form=owner.page.locator('[data-content-editor] form');
  await form.locator('[name=slug]').fill('synthetic-browser-story');
  await form.locator('[name=title]').fill('Синтетическая заметка');
  await form.locator('[name=summary]').fill('Новый блог Nexus');
  await form.locator('[name=body]').fill('<img src=x onerror="window.UNSAFE_CONTENT=true">\nСинтетическая статья');
  await form.locator('[data-preview]').click();
  assert.equal(await owner.page.locator('[data-content-preview] img').count(),0);
  await form.locator('button[type=submit]').click();
  await owner.page.locator('[data-content-editor] [data-publish]').waitFor();
  await tester.page.goto(origin+'/#view=blog');await tester.page.getByText('Скоро здесь появятся первые статьи команды.',{exact:true}).waitFor();
  owner.page.once('dialog',d=>d.accept());await owner.page.locator('[data-content-editor] [data-publish]').click();
  await owner.page.getByText('Опубликовано.',{exact:true}).waitFor();
  await tester.page.reload();await tester.page.getByText('Синтетическая заметка',{exact:true}).waitFor();
  await tester.page.getByRole('link',{name:'Читать статью',exact:true}).click();
  await tester.page.getByText('Синтетическая статья',{exact:false}).waitFor();
  assert.equal(await tester.page.locator('[data-blog-feed] img').count(),0);
  assert.equal(await tester.page.evaluate(()=>window.UNSAFE_CONTENT),undefined);
 });
 await check('homepage text has independent draft/publication; ordinary user cannot enter content editor',async()=>{
  await owner.page.locator('[data-content-home]').click();
  const form=owner.page.locator('[data-home-form]');await form.locator('[name=title]').fill('Nexus · синтетическая проверка');
  await form.locator('button[type=submit]').click();await owner.page.getByText('Изменение сохранено.',{exact:true}).waitFor();
  await tester.page.goto(origin+'/#view=home');await tester.page.locator('#visualHomeTitle').waitFor();
  assert.notEqual(await tester.page.locator('#visualHomeTitle').innerText(),'Nexus · синтетическая проверка');
  owner.page.once('dialog',d=>d.accept());await owner.page.locator('[data-home-form] [data-publish]').click();await owner.page.getByText('Опубликовано.',{exact:true}).waitFor();
  await tester.page.reload();await tester.page.getByRole('heading',{name:'Nexus · синтетическая проверка',exact:true}).waitFor();
  await tester.page.goto(origin+'/#view=admin&tab=content');
  await tester.page.getByText('Этот раздел доступен только команде Nexus.',{exact:true}).waitFor();
  assert.equal(await tester.page.locator('[data-content-editor]').count(),0);
  await owner.page.goto(origin+'/#view=account&tab=admin');
  await owner.page.locator('[data-admin-users] tr').first().waitFor();
 });
}
