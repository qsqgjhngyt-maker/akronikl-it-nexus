import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const assert=(v,m)=>{if(!v)throw new Error(m)};
const app=fs.readFileSync(new URL('core/app.js',root),'utf8');
const index=fs.readFileSync(new URL('index.html',root),'utf8');
const sw=fs.readFileSync(new URL('service-worker.js',root),'utf8');
for(const staticImport of ["from '../project-studio/project-store.js'","from '../project-studio/project-templates.js'","from '../project-studio/project-studio.js'"]){
  assert(!app.includes(staticImport),`Project Studio still blocks initial module graph: ${staticImport}`);
}
for(const token of ['async function loadProjectStudio()','import(`../project-studio/project-store.js${suffix}`)','import(`../project-studio/project-templates.js${suffix}`)','import(`../project-studio/project-studio.js${suffix}`)','async function safeRender()','function renderFailure(err)'])assert(app.includes(token),`boot recovery app token missing: ${token}`);
for(const token of ["window.addEventListener('error'","window.addEventListener('unhandledrejection'",'setTimeout(()=>','Boot Recovery включён','__NEXUS_BOOT_OK__'])assert(index.includes(token),`boot diagnostic missing: ${token}`);
assert(sw.includes('akronikl-it-nexus-v0.1.7-alpha.2.4.2'),'hotfix SW cache key missing');
console.log('BOOT_RECOVERY_HOTFIX_PASS');
