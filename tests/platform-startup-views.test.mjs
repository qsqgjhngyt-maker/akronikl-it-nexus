import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createLearningViews} from '../core/learning-views.js';
import {academyCatalogMarkup} from '../core/academy-catalog.js';
import {translator,textFor} from '../core/i18n.js';
import {createLearningResume} from '../core/nexus-learning-discovery.js';

const json=async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));
const catalog=await json('courses/catalog.json');
const outline={manifest:await json('courses/cpp/manifest.json'),curriculum:await json('courses/cpp/curriculum.json')};
const full={...outline};
for(const [key,file]of Object.entries({lessonsRu:'lessons.ru.json',lessonsEn:'lessons.en.json',practicumsRu:'practicums.ru.json',projectsRu:'projects.ru.json'}))full[key]=await json('courses/cpp/data/'+file);
const programming=await json('courses/programming/languages.json');
const academyViewFilter={category:'all',availability:'all',query:''};

for(const locale of ['ru','en']){
 const prefs={uiLocale:locale,courseLocale:locale,mentorLocale:locale},t=translator(await json('locales/'+locale+'/ui.json'));
 const state={courses:{cpp:{lessons:{}}},skills:{}};
 const deps={prefs,t,catalog,programming,loadState:()=>state,lessonState:()=>({}),visualIcon:()=>'',progress:()=>({done:0,total:40,pct:0}),cppContinuation:()=>createLearningResume({storage:null,principal:()=>'synthetic'}).continuation(outline,{})};
 test('Fresh Home renders with only the C++ outline ('+locale+')',()=>{
  assert.deepEqual(Object.keys(outline).sort(),['curriculum','manifest']);
  const markup=createLearningViews({...deps,cpp:outline}).home();
  assert.match(markup,/class="nexus-visual visual-home"/);
  assert.ok(markup.includes(textFor(outline.manifest.title,locale)));
  assert.ok(markup.includes('>'+outline.manifest.projectCount+'</strong>'));
  assert.ok(markup.includes(t('codeHub.cppSummary',{modules:outline.curriculum.sections.length,topics:outline.curriculum.lessons.length,practicums:outline.manifest.practicumCount,projects:outline.manifest.projectCount})));
  assert.equal(markup,createLearningViews({...deps,cpp:full}).home(),'Loading lesson bodies must not change Home content');
 });
 test('Fresh Academy renders the same C++ card before and after the full course ('+locale+')',()=>{
  const render=cpp=>academyCatalogMarkup({...deps,cpp,academyViewFilter});
  const markup=render(outline);
  assert.match(markup,/data-visual-academy/);
  assert.match(markup,/class="academy-hub-reference" href="#course=cpp"/);
  assert.ok(markup.includes(textFor(outline.manifest.title,locale)));
  assert.equal(markup,render(full));
 });
 test('Opening C++ retains the complete overview, lessons, practicums and projects ('+locale+')',()=>{
  const views=createLearningViews({...deps,cpp:full});
  assert.equal((views.overview().match(/class="topic(?: done)?\s*"/g)||[]).length,outline.curriculum.lessons.length);
  assert.match(views.lessonView(outline.curriculum.lessons[0].id),/id="editor"/);
  assert.equal((views.practicums().match(/data-practicum-progress/g)||[]).length,outline.manifest.practicumCount);
  assert.equal((views.projectsView().match(/class="project-card-rich/g)||[]).length,outline.manifest.projectCount);
 });
}
