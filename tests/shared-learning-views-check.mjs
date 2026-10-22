import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createLearningViews} from '../core/learning-views.js';
import {translator} from '../core/i18n.js';
import {createLearningResume} from '../core/nexus-learning-discovery.js';
import {projectStudioDashboardMarkup,projectStudioViewMarkup} from '../project-studio/project-presentation.js';
const json=async f=>JSON.parse(await readFile(new URL('../'+f,import.meta.url)));
const cpp={};for(const [key,f]of Object.entries({manifest:'manifest.json',curriculum:'curriculum.json',lessonsRu:'data/lessons.ru.json',lessonsEn:'data/lessons.en.json',practicumsRu:'data/practicums.ru.json',projectsRu:'data/projects.ru.json'}))cpp[key]=await json('courses/cpp/'+f);
const catalog=await json('courses/catalog.json'),programming=await json('courses/programming/languages.json');let count=0;
for(const locale of ['ru','en']){
 const t=translator(await json('locales/'+locale+'/ui.json')),prefs={uiLocale:locale,courseLocale:locale,mentorLocale:locale},state={courses:{cpp:{lessons:{}}},skills:{}},deps={prefs,t,cpp,catalog,programming,loadState:()=>state,lessonState:id=>state.courses.cpp.lessons[id]||{},visualIcon:()=>'',progress:()=>({done:0,total:40,pct:0}),cppContinuation:()=>createLearningResume({storage:null,principal:()=>'synthetic'}).continuation(cpp,{})};
 const views=createLearningViews(deps);
 for(const [name,arg]of [['home'],['programmingHub'],['overview'],['practicums'],['projectsView'],...cpp.curriculum.lessons.map(l=>['lessonView',l.id]),...cpp.practicumsRu.practicums.map(p=>['practicumView',p.id])]){
  const markup=views[name](arg);assert.ok(markup.length>100);assert.ok(!markup.includes('[object Object]'));count++;
 }
}
const p={id:'synthetic-parity',title:'<img src=x onerror=alert(1)>',workspace:{files:[{path:'main.cpp',content:'int main(){}'}],entryFile:'main.cpp'},progress:{},checkpoints:[]};
assert.ok(projectStudioViewMarkup({project:p,localMode:true}).includes('&lt;img'));assert.ok(projectStudioDashboardMarkup({projects:[p],localMode:true}).includes('disabled title="Требуется подключение'));
console.log('PASS actual ESM and '+count+' renders of the common Home/learning/practice views in RU/EN; escaped Project Studio and offline Cloud disabled');
