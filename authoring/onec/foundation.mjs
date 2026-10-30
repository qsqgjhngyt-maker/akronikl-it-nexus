import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {validateSchema} from '../../tools/content-contract-lib.mjs';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const AUTHORING = 'authoring/onec';
const ID = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const COURSE_IDS = ['1c-enterprise', 'onec-programming'];
const SOURCE_FILES = ['roadmap.json', 'shared.json', 'lessons.json'];
const hash = b => createHash('sha256').update(b).digest('hex');
const json = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const own = (o, k) => Object.hasOwn(o, k);
const issue = (ok, message, errors) => { if (!ok) errors.push(message); };
const pair = o => o && typeof o.ru === 'string' && o.ru.trim() && typeof o.en === 'string' && o.en.trim();
const topicId = (course, module, slug) => `${course}.${module}.${slug}`;
export function loadBundle(root = ROOT) {
  const [roadmap, shared, lessons] = SOURCE_FILES.map(f => json(path.join(root, AUTHORING, f)));
  const schema = json(path.join(root, 'content/schemas/content-package-v1.schema.json'));
  return {roadmap, shared, lessons, schema};
}
export function curriculumFor(course, authored) {
  return {
    schemaVersion: 1, courseId: course.courseId, version: '0.1.0', status: 'candidate',
    modules: course.modules.map((m, i) => ({
      moduleId: `${course.courseId}.${m.id}`, order: i + 1, title: m.title,
      prerequisiteModuleIds: m.prerequisites.map(id => `${course.courseId}.${id}`),
      outcome: m.outcome, evidence: m.evidence,
      topics: m.topics.map(([slug, ru, en], j) => {
        const id = topicId(course.courseId, m.id, slug);
        return {topicId: id, order: j + 1, title: {ru, en},
          contentStatus: authored.has(id) ? 'authored-candidate' : 'planned'};
      })
    }))
  };
}
export function contractFor(course, lessonRows) {
  const prefix = `courses/${course.courseId}`;
  const relevant = lessonRows.filter(l => l.courseId === course.courseId);
  return {
    schemaVersion: 1, contractVersion: '1.0.0', contentVersion: '0.1.0', courseId: course.courseId,
    status: 'draft-contract', primaryLocale: 'ru', availableLocales: ['ru', 'en'],
    sourceCompatibility: {catalogPath: 'authoring/onec/catalog.candidate.json',
      manifestPath: `${prefix}/manifest.json`, curriculumPath: `${prefix}/curriculum.json`,
      provenancePath: `${prefix}/PROVENANCE.md`, contentPaths: {lessons: 'authoring/onec/lessons.json', shared: 'authoring/onec/shared.json'}},
    runtimeCompatibility: {academyRoute: course.proposedRoute,
      progressStateKey: 'akronikl:it-nexus:state:v1', projectStorageKey: 'akronikl:it-nexus:projects:v1',
      runtimeConsumption: 'metadata-only', offlinePolicy: 'no-runtime-change-cp1.1'},
    modules: course.modules.map((m, i) => ({moduleId: `${course.courseId}.${m.id}`, sourceId: `${course.courseId}.${m.id}`, order: i + 1,
      topicIds: m.topics.map(([slug]) => topicId(course.courseId, m.id, slug))})),
    topics: course.modules.flatMap(m => m.topics.map(([slug], i) => ({
      topicId: topicId(course.courseId, m.id, slug), sourceId: topicId(course.courseId, m.id, slug),
      moduleId: `${course.courseId}.${m.id}`, order: i + 1, skillIds: [], skillMappingStatus: 'pending-cp3'}))),
    skills: [],
    exercises: relevant.map(l => ({exerciseId: `${l.lessonId}.concept-check`, sourceId: l.lessonId, scope: 'topic',
      moduleIds: [l.moduleId], topicIds: [l.lessonId], skillIds: [], skillMappingStatus: 'pending-cp3',
      kind: 'exercise', activityType: 'theory.exercise', sourceLocale: 'ru', sourceMapping: {task: 'ru.practice'}})),
    practices: relevant.map(l => ({practiceId: `${l.lessonId}.lab-plan`, sourceId: l.lessonId, scope: 'topic',
      moduleIds: [l.moduleId], topicIds: [l.lessonId], skillIds: [], skillMappingStatus: 'pending-cp3',
      kind: 'practice', activityType: 'research.exercise', sourceLocale: 'ru', sourceMapping: {task: 'ru.lab'}})),
    projects: [],
    futureExtensions: {skillGraph: 'not-implemented', learningEvents: 'not-implemented', masteryModel: 'not-implemented'}
  };
}
export function validateBundle(bundle) {
  const errors = [];
  try {
    const {roadmap, shared, lessons, schema} = bundle;
    issue(roadmap.schemaVersion === 1 && roadmap.version === '0.1.0', 'Версия исходной модели', errors);
    issue(roadmap.productionIntegration === 'not-implemented', 'Нельзя объявлять интеграцию production', errors);
    issue(['skillGraph','learningEvents','masteryModel'].every(k => roadmap.futureExtensions?.[k] === 'not-implemented'), 'Недоказанные будущие слои обучения', errors);
    issue(JSON.stringify(roadmap.courses.map(c => c.courseId).sort()) === JSON.stringify([...COURSE_IDS].sort()), 'Два разных Course ID обязательны', errors);
    const sourceRows = [...shared.sources, ...(lessons.additionalSources || [])];
    const sources = new Set(sourceRows.map(s => s.id));
    issue(sources.size === sourceRows.length, 'Повторный source ID', errors);
    for (const s of sourceRows) {
      issue(s.id && s.title && s.publisher && s.license && s.use, 'Неполный provenance', errors);
      issue(new URL(s.url).protocol === 'https:', 'Источник должен иметь HTTPS URL', errors);
    }
    const blocks = new Set(shared.sharedBlocks.map(b => `${b.id}@${b.version}`));
    issue(blocks.size === shared.sharedBlocks.length, 'Повторная версия общего блока', errors);
    for (const b of shared.sharedBlocks) {
      issue(ID.test(b.id) && /^\d+\.\d+\.\d+$/.test(b.version), 'Неверный ID/версия общего блока', errors);
      for (const id of b.sourceRefs) issue(sources.has(id), `Неизвестный источник общего блока: ${id}`, errors);
      for (const t of b.terms) for (const locale of ['ru','en']) issue(t[locale]?.term?.trim() && t[locale]?.definition?.trim(), 'Пустой перевод термина', errors);
    }
    issue(shared.progressProposal.crossCourseCredit === 'never-implicit' && shared.progressProposal.sharedBlockGrantsCredit === false, 'Недопустимый перенос зачёта', errors);
    issue(shared.progressProposal.localeIsIdentity === false, 'Язык не должен менять identity прогресса', errors);
    issue(shared.progressProposal.productionStorageMigration === 'not-authorized', 'Миграция production не разрешена', errors);
    for (const [gate, value] of Object.entries(shared.releaseGates)) issue(value === false, `Gate преждевременно объявлен: ${gate}`, errors);
    for (const p of shared.runtimeProfiles) {
      if (p.id !== 'nexus-theory') issue(p.exactVersion === null && p.executionVerified === false && p.status === 'not-run', `Не подтверждённый runtime PASS: ${p.id}`, errors);
    }
    issue(shared.sourceRights.thirdPartyBinariesIncluded === false && shared.sourceRights.proprietaryConfigurationsIncluded === false && shared.sourceRights.realOrganizationDataIncluded === false, 'Нарушены границы учебного пакета', errors);
    const globalIds = new Set();
    const topics = new Map();
    const addId = id => { issue(ID.test(id) && !globalIds.has(id), `Повторный/неверный ID: ${id}`, errors); globalIds.add(id); };
    for (const course of roadmap.courses) {
      addId(course.courseId);
      issue(pair(course.title) && pair(course.entryDiagnostic), 'Пустой RU/EN заголовок или входная диагностика', errors);
      issue(course.catalogStatus === 'planned' && course.currentRoute === null, 'Маршрут не принят; AVAILABLE запрещён', errors);
      issue(course.proposedRoute === `#course=${course.courseId}`, 'Конфликт предложенного маршрута', errors);
      issue(course.entryCourseRequirements.length === 0, 'Прикладной курс не является обязательным входным барьером', errors);
      if (course.courseId === 'onec-programming') issue(course.languageId === 'onec' && course.identityStatus === 'proposed-new-course-id', 'Язык и курс нельзя отождествлять', errors);
      const modules = new Map(course.modules.map(m => [m.id, m]));
      issue(modules.size === course.modules.length && modules.size > 0, 'Повторные или отсутствующие модули', errors);
      const visiting = new Set(), visited = new Set();
      function visit(id) {
        if (visiting.has(id)) throw Error(`Цикл prerequisites: ${id}`);
        if (visited.has(id)) return;
        const m = modules.get(id); if (!m) throw Error(`Отсутствующий prerequisite: ${id}`);
        visiting.add(id); for (const dependency of m.prerequisites) visit(dependency);
        visiting.delete(id); visited.add(id);
      }
      for (const m of course.modules) {
        visit(m.id); addId(`${course.courseId}.${m.id}`);
        issue(pair(m.title) && pair(m.outcome) && pair(m.evidence), 'Неполная методическая карточка модуля', errors);
        issue(m.topics.length > 0, 'Пустой модуль', errors);
        for (const [slug, ru, en] of m.topics) {
          const id = topicId(course.courseId, m.id, slug); addId(id);
          issue(ru?.trim() && en?.trim(), 'Пустое название темы', errors);
          topics.set(id, {courseId: course.courseId, moduleId: `${course.courseId}.${m.id}`});
        }
      }
    }
    issue(new Set(lessons.lessons.map(l => l.lessonId)).size === lessons.lessons.length, 'Повторная учебная тема', errors);
    for (const l of lessons.lessons) {
      const expected = topics.get(l.lessonId);
      issue(expected && expected.courseId === l.courseId && expected.moduleId === l.moduleId, `Тема не принадлежит курсу: ${l.lessonId}`, errors);
      issue(l.status === 'authored-candidate' && l.runtimeClaim === 'none', 'Нельзя повышать статус учебного кандидата', errors);
      for (const id of l.sourceRefs) issue(sources.has(id), `Неизвестный sourceRef: ${id}`, errors);
      for (const ref of l.sharedRefs) issue(blocks.has(ref), `Незакреплённая версия sharedRef: ${ref}`, errors);
      for (const locale of ['ru', 'en']) {
        const b = l[locale];
        issue(b?.title?.trim() && b?.purpose?.trim() && b?.next?.trim(), `Неполная локаль ${l.lessonId}/${locale}`, errors);
        for (const k of ['prerequisites','outcomes','sections','examples','experiments','practice','mistakes','quiz','recap']) issue(Array.isArray(b[k]) && b[k].length > 0, `Нет блока ${k}/${locale}`, errors);
        for (const s of b.sections) issue(s.id && s.title?.trim() && s.paragraphs?.length && s.paragraphs.every(p => typeof p === 'string' && p.trim()), 'Пустая секция теории', errors);
        for (const q of b.quiz) issue(q.id && q.question?.trim() && q.answers?.length >= 2 && Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < q.answers.length && q.explanation?.trim(), 'Некорректная самопроверка', errors);
        issue(b.lab?.platformExecution === 'not-performed' && b.lab.steps?.length && b.lab.rubric?.length, 'Неполная или недоказанная лаборатория', errors);
      }
      for (const k of ['sections','examples','quiz']) issue(JSON.stringify(l.ru[k].map(x => x.id)) === JSON.stringify(l.en[k].map(x => x.id)), `Несогласованная структура RU/EN: ${k}`, errors);
      issue(JSON.stringify(l.ru.quiz.map(q => q.correctIndex)) === JSON.stringify(l.en.quiz.map(q => q.correctIndex)), 'Различаются ключи RU/EN самопроверки', errors);
      if (l.bslExample) issue(l.bslExample.status === 'AUTHORED_NOT_EXECUTED' && l.bslExample.platformVersion === null && l.bslExample.analyzerVersion === null, 'Недоказанное исполнение BSL', errors);
    }
    for (const c of roadmap.courses) {
      issue(lessons.lessons.some(l => l.courseId === c.courseId), 'Нет авторского материала для направления', errors);
      const problems = validateSchema(schema, contractFor(c, lessons.lessons));
      for (const p of problems) errors.push(`${c.courseId}: CP-1.1: ${p}`);
    }
    issue(shared.serviceDeskFixture.synthetic === true && shared.serviceDeskFixture.configurationExport === 'not-built', 'Fixture не является готовой конфигурацией', errors);
    const customers = new Set(shared.serviceDeskFixture.customers.map(c => c.id));
    const services = new Map(shared.serviceDeskFixture.services.map(s => [s.id, s]));
    for (const r of shared.serviceDeskFixture.requests) {
      issue(customers.has(r.customerId) && services.has(r.serviceId), 'Нарушена ссылка fixture', errors);
      issue(r.expectedAmount === r.minutes * services.get(r.serviceId).hourlyRate / 60, 'Ошибка арифметики спецификации; это не тест BSL', errors);
    }
    return {ok: errors.length === 0, errors, stats: {courses: roadmap.courses.length, modules: roadmap.courses.reduce((n,c) => n+c.modules.length,0), topics: topics.size,
      authoredLessons: lessons.lessons.length, authoredLocaleBodies: lessons.lessons.length*2, sharedBlocks: blocks.size, sourceRecords: sources.size},
      limits: {native1C:'NOT RUN', oneScript:'NOT RUN', bslStaticAnalysis:'NOT RUN', productionProgress:'NOT INTEGRATED', expertReview:'NOT PERFORMED'}};
  } catch (e) { return {ok:false, errors:[...errors, `Некорректная модель: ${e.message}`], stats:{}}; }
}

