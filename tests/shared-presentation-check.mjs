// Runtime equivalence with the accepted renderer, including all RU/EN lessons.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {glossaryItems,richText,benchmarkMarkup} from '../core/lesson-presentation.js';
import {nexusShellMarkup} from '../core/shell-presentation.js';
import {memoryLabMarkup} from '../core/memory-lab.js';
import {oopLabMarkup} from '../core/oop-lab.js';
import {academyCatalogMarkup} from '../core/academy-catalog.js';
import {programmingHubMarkup} from '../core/code-hub-presentation.js';
import {learnerAcademyEntries} from '../core/academy-presentation.js';
import {textFor,translator} from '../core/i18n.js';
import {languageLabel} from '../sandbox/languages.js';
import {languageJourney,languageJourneyDialogMarkup} from '../core/nexus-language-journey.js';
const before=await readFile(new URL('../releases/ui1a-alpha10-offline-nav-20261021/core/app.js',import.meta.url),'utf8');
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const first=before.indexOf('function glossaryItems(l){'),drawer=before.indexOf('function glossaryDrawer(l){'),bench=before.indexOf('function benchmarkView(l){'),lesson=before.indexOf('function lessonView(id){');
assert.ok(first>0&&drawer>first&&bench>drawer&&lesson>bench);
let lessons=0;for(const locale of ['ru','en']){
 const data=JSON.parse(await readFile(new URL('../courses/cpp/data/lessons.'+locale+'.json',import.meta.url)));
 const baseline=new Function('e','prefs','memoryLabMarkup','oopLabMarkup',before.slice(first,drawer)+before.slice(bench,lesson)+';return {glossaryItems,richText,benchmarkView}')(e,{uiLocale:locale,courseLocale:locale},memoryLabMarkup,oopLabMarkup);
 for(const l of data.lessons){assert.deepEqual(glossaryItems(l),baseline.glossaryItems(l));assert.equal(richText(l.description,glossaryItems(l)),baseline.richText(l.description,baseline.glossaryItems(l)));assert.equal(benchmarkMarkup(l,{uiLocale:locale,locale}),baseline.benchmarkView(l));lessons++}
}
const shellStart=before.indexOf('function visualShell(body,active){'),shellEnd=before.indexOf('function nexusSculpture(){');
assert.ok(shellStart>0&&shellEnd>shellStart);
globalThis.location={hash:'#view=academy'};
for(const collapsed of [false,true])for(const active of ['home','academy','projects','labs','practices','offline']){
 const ctx={prefs:{sidebarCollapsed:collapsed,focusReading:false,uiLocale:'ru'},t:k=>k,route:()=>({view:active}),langSelect:(...v)=>v.join(' / '),fxSelect:()=>'<b>FX</b>',accountChipMarkup:()=>'<span>SYNTHETIC_VERIFIED_ACCOUNT_CHIP</span>',visualIcon:v=>v};
 const keys=Object.keys(ctx),baseline=new Function(...keys,'location','e',before.slice(shellStart,shellEnd)+';return visualShell')(...keys.map(k=>ctx[k]),location,e);
 // Сравнение со старым renderer допускает только объявленную смену номера выпуска.
 const version=JSON.parse(await readFile(new URL('../version.json',import.meta.url))).version;
 assert.equal(nexusShellMarkup('<p>SYNTHETIC_BODY &lt;x&gt;</p>',active,ctx),baseline('<p>SYNTHETIC_BODY &lt;x&gt;</p>',active).replaceAll('0.1.7-alpha.2.4.6-ui1a.10.1',version));
}
const app=await readFile(new URL('../core/app.js',import.meta.url),'utf8');
assert.ok(app.includes('nexusShellMarkup(body,active,{prefs,t,route,langSelect,fxSelect,accountChipMarkup,visualIcon})'));
assert.ok((await readFile(new URL('../core/learning-views.js',import.meta.url),'utf8')).includes('benchmarkMarkup(l,{uiLocale:prefs.uiLocale,locale:prefs.courseLocale})'));
console.log('PASS: shared online/offline shell byte-equivalent for 12 states; '+lessons+' lesson renderers byte-equivalent; online account callback retained');
const json=async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));
const cpp={manifest:await json('courses/cpp/manifest.json'),curriculum:await json('courses/cpp/curriculum.json'),practicumsRu:await json('courses/cpp/data/practicums.ru.json'),projectsRu:await json('courses/cpp/data/projects.ru.json')},catalog=await json('courses/catalog.json'),programming=await json('courses/programming/languages.json');
for(const locale of ['ru','en']){
 const prefs={uiLocale:locale,courseLocale:locale},t=translator(await json('locales/'+locale+'/ui.json'));
 const ctx={prefs,t,cpp,catalog,academyViewFilter:{category:'all',availability:'all',query:'SYNTHETIC <query>'},visualIcon:v=>v,e,textFor,learnerAcademyEntries,visualShell:body=>body};
 const keys=Object.keys(ctx),baseline=new Function(...keys,before.slice(before.indexOf('function academy(){'),before.indexOf('function bindAcademyView(){'))+';return academy')(...keys.map(k=>ctx[k]));
 assert.equal(academyCatalogMarkup(ctx),baseline());
 const hub={prefs,t,cpp,programming,progress:()=>({done:3,total:40,pct:8}),cppContinuation:()=>({href:'#course=cpp',mode:'continue'}),continuationNote:()=>'<p>SYNTHETIC_RESUME</p>',recentProjectsMarkup:()=>'<section>SYNTHETIC_OWN_PROJECTS</section>',visualIcon:v=>v};
 const dependencies={...hub,e,languageLabel,languageJourney,languageJourneyDialogMarkup,shell:body=>body};
 const names=Object.keys(dependencies),original=new Function(...names,before.slice(before.indexOf('function learningSearch('),before.indexOf('function practicumProgress('))+before.slice(before.indexOf('function programmingHub(){'),before.indexOf('function practicumData('))+';return programmingHub')(...names.map(k=>dependencies[k]));
 assert.equal(programmingHubMarkup(hub),original());
}
console.log('PASS: Academy catalog and Code Hub byte-equivalent with accepted online RU/EN renderers');
