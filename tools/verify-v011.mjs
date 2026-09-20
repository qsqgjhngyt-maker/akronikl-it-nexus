import fs from 'node:fs';import path from 'node:path';
const root=process.argv[2]||'.';let fail=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fail++};
const must=['index.html','core/app.js','styles/app.css','courses/cpp/data/lessons.ru.json','courses/cpp/data/practicums.ru.json','courses/cpp/data/projects.ru.json','service-worker.js','manifest.webmanifest','version.json','.nojekyll'];for(const f of must){const p=path.join(root,f);ok(fs.existsSync(p)&&fs.statSync(p).size>0,`${f} non-empty`)}
const idx=fs.readFileSync(path.join(root,'index.html'),'utf8');ok(/<!doctype html>/i.test(idx),'index has doctype');ok(idx.includes('id="boot-status"'),'index has visible boot diagnostic');
const lessons=JSON.parse(fs.readFileSync(path.join(root,'courses/cpp/data/lessons.ru.json'),'utf8')).lessons;ok(lessons.length===40,'40 C++ lessons');ok(new Set(lessons.map(x=>x.id)).size===40,'lesson IDs unique');ok(lessons.every((x,i)=>x.legacyIndex===i),'legacy indexes 0..39 exact');
const pr=JSON.parse(fs.readFileSync(path.join(root,'courses/cpp/data/practicums.ru.json'),'utf8')).practicums;ok(pr.length===6,'6 practicums');const pj=JSON.parse(fs.readFileSync(path.join(root,'courses/cpp/data/projects.ru.json'),'utf8')).projects;ok(pj.length===7,'7 projects');
for(const f of ['courses/catalog.json','courses/cpp/manifest.json','courses/cpp/curriculum.json','locales/registry.json','locales/ru/ui.json','locales/en/ui.json','version.json','manifest.webmanifest']){JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));ok(true,`${f} JSON valid`)}
process.exit(fail?1:0);