// Только чистый прототип. Не читает и не пишет Account/localStorage/Cloud.
export function appendPrototypeAttempt(state, attempt, roadmap) {
  if (!state || !Array.isArray(state.attempts) || !attempt || typeof attempt !== 'object') throw Error('INVALID_ATTEMPT');
  const course = roadmap.courses.find(c => c.courseId === attempt.courseId);
  const validTopic = course?.modules.some(m => m.topics.some(([slug]) => topicId(course.courseId,m.id,slug) === attempt.topicId));
  if (!validTopic || !ID.test(attempt.attemptId || '') || !ID.test(attempt.learnerScope || '') || !attempt.contentRevision || attempt.kind !== 'concept-only') throw Error('COURSE_SCOPE_MISMATCH');
  if (state.attempts.some(a => a.learnerScope === attempt.learnerScope && a.attemptId === attempt.attemptId)) throw Error('ATTEMPT_ALREADY_EXISTS');
  const clean = {learnerScope:attempt.learnerScope, courseId:attempt.courseId, topicId:attempt.topicId, attemptId:attempt.attemptId, contentRevision:attempt.contentRevision, kind:'concept-only'};
  return {attempts:[...structuredClone(state.attempts), clean]};
}
export function clonePrototypeProject(source, targetCourse, newId) {
  if (!source || !COURSE_IDS.includes(source.courseId) || !COURSE_IDS.includes(targetCourse) || !ID.test(newId || '') || source.id === newId || !Array.isArray(source.files)) throw Error('INVALID_COPY');
  for (const file of source.files) if (typeof file.path !== 'string' || !file.path || /[\\:\x00-\x1f]/.test(file.path) || file.path.startsWith('/') || file.path.split('/').some(p => !p || p === '.' || p === '..') || typeof file.content !== 'string') throw Error('UNSAFE_FILE_PATH');
  return {id:newId, courseId:targetCourse, copiedFrom:source.id,
    files:source.files.map(f => ({path:f.path, content:f.content})), progress:{}, attempts:[]};
}

