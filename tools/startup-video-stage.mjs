// Перенос только проверенного immutable build в рабочую ветку. main здесь не меняется.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),out=process.env.NEXUS_FRONTEND_DIR;
assert.ok(out,'Нужен проверенный NEXUS_FRONTEND_DIR');
const generation='ui1a-startup-video-v6-20261029',manifest=JSON.parse(await readFile(path.join(out,'BUILD_MANIFEST.json')));
assert.equal(manifest.assetGeneration,generation);
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const r of manifest.files)assert.equal(hash(await readFile(path.join(out,r.file))),r.sha256,r.file);
const roots=['index.html','nexus-shell.html','offline.html','version.json','service-worker.js','startup-intro.json'];
for(const r of manifest.files.filter(r=>roots.includes(r.file)||r.file.startsWith('releases/'+generation+'/')||r.file.startsWith('entry-assets/'+generation+'/'))){
 const dest=path.join(root,r.file);await mkdir(path.dirname(dest),{recursive:true});await copyFile(path.join(out,r.file),dest);
}
await copyFile(path.join(out,'BUILD_MANIFEST.json'),path.join(root,'BUILD_MANIFEST.json'));
const configPath=path.join(root,'release-candidate.json'),config=JSON.parse(await readFile(configPath));
config.retainedPublicGenerations=[...new Set([...(config.retainedPublicGenerations||[]),config.assetGeneration])].filter(g=>g!==generation);
config.assetGeneration=generation;config.version=manifest.version;
config.status='STARTUP VIDEO V6 / AUTOMATED PASS / ОЖИДАЕТ ПУБЛИКАЦИИ И ПРОВЕРКИ ВЛАДЕЛЬЦА';
await writeFile(configPath,JSON.stringify(config,null,2)+'\n');
const ev=path.join(root,'docs/ru/07-ui/startup-video-v6-evidence');await mkdir(ev,{recursive:true});
for(const file of ['browser-comparison.json','failure-cases.json','unit.log'])await copyFile(path.join(process.env.NEXUS_INTRO_WORK,'evidence',file),path.join(ev,file));
await copyFile(path.join(root,'intro-media/cinematic-v6/MANIFEST.json'),path.join(ev,'media-manifest.json'));
const rollback=roots.concat(['BUILD_MANIFEST.json','release-candidate.json']).map(file=>{const bytes=execFileSync('git',['show','75e24e195919e7c3d39659ba804e977d51ef5591:'+file],{cwd:root,maxBuffer:128*1024*1024});return{file,sha256:hash(bytes),bytes:bytes.length}});
await writeFile(path.join(ev,'rollback.json'),JSON.stringify({base:'75e24e195919e7c3d39659ba804e977d51ef5591',files:rollback},null,2)+'\n');
await writeFile(path.join(root,'docs/ru/07-ui/STARTUP_VIDEO_V6_20261029.md'),`# Плавная заставка — 29.10.2026\n\nSTATUS: AUTOMATED PASS. Публикация и физический Desktop/Android/iPhone LIVE подтверждаются отдельно.\n\nОснова: 75e24e195919e7c3d39659ba804e977d51ef5591. Новое поколение: ${generation}.\n\nСохранены разные сюжеты ПК (10 секунд, 300 кадров) и телефонов (8 секунд, 240 кадров). Для Mobile четыре прежние части объединены в один поток; мобильное разрешение снижено до 720×1280. Desktop остаётся 1920×1080. H.264 Main, yuv420p, faststart, 30 fps; резервный WebM. Сжатие с потерями, визуальное принятие владельцем ещё требуется.\n\nУбраны переключения двух декодеров на мобильных, преждевременный старт при паузе сети и лишние DOM-записи на каждом кадре ПК. Сохранены early Skip, reduced-motion, настройки, auth handoff, отсутствие видео при reload, Network-only media и анонимный CDN без credentials. Метки версии оболочки согласованы с новым version.json; остальная разметка неизменна.\n\nТесты: Node unit/build/retention, реальный ESM import, Chromium synthetic HTTP Range на 3/5/15 Мбит/с, 404/skip/reduced-motion/rotation, 16 обновлений и сохранность прогресса/проектов. Подробные результаты рядом. Это не тесты физических телефонов.\n\nПервичная локальная браузерная проверка была BLOCKED_BY_ADMINISTRATOR; перенесена в GitHub Actions. Первичный подготовительный CI не имел esbuild; исправлена установка зависимостей.\n\nRollback: прежние immutable поколения и видео не удалены; root-файлы и SHA256 базы перечислены в rollback.json. Identity, API, Cloud Sync, данные и содержимое курсов не менялись.\n\nCross-branch: 07 → 05 для evidence и release; 00 для статуса; 04 для эксперимента до/после. MASTER не считать обновлённым, пока публикация не зафиксирована.\n`);
console.log('Проверенная сборка подготовлена в рабочей ветке. main и production не изменены.');
