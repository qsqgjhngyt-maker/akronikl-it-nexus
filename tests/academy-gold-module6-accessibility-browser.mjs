// Настоящие клавиши → HTML accessibility proxy → Qt/C++; тест не вызывает click/model из JS.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {module6ApplicationFixture} from './academy-gold-module6-fixture.mjs';
const out=path.resolve(process.env.NEXUS_M6_EVIDENCE);await mkdir(out,{recursive:true});
const f=await module6ApplicationFixture({chromiumArgs:['--enable-unsafe-swiftshader','--use-angle=swiftshader']}),p=f.page;
const m=JSON.parse(await readFile(path.join(process.env.NEXUS_FRONTEND_DIR,'BUILD_MANIFEST.json'))),prefix='/releases/'+m.assetGeneration;
const gold=JSON.parse(await readFile('courses/cpp/gold/events/application-build-delivery.en.json'));
const files={...gold.laboratory.referenceFiles,'src/gui.cpp':gold.laboratory.referenceCode},checks=[];let fatal;
const check=async(name,fn)=>{await fn();checks.push({name,status:'PASS'});console.log('PASS '+name);};
try{
 await p.goto(f.origin+'/#view=home');await p.locator('.visual-home').waitFor();await f.waitReady();
 await p.evaluate(async({prefix,files})=>{const{createProject}=await import(prefix+'/project-studio/project-store.js'),{taskFlowApplicationTemplate}=await import(prefix+'/project-studio/application-template.js');createProject({...taskFlowApplicationTemplate(),id:'synthetic-qt-accessibility',files:Object.entries(files).map(([path,content])=>({path,content,languageId:'cpp'}))})},{prefix,files});
 await p.evaluate(()=>location.hash='#view=project-studio&project=synthetic-qt-accessibility');await p.locator('#editor').waitFor();await p.waitForFunction(()=>!document.querySelector('#runCode')?.disabled);await p.locator('#runCode').click();
 const iframe=p.locator('.nexus-application-panel iframe');await iframe.waitFor({timeout:180000});const frame=await(await iframe.elementHandle()).contentFrame();
 const input=frame.getByRole('textbox',{name:'Task title',exact:true});await input.waitFor({timeout:120000});
 const waitLog=text=>p.waitForFunction(text=>document.querySelector('[data-app="log"]')?.textContent.includes(text),text,{timeout:10000});
 for(const [i,title] of ['alpha','beta'].entries()){await input.fill(title);await frame.getByRole('button',{name:'Add task',exact:true}).press('Enter');await waitLog('NEXUS_TASKS '+(i+1));}
 await frame.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await iframe.screenshot({path:path.join(out,'before-selection.png')});
 const contents=frame.locator('.qt-window-contents').first(),list=await frame.getByText('Tasks',{exact:true}).boundingBox(),client=await contents.boundingBox();await contents.click({position:{x:list.x-client.x+12,y:list.y-client.y+12}});await frame.getByRole('button',{name:'Complete selected',exact:true}).press('Enter');await waitLog('NEXUS_VIEW 2 OPEN 1 DONE 1');
 const filter=frame.getByRole('checkbox',{name:'Open tasks only',exact:true});
 const latest=async()=>(await p.locator('[data-app="log"]').textContent()).split('\n').filter(s=>s.startsWith('NEXUS_VIEW')).at(-1);
 const waitView=expected=>p.waitForFunction(expected=>document.querySelector('[data-app="log"]')?.textContent.split('\n').filter(s=>s.startsWith('NEXUS_VIEW')).at(-1)===expected,expected,{timeout:10000});
 await check('Именованный контрол: Space и Enter вызывают C++ ровно по одному разу',async()=>{
  await filter.focus();await filter.press('Space');await waitView('NEXUS_VIEW 1 OPEN 1 DONE 1');assert.equal(await filter.isChecked(),true);
  await filter.press('Enter');await waitView('NEXUS_VIEW 2 OPEN 1 DONE 1');assert.equal(await filter.isChecked(),false);
  await filter.press('Space');await waitView('NEXUS_VIEW 1 OPEN 1 DONE 1');
 });
 await check('Фокус видим и следует геометрии контрола при390/1366',async()=>{
  for(const width of [390,1366]){await p.setViewportSize({width,height:900});await iframe.scrollIntoViewIfNeeded();await filter.focus();
   const ring=frame.locator('[data-nexus-a11y-focus]');await ring.waitFor({state:'visible'});const a=await filter.boundingBox(),b=await ring.boundingBox();assert.ok(a&&b);for(const k of ['x','y','width','height'])assert.ok(Math.abs(a[k]-b[k])<2,k);
   await iframe.screenshot({path:path.join(out,'keyboard-focus-'+width+'.png')});
  }
 });
 await check('Удержание и Ctrl+Space не меняют модель/фильтр повторно',async()=>{
  await filter.focus();await p.keyboard.down('Space');await waitView('NEXUS_VIEW 2 OPEN 1 DONE 1');await p.keyboard.down('Space');await p.keyboard.up('Space');await p.waitForTimeout(100);assert.equal(await latest(),'NEXUS_VIEW 2 OPEN 1 DONE 1');
  await filter.press('Control+Space');assert.equal(await latest(),'NEXUS_VIEW 2 OPEN 1 DONE 1');
 });
 await check('После blur рамка убрана; pointer по-прежнему вызывает Qt',async()=>{
  await input.focus();assert.equal(await frame.locator('[data-nexus-a11y-focus]').isVisible(),true);const a=await filter.boundingBox(),b=await contents.boundingBox();await contents.click({position:{x:a.x-b.x+a.width/2,y:a.y-b.y+a.height/2}});await waitView('NEXUS_VIEW 1 OPEN 1 DONE 1');
  await p.locator('[data-app="stop"]').focus();await frame.locator('[data-nexus-a11y-focus]').waitFor({state:'hidden'});
 });
 await check('После фильтра complete использует id2, обе задачи остаются в модели',async()=>{
  const a=await frame.getByText('Tasks',{exact:true}).boundingBox(),b=await contents.boundingBox();await contents.click({position:{x:a.x-b.x+12,y:a.y-b.y+12}});await frame.getByRole('button',{name:'Complete selected',exact:true}).press('Enter');await waitView('NEXUS_VIEW 0 OPEN 0 DONE 2');
 });
 assert.deepEqual(f.errors,[]);
}catch(e){fatal={message:e.message,stack:String(e.stack).slice(0,3000)};console.error(e);}
finally{const safe=s=>String(s).replace(/(\/artifacts\/[a-f0-9-]+\/)[a-f0-9]{64}/g,'$1[redacted]');const result={status:!fatal&&!f.errors.length&&checks.length===5?'PASS':'FAIL',checks,fatal:fatal?{message:safe(fatal.message),stack:safe(fatal.stack)}:undefined,browserErrors:f.errors.map(safe),testGeneratedClick:false,realQtCpp:true,syntheticAccount:true,productionRequests:0,physicalDevices:false};await writeFile(path.join(out,'ACCESSIBILITY.json'),JSON.stringify(result,null,2)+'\n');await f.close();console.log(JSON.stringify(result));if(result.status!=='PASS')process.exitCode=1;}