export function previewHTML(bundle) {
  const data = JSON.stringify({roadmap:bundle.roadmap, shared:bundle.shared, lessons:bundle.lessons.lessons,lessonsSourceRows:bundle.lessons.additionalSources || []}).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
  const script = `const DATA=${data};
const course=document.getElementById('course'),locale=document.getElementById('locale'),body=document.getElementById('lesson'),outline=document.getElementById('outline');
const el=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x};
const list=(items,tag='ul')=>{const x=el(tag);for(const s of items)x.append(el('li',s));return x};
for(const c of DATA.roadmap.courses){const o=el('option',c.title.ru);o.value=c.courseId;course.append(o)}
function render(){const lang=locale.value,c=DATA.roadmap.courses.find(x=>x.courseId===course.value),l=DATA.lessons.find(x=>x.courseId===c.courseId),b=l[lang];document.documentElement.lang=lang;body.replaceChildren();outline.replaceChildren();
for(const o of course.options)o.textContent=DATA.roadmap.courses.find(x=>x.courseId===o.value).title[lang];
body.append(el('h1',b.title),el('p',b.purpose),el('h2',lang==='ru'?'Результаты занятия':'Learning outcomes'),list(b.outcomes),el('h2',lang==='ru'?'Перед началом':'Prerequisites'),list(b.prerequisites));
const model=el('section');model.id='shared-model';model.append(el('h2',lang==='ru'?'Общая модель: описание и конкретные записи':'Shared model: definitions and records'));
const details=el('p');details.id='model-description';details.setAttribute('aria-live','polite');const keys=['platform','configuration','infobase'];
for(const key of keys){const t=DATA.shared.sharedBlocks[0].terms.find(x=>x.id===key)[lang],button=el('button',t.term);button.type='button';button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>{for(const peer of model.querySelectorAll('button'))peer.setAttribute('aria-pressed','false');button.setAttribute('aria-pressed','true');details.textContent=t.definition});model.append(button)}model.append(details);body.append(model);
for(const s of b.sections){const section=el('section');section.append(el('h2',s.title));for(const p of s.paragraphs)section.append(el('p',p));body.append(section)}
for(const e of b.examples){const section=el('section');section.append(el('h2',e.task),list(e.steps,'ol'),el('p',e.result));body.append(section)}
body.append(el('h2',lang==='ru'?'Эксперименты':'Experiments'));for(const e of b.experiments){body.append(el('h3',e.task),el('p',e.predict),el('p',e.check))}
body.append(el('h2',lang==='ru'?'Практика':'Practice'));for(const p of b.practice){body.append(el('h3',p.level),el('p',p.task),el('p',p.criterion))}
body.append(el('h2',b.lab.title),el('p',b.lab.task),list(b.lab.steps,'ol'),el('p',b.lab.deliverable),list(b.lab.rubric));
if(l.bslExample){const pre=el('pre'),code=el('code',l.bslExample.source);pre.append(code);body.append(el('h3','BSL: AUTHORED / NOT EXECUTED'),pre);for(const r of l.bslExample.specificationCases)body.append(el('p',JSON.stringify(r)))}
body.append(el('h2',lang==='ru'?'Типичные ошибки':'Common mistakes'));for(const e of b.mistakes){body.append(el('h3',e.symptom),el('p',e.cause),el('p',e.fix))}
body.append(el('h2',lang==='ru'?'Самопроверка — без зачёта курса':'Self-check — no course credit'));for(const [i,q] of b.quiz.entries()){const field=el('fieldset'),legend=el('legend',q.question);field.append(legend);for(const [j,a] of q.answers.entries()){const label=el('label'),radio=el('input');radio.type='radio';radio.name='q'+i;radio.value=String(j);label.append(radio,document.createTextNode(a));field.append(label)}const check=el('button',lang==='ru'?'Проверить':'Check'),feedback=el('p');check.type='button';feedback.setAttribute('role','status');check.addEventListener('click',()=>{const selected=field.querySelector('input:checked');feedback.textContent=!selected?(lang==='ru'?'Выберите ответ.':'Select an answer.'):(Number(selected.value)===q.correctIndex?(lang==='ru'?'Верно. ':'Correct. '):(lang==='ru'?'Попробуйте ещё раз. ':'Try again. '))+q.explanation});field.append(check,feedback);body.append(field)}
body.append(el('h2',lang==='ru'?'Итоги':'Summary'),list(b.recap),el('p',b.next));
const sources=[...DATA.shared.sources,...(DATA.lessonsSourceRows||[])];const sourceList=el('ul');for(const id of l.sourceRefs){const s=sources.find(s=>s.id===id);const li=el('li',s?s.title:id);if(s){const a=el('a',lang==='ru'?' — источник (нужна сеть)':' — source (network required)');a.href=s.url;a.rel='noopener noreferrer';a.target='_blank';li.append(a)}sourceList.append(li)}body.append(el('h2',lang==='ru'?'Источники':'Sources'),sourceList);
for(const m of c.modules){const d=el('details');d.append(el('summary',m.title[lang]),el('p',m.outcome[lang]),el('p',m.evidence[lang]),list(m.topics.map(t=>t[lang==='ru'?1:2])));outline.append(d)}
}
course.addEventListener('change',render);locale.addEventListener('change',render);render();`;
  const correctedScript = script;
  const digest = createHash('sha256').update(correctedScript).digest('base64');
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-${digest}'; style-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'"><title>Nexus · 1С · учебный кандидат</title><style>
:root{font-family:system-ui,sans-serif;color:#172b3a;background:#f3f5f7}*{box-sizing:border-box}body{margin:0}header{background:#142f3e;color:white;padding:22px}header p{max-width:1000px;margin:auto;line-height:1.6}.controls{display:flex;gap:16px;flex-wrap:wrap;padding:20px;max-width:1120px;margin:auto}label{display:block}select{font:inherit;max-width:100%;min-height:44px;padding:8px}.controls label:first-child{flex:1;min-width:200px}.controls select{width:100%}main{max-width:1120px;margin:auto;padding:0 20px 50px}article{max-width:860px;background:white;border:1px solid #d2dbe0;border-radius:14px;padding:28px;margin:auto}h1{font-size:clamp(26px,4vw,38px);line-height:1.15}h2{font-size:22px;margin-top:32px}h3{font-size:18px}p,li{line-height:1.75}li{margin:8px 0}button{font:inherit;min-height:44px;padding:10px 16px;margin:6px;border:1px solid #58778a;border-radius:9px;background:#eaf1f5;cursor:pointer}button[aria-pressed=true]{background:#174c63;color:white}button:focus-visible,select:focus-visible,a:focus-visible{outline:3px solid #dc8900;outline-offset:3px}fieldset{border:1px solid #b5c6d0;margin:20px 0;padding:16px;border-radius:10px}fieldset label{padding:10px}input[type=radio]{margin-right:12px}pre{overflow:auto;background:#edf1f4;padding:14px;font:14px/1.6 monospace}#shared-model{background:#eef4f7;border-radius:10px;padding:14px}#shared-model button{min-width:140px}#outline{max-width:860px;margin:24px auto}details{padding:12px;border-bottom:1px solid #bfccd4}summary{cursor:pointer;font-weight:600}a{color:#174f80}footer{max-width:860px;margin:20px auto;font-size:14px} @media(max-width:600px){article{padding:18px}main{padding:0 10px 30px}fieldset{padding:10px}h2{font-size:20px}}
</style></head><body><header><p>1C-0 / A1 / P1 — AUTHORING CANDIDATE · NOT PUBLISHED<br>Учебная модель, не исполнение 1С. Прогресс Nexus не читается и не записывается.<br>Didactic preview, not a 1C runtime. No Nexus progress is read or written.</p></header><div class="controls"><label for="course">Направление / Course<select id="course"></select></label><label for="locale">Язык / Language<select id="locale"><option value="ru">Русский</option><option value="en">English</option></select></label></div><main><article id="lesson"></article><h2>Программа-кандидат / Candidate curriculum</h2><section id="outline"></section><footer>Самопроверка не сохраняет зачёт. Native 1C / OneScript / BSL analysis: NOT RUN. Остальные темы — PLANNED.</footer></main><script>${correctedScript}</script></body></html>`;
}

export function buildCandidate(outputDirectory, root = ROOT) {
  const out = path.resolve(outputDirectory);
  const input = path.resolve(root);
  if (out === input || out.startsWith(input + path.sep) || input.startsWith(out + path.sep)) throw Error('OUTPUT_MUST_BE_SEPARATE_FROM_SOURCE');
  if (fs.existsSync(out)) throw Error('OUTPUT_ALREADY_EXISTS');
  const bundle = loadBundle(root), validation = validateBundle(bundle);
  if (!validation.ok) throw Error(validation.errors.join('\n'));
  const written = [];
  const put = (relative, data) => {
    const p = path.join(out, relative); fs.mkdirSync(path.dirname(p), {recursive:true});
    const bytes = Buffer.from(typeof data === 'string' ? data : JSON.stringify(data,null,2)+'\n');
    fs.writeFileSync(p, bytes); written.push({path:relative,bytes:bytes.length,sha256:hash(bytes)});
  };
  const authored = new Set(bundle.lessons.lessons.map(l => l.lessonId));
  for (const c of bundle.roadmap.courses) {
    const prefix = `courses/${c.courseId}`;
    put(`${prefix}/manifest.json`, {schemaVersion:1,id:c.courseId,title:c.title,version:'0.1.0',status:'draft-content',routeAccepted:false,primaryLocale:'ru',availableLocales:['ru','en']});
    put(`${prefix}/curriculum.json`, curriculumFor(c,authored));
    put(`${prefix}/content-package.json`, contractFor(c,bundle.lessons.lessons));
    put(`${prefix}/PROVENANCE.md`, '# Редакционный кандидат\n\nИсходный авторский материал Nexus; реестр источников и ограничений: authoring/onec/shared.json и lessons.json. Не официальная учебная программа фирмы 1С. Нативные лаборатории не приняты.\n');
  }
  put('authoring/onec/catalog.candidate.json', {schemaVersion:1,status:'not-production',courses:bundle.roadmap.courses.map(c => ({id:c.courseId,title:c.title,status:'planned',route:null,proposedRoute:c.proposedRoute}))});
  for (const f of [...SOURCE_FILES,'foundation.mjs','foundation.test.mjs','README_RU.md']) {
    const p = path.join(root,AUTHORING,f); if (fs.existsSync(p)) put(`${AUTHORING}/${f}`,fs.readFileSync(p,'utf8'));
  }
  put('content/schemas/content-package-v1.schema.json', fs.readFileSync(path.join(root,'content/schemas/content-package-v1.schema.json'),'utf8'));
  put('tools/content-contract-lib.mjs',fs.readFileSync(path.join(root,'tools/content-contract-lib.mjs'),'utf8'));
  // Точные неизменённые зависимости для воспроизведения тестов вне репозитория.
  for (const relative of ['sandbox/languages.js','courses/catalog.json']) put(relative,fs.readFileSync(path.join(root,relative),'utf8'));
  for (const l of bundle.lessons.lessons) if(l.bslExample) put(`examples/${l.bslExample.filename}`,l.bslExample.source);
  put('environment-record.template.json',{schemaVersion:1,platformBuild:null,operatingSystem:null,architecture:null,licenseProfile:null,compatibilityMode:null,configurationRevision:null,sourceSha256:null,callContext:null,actualOutput:null,executionVerified:false,secretsAllowed:false});
  put('preview.html', previewHTML(bundle));
  put('VALIDATION.json',validation);
  put('README_RU.md','# 1С — локальный учебный кандидат\n\nОткройте preview.html. Это самостоятельный прототип, а не обновление Nexus. НЕ копировать этот каталог поверх production. Два Content Package проверены действующей CP-1.1 schema; остальные программные модули курса PLANNED. Ключи прогресса в контрактах — только ссылки совместимости, новый код не читает и не пишет эти ключи. Настоящие native-лаборатории, анализ BSL и маршруты Академии не приняты.\n\nПроверки из исходного репозитория: node --test authoring/onec/foundation.test.mjs; сборка: node authoring/onec/foundation.mjs --out <НОВЫЙ_КАТАЛОГ_ВНЕ_РЕПОЗИТОРИЯ>.\n');
  const manifest = {schemaVersion:1,baseline:bundle.roadmap.baseline,status:'partial-authoring-checkpoint',files:written.slice().sort((a,b)=>a.path.localeCompare(b.path)),native1C:'NOT RUN',integration:'NOT IMPLEMENTED'};
  put('BUILD_MANIFEST.json',manifest);
  put('SHA256SUMS.txt',written.map(r=>`${r.sha256}  ${r.path}`).sort().join('\n')+'\n');
  return {validation,files:written.length,bytes:written.reduce((n,r)=>n+r.bytes,0),out};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args=process.argv.slice(2);
  if(args.length===2 && args[0]==='--out') console.log(JSON.stringify(buildCandidate(args[1]),null,2));
  else {const result=validateBundle(loadBundle());console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;}
}
