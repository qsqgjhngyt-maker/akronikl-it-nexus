import fs from 'node:fs';
import {createProject,ensureTemplateProject,getProject,createCheckpoint,restoreCheckpoint,toggleProjectMilestone,listProjects,projectStorageKey} from '../project-studio/project-store.js';
import {cppCourseProjectTemplate,blankCppProjectTemplate} from '../project-studio/project-templates.js';
import {projectStudioDashboardMarkup,projectStudioViewMarkup} from '../project-studio/project-studio.js';
import {createCodeWorkspace} from '../sandbox/code-workspace.js';
import {normalizeRuntimeRequest,runtimeProjectFileCount} from '../sandbox/provider-contract.js';
import {browserRuntimeProvider} from '../sandbox/providers/browser-runtime.js';
import {wasmRuntimeProvider} from '../sandbox/providers/wasm-runtime.js';

const assert=(value,message)=>{if(!value)throw new Error(message)};
const mem=new Map();globalThis.localStorage={getItem:key=>mem.has(key)?mem.get(key):null,setItem:(key,value)=>mem.set(key,String(value)),removeItem:key=>mem.delete(key),clear:()=>mem.clear()};
assert(projectStorageKey()==='akronikl:it-nexus:projects:v1','Project store key changed unexpectedly');

const courseDef={id:'finance',title:'Домашняя бухгалтерия',pitch:'Учёт операций',starter:'#include <iostream>\nint main(){std::cout<<"Finance\\n";return 0;}\n',milestones:[{t:'1. Модель',d:'Описание'},{t:'2. Ядро',d:'Код'}],features:[],result:'Рабочая программа'};
const tpl=cppCourseProjectTemplate(courseDef);
const project=ensureTemplateProject(tpl);
assert(project.origin.templateKey==='cpp-course:finance','Course template identity missing');
assert(project.manifest.entryFile==='src/main.cpp','Project manifest entry file mismatch');
assert(project.workspace.files.some(x=>x.path==='src/main.cpp'),'Nested src entry file missing');
assert(project.workspace.files.some(x=>x.path==='include/project.hpp'),'Include folder foundation missing');
assert(project.workspace.files.some(x=>x.path==='tests/project_tests.cpp'),'Tests folder foundation missing');
const again=ensureTemplateProject(tpl);assert(again.id===project.id,'Opening course project twice must resume same Project Studio project');

toggleProjectMilestone(project.id,1,true);let changed=getProject(project.id);assert(changed.progress.milestones.includes(1),'Milestone progress did not persist');
changed.workspace.files.find(x=>x.path==='src/main.cpp').content='BROKEN';
changed=createProject({...blankCppProjectTemplate('Scratch'),id:'scratch-foundation'});assert(changed.id==='scratch-foundation','Blank project creation failed');

let live=getProject(project.id);live.workspace.files.find(x=>x.path==='src/main.cpp').content='VERSION_A';
// persist the edited workspace using the public create/put flow via checkpoint precursor
import('../project-studio/project-store.js').then(()=>{});
// Re-use checkpoint on current stored project first, then verify restore through a persisted workspace mutation.
const cp1=createCheckpoint(project.id,'Stable A');assert(cp1.checkpoints.length===1,'Checkpoint was not created');
let mutated=getProject(project.id);mutated.workspace.files.find(x=>x.path==='src/main.cpp').content='VERSION_B';
// project store deliberately exports patchProject; dynamic import keeps this test close to public API.
const {patchProject}=await import('../project-studio/project-store.js');patchProject(project.id,{workspace:mutated.workspace});
restoreCheckpoint(project.id,cp1.checkpoints[0].id);const restored=getProject(project.id);assert(restored.workspace.files.find(x=>x.path==='src/main.cpp').content!== 'VERSION_B','Checkpoint restore did not replace workspace');

const workspace=createCodeWorkspace({languageId:'cpp',entryFile:project.manifest.entryFile,files:project.workspace.files,activeFile:project.manifest.entryFile});
const request=normalizeRuntimeRequest(workspace.runtimeRequest(''));
assert(runtimeProjectFileCount(request)>=3,'Project Studio runtime request lost nested files');
assert(browserRuntimeProvider.inspect(request).support==='unsupported','Browser Runtime must not accept Project Studio multi-file project');
assert(wasmRuntimeProvider.inspect(request).support==='guaranteed','WASM Runtime must accept Project Studio C++ project');

const dashboard=projectStudioDashboardMarkup({projects:listProjects(),courseProjects:[courseDef],locale:'ru'});
for(const token of ['NEXUS PROJECT STUDIO','МОИ ПРОЕКТЫ','Nexus Sync','Export & Release','#view=project-studio&template=cpp%3Afinance'])assert(dashboard.includes(token),`Project Studio dashboard missing ${token}`);
const detail=projectStudioViewMarkup({project:getProject(project.id),courseProject:courseDef,locale:'ru'});
for(const token of ['MANIFEST','CHECKPOINTS','id="psCheckpoint"','id="runCode"','src/main.cpp'])assert(detail.includes(token),`Project Studio detail missing ${token}`);

const app=fs.readFileSync(new URL('../core/app.js',import.meta.url),'utf8');
for(const token of ['programmingHub()','practicumView(id)','projectStudioDashboard()','projectStudioProject(projectId)','bindProjectStudio','ensureTemplateProject','Решить в Code Studio','Открыть в Project Studio'])assert(app.includes(token),`App integration missing ${token}`);
const catalog=JSON.parse(fs.readFileSync(new URL('../courses/catalog.json',import.meta.url),'utf8'));const programming=catalog.courses.find(x=>x.id==='programming');
assert(programming?.route==='#view=programming','Programming academy card is not routed to hub');assert(programming?.status==='available-alpha','Programming hub status must be available-alpha');
console.log('PROJECT_STUDIO_FOUNDATION_PASS',project.id,listProjects().length);
