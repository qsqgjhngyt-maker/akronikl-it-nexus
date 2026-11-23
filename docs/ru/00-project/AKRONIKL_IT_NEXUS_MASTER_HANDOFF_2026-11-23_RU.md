# AKRONIKL IT NEXUS — FINAL MASTER HANDOFF · СВОДНАЯ РЕДАКЦИЯ 23.11.2026

**Автор подготовки:** ветка 05 · RELEASE / EVIDENCE / DOCUMENTATION.
**Статус документа:** `READY FOR MASTER 00 REVIEW / CANONICAL PROMOTION PENDING`.
**Область актуализации:** PEDAGOGY C11 + Diploma Checkpoint C11, текущие доступные GitHub release/CI/PR evidence.
**Важное ограничение:** это новый сводный *кандидат* общего канонического MASTER; 05 не объявляет без проверки других веток, что любые неописанные изменения Identity, Studio, Content, 07 или production закрыты. Тексты исторических handoff от 30.09/01.10 не исправляются.

> **Актуальная верхнеуровневая фиксация по C11 на 23.11.2026:** `IMPLEMENTED / AUTOMATED PASS / PUBLISHED FOR USER REVIEW`, `FULL LIVE PASS = NOT GRANTED`. GitHub pre-release опубликован на `b5d3289c72334b32a6f8efaf77ce8f4f560364f5`; FULL CI `45044687170` успешен; PR #65 остаётся OPEN/DRAFT без merge. Diploma Checkpoint C11 **сообщён веткой 04 как завершённый**, но исходный акт из 04 не приложен для независимого SHA256-аудита.

## 0. Правила чтения и приоритет

- Для текущего статуса C11 использовать **этот датированный верхний раздел** и его отдельный Release Ledger/Evidence Index. Исторические пункты `NEXT` в приложенном MASTER 01.10 являются прежними решениями *на 01.10.2026*, а не текущими задачами ноября.
- `GitHub main` — источник истины для влитого кода, а `PR #65` — отдельный неподтверждённый merge кандидат. Source SHA C11 не подменяет main.
- Даты, статусы, release gates и terminal evidence не переносить между scope без отдельной верификации.
- Все changeset/production actions требуют отдельного одобрения владельца и Gate 05; настоящий пакет только документационный.
- Документ от 30.09.2026 **не удалять и не переписывать**. Внутри ZIP он сохранён побайтово, со своим SHA256.

## 1. Точный C11 milestone / Source of truth

| Объект | Зафиксированное состояние | Доказательство |
| --- | --- | --- |
| Source commit PR | `b5d3289c72334b32a6f8efaf77ce8f4f560364f5` | GitHub verified |
| FULL CI | `45044687170` — 8 SUCCESS + 1 BASIC SKIPPED | GitHub verified |
| Pre-release | `nexus-pedagogy-v2026.11.22`, `draft=false`, `prerelease=true`, 3 assets | GitHub verified |
| PR #65 | OPEN / DRAFT / NOT MERGED | GitHub verified |
| `main` (снимок проверки) | `ee2787c0cd92da2ad1d5e79df5e2bfadab2c3dd6` | GitHub verified as-of 23.11.2026 |
| Production C11 | `PUBLISHED FOR USER REVIEW` | MASTER/Work reported; 05 independent LIVE not run |
| Rollback | Старое generation / image сохранены; rollback NOT RUN | MASTER/Work reported |
| Pedagogical/OneC Live | NOT VERIFIED / NOT RUN | Отдельная приёмка необходима |
| Diploma Checkpoint 04 | REPORTED COMPLETE 23.11.2026 | Сообщение ветки 04; оригинальный документ не приложен |
| FULL LIVE PASS | NOT GRANTED | MASTER policy |

Ссылки: [Pre-release](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/releases/tag/nexus-pedagogy-v2026.11.22) · [FULL CI](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/45044687170) · [PR #65](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/pull/65) · [Work Result](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/blob/b5d3289c72334b32a6f8efaf77ce8f4f560364f5/docs/ru/03-content/reference-courses-20261112/pedagogy-20261122/WORK_RESULT_RU.md) · [MATRIX](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/blob/b5d3289c72334b32a6f8efaf77ce8f4f560364f5/docs/ru/03-content/reference-courses-20261112/pedagogy-20261122/MATRIX.json).

## 2. Содержательная модель и архитектурная граница C11

| Направление | Новых переработанных уроков | RU/EN редакций |
| --- | ---: | ---: |
| C++ | 63 | 126 |
| Программирование 1С (BSL) | 49 | 98 |
| Прикладная 1С | 29 | 58 |
| **Суммарно C11** | **141** | **282** |
| Сохранённые ранние эталоны | 10 | 20 |
| **Общий учебный состав** | **151** | **302** |

Редакции распределены по **26 модулям**. Техническая редакторская цепочка по Work evidence: `authoring sources → generation RU/EN content → published lesson data → existing registry/stable IDs → learner session/progress`. Точный набор исходных файлов и изменений должен проверяться по `MATRIX.json`, а не восстанавливаться из данного обзора.

Редакционная методика: конкретная задача, последовательные шаги анализа, обоснование результата, открытый вопрос с обратной связью и независимое упражнение с изменёнными условиями. Для прикладной 1С необходим контроль полей и наблюдений в учебной базе.

**Архитектурный инвариант:** по текущим source/evidence не заявлена миграция lesson IDs, attempts/progress, editor/workspace и storage ради содержательной редакции. Но отсутствие нового UI/data migration не эквивалентно независимой педагогической приёмке или полномасштабному real-user regression.

## 3. Release / evidence status и rollback

- Pre-release **опубликован** в GitHub; фиксированные размеры и digests трёх assets приведены в `PEDAGOGY_C11_RELEASE_EVIDENCE_LEDGER_2026-11-23_R2_RU.md` и `PEDAGOGY_C11_EVIDENCE_INDEX_2026-11-23_RU.md`.
- FULL CI `45044687170` — SUCCESS, BASIC skipped по ветвлению diff; это не делает исторические Gold/1С FAIL зелёными.
- PR #65 — open/draft, без merge. Утверждение `PUBLISHED FOR USER REVIEW` относится к Work production evidence, не к состоянию `main`.
- Rollback образ из релизного описания: `sha256:caa7c8d345fb455681bed364e04094e03711beefd01f2c906af43ad160879630`. Проверка его фактического применения = **NOT RUN**.
- **Незакрыто:** независимый pedagogical review 03, новый native/GUI полный прогон учебных заданий 1С, дополнительные LIVE evidence и исторические негативные CI.
- `FULL LIVE PASS` не выдан.

## 4. Diploma Checkpoint C11 — синхронизация из 04

**Событие:** по сообщению ветки 04 от 23.11.2026 Diploma Checkpoint C11 завершён.

**Зафиксированное содержание, по сообщению 04:** педагогическая методология, provenance материала, сохранение контрактов идентичности учебных сущностей и прогресса, CI-проверка, границы новых 1С результатов, исторические эксперименты и направления следующего научного исследования.

**Уровень доказательства:** `BRANCH 04 REPORTED COMPLETE`. Сама исходная запись Diploma Evidence Ledger в 05 не приложена и не перечитана независимо; это не основание объявлять новый академический эксперимент проведённым. Повторной задачи «добавить C11 в диплом» нет.

**Что остаётся для будущего дипломного исследования:** замер самостоятельного понимания/выполнения, контролируемое сравнение педагогической методики, новые учебные 1С native/GUI evidence, метрики ошибок/времени/завершения на определённой выборке; пока `PLANNED/NOT VERIFIED`.

## 5. Соседние milestones: не смешивать scope

- C++ GOLD STANDARD 1.0 — самостоятельный ранее опубликованный и закрытый milestone (`cpp-gold-course-v1.0.0`, 29.10.2026); его `FULL LIVE PASS` относится к **конкретному C++ выпуску**, а не к педагогической редакции C11.
- Архивные C++/1С Gold/Content failures остаются в собственном evidence ledger. C11 FULL CI не доказывает исправления всех исторических дефектов.
- Ветви 01 Identity, 02 Studio, 07 UI/PWA и другие направления развивались после 01.10.2026; актуальные статусы этих направлений нужно брать из их latest профильных handoff/evidence. Исторический раздел 01.10 ниже не заменяет эту проверку.

## 6. Конкретный следующий шаг и полномочия

**05:** документы подготовлены, GitHub статусы сверены, поддерживать release/evidence ledger, не запускать deploy/merge/rollback.

**00:** рассмотреть этот объединённый кандидат и назначить канонической версией после проверки последних профилей других направлений; не терять старые handoff.

**03:** выполнить независимый методический/педагогический review на source `b5d3289c...`, регистрировать только подтверждённые defects.

**04:** Checkpoint C11 уже завершён по сообщениям; новый raw архив запрашивать только при независимой экспертизе.

**NEXT:** отдельно подтверждённое педагогическое evidence 03, при необходимости 1С native/LIVE gate. **NO FULL LIVE PASS** до новых доказательств.

## 7. Исторические MASTER / SHA256 (immutable)

| Исторический документ | Размер | Проверенный SHA256 | Сохранность |
| --- | ---: | --- | --- |
| `AKRONIKL_IT_NEXUS_FINAL_MASTER_HANDOFF_2026-09-30.md` | 73604 | `6fa3b479f775a7909e870cc727404d3a4d6dba2331fd5fbd9d726c39ca058fad` | BYTE-EXACT ORIGINAL |
| `AKRONIKL_IT_NEXUS_FINAL_MASTER_HANDOFF_2026-10-01.md` | 80654 | `d7b54a11338b253974a1bfc71f2258c75793d0ab330b466c1e11ac5430352ecb` | BYTE-EXACT ORIGINAL |

Оба файла включены в `historical_originals/` ZIP-пакета без изменений. Вторая версия также полностью включена далее в **историческое приложение**. Старые утверждения `CURRENT` и `NEXT` в ней относятся исключительно к **01.10.2026**, не к 23.11.

---

# Приложение А. Неизменённый исторический MASTER HANDOFF от 01.10.2026

**Начало исторического источника.** Ниже исходные байты файла от 01.10.2026; новые сведения сверху имеют приоритет для C11. Архивная версия имеет собственный проверенный SHA256 `d7b54a11338b253974a1bfc71f2258c75793d0ab330b466c1e11ac5430352ecb`.

# AKRONIKL IT NEXUS — FINAL MASTER HANDOFF

**Дата фиксации:** 2026-10-01  
**Назначение:** финальная каноническая точка проекта для работы внутри ChatGPT Project `Akronikl it Nexus`, разработки продукта, Content Production, Yandex Cloud/Identity и подготовки дипломной работы / ВКР  
**Основная frontend-версия:** `v0.1.7-alpha.2.4.5`  
**Статус frontend / Identity foundation:** `FULL LIVE PASS`  
**Статус Yandex Cloud Pilot:** `YC-6 Session Transport Probe — FULL LIVE PASS`; следующий Identity milestone — `Nexus Account / Login Methods Foundation`  
**Статус Content Production:** `CP-0 Content Foundation Audit` завершён по подтверждению пользователя; далее отдельная content-ветка развивается независимо от Identity/Security  
**Репозиторий:** `qsqgjhngyt-maker/akronikl-it-nexus`  
**GitHub Pages:** `https://qsqgjhngyt-maker.github.io/akronikl-it-nexus/`  
**Cloudflare Worker:** `https://akronikl-nexus-sync.akronikl.workers.dev`  
**Cloudflare D1:** `akronikl-nexus-sync`

> Этот файл считать **канонической точкой входа** в проект после переноса в ChatGPT Project. Он наследует канонический handoff от `2026-09-30`, сохраняет исторические YC-0…YC-5 и добавляет подтверждённое закрытие `YC-6 Session Transport Probe — FULL LIVE PASS` с release/evidence фиксацией. Исторический handoff `2026-09-30` не удалять.

---

# 0. START HERE — что делать в первом чате нового Project

В новом Project сначала загрузить этот файл и написать:

> Продолжаем AKRONIKL IT NEXUS по приложенному FINAL MASTER HANDOFF от 2026-10-01.  
> Считать handoff канонической точкой.  
> Текущая frontend-версия `v0.1.7-alpha.2.4.5` закрыта как FULL LIVE PASS.  
> Yandex Cloud Pilot закрыл `YC-0…YC-6`; `YC-6 Session Transport Probe` закрыт как FULL LIVE PASS.  
> Доказан first-party HttpOnly session transport через Yandex API Gateway cookie parameter → operation context → private Serverless Container без раскрытия probe/session secret в browser JavaScript и без Cookie forwarding в GitHub upstream.  
> Следующий Identity milestone — `Nexus Account / Login Methods Foundation`.  
> GitHub остаётся source of truth, Cloudflare production сохраняется как rollback.  
> Работать пошагово: один operational step → мой скрин/вывод → проверка → следующий step.  
> Все коммиты, названия релизов, release notes и пользовательская документация — на русском.  
> Подсказывай режим ChatGPT для каждого этапа.

**Рекомендуемый режим на старте Identity/security этапа:** `Очень высокий`. Для обычной release/documentation работы — `Высокий`.

---

# 1. Что такое AKRONIKL IT NEXUS

AKRONIKL IT NEXUS — инженерная образовательная IT-платформа / IDE в браузере, развиваемая как долгосрочный продукт и база будущей дипломной работы.

Целевая система объединяет:

- обучение программированию;
- курсы и практикумы;
- Project Studio / Code Studio;
- C++ и дальнейшую поддержку других языков;
- запуск кода и тестов;
- PWA / Desktop / Android / iPhone;
- local-first работу;
- Cloud Sync;
- межустройственную синхронизацию;
- Nexus Account;
- устройства и сессии;
- роли / ACL / audit;
- Skill Graph;
- Mastery Model;
- Learning Events;
- Learner Model;
- в будущем Nexus AI / AI-наставника;
- командные проекты и управление доступом;
- CMS / Content Control Center;
- Content Factory для массового производства учебных материалов.

Ключевая продуктовая идея:

> обучение, код, проекты, прогресс, Skill Graph, облачное состояние и AI-наставник должны быть одной инженерной системой, а не набором несвязанных страниц.

---

# 2. Правила совместной работы

## 2.1. Язык

Пользователь отдельно зафиксировал:

- все **коммиты** — на русском;
- все **названия релизов** — на русском;
- все **описания релизов / примечания к выпуску** — на русском;
- пользовательская документация — преимущественно на русском;
- technical identifiers можно оставлять как есть: `Identity v2`, `Cloud Sync`, `PUSH`, `PULL`, `nxk`, `nxs`, API routes, version strings и т. п.

## 2.2. Режимы ChatGPT

Ассистент должен сам подсказывать режим:

- `Средний` — короткие UI-правки, тексты, небольшой smoke;
- `Высокий` — основная разработка, архитектура, интеграции, миграции, сложные дефекты;
- `Очень высокий` — Identity, OAuth, cookies, IAM, security gates, крупная regression, финальные release gates;
- `Pro` — особенно тяжёлые комплексные аудиты / исследования.

## 2.3. Рабочий ритм

Предпочтение пользователя:

1. один операционный шаг;
2. пользователь выполняет;
3. присылает скрин / вывод;
4. ассистент проверяет;
5. только потом следующий шаг.

Не выдавать длинную цепочку разрушительных действий сразу.

## 2.4. Доказуемость

Проект ведётся с инженерной доказательностью для ВКР / диплома:

- requirements;
- architecture;
- decisions;
- defects;
- failed experiments;
- automated tests;
- LIVE tests;
- screenshots;
- hashes;
- rollback path;
- release artefacts.

Не скрывать неудачные эксперименты: причина → исправление → regression gate → evidence.

---

# 3. Security-инварианты

Никогда не просить пользователя присылать или показывать:

- `BOOTSTRAP_SECRET`;
- полный `nxk_...`;
- полный `nxs_...`;
- OAuth client secret;
- recovery credentials;
- реальные session secrets;
- пароли.

Raw credentials не должны:

- попадать в GitHub;
- попадать в screenshots/evidence;
- печататься в controlled test console;
- отображаться в UI;
- попадать в Content JSON / Learning Events.

Нельзя автоматически ослаблять security ради удобства теста.

---

# 4. Главные runtime-контуры

На момент handoff существуют **два параллельных контура**.

## 4.1. Текущий рабочий production / rollback

```text
GitHub repository
   ↓
GitHub Pages
   ↓
AKRONIKL IT NEXUS frontend v0.1.7-alpha.2.4.5
   ↓
Cloudflare Worker: akronikl-nexus-sync.akronikl.workers.dev
   ↓
Cloudflare D1: akronikl-nexus-sync
```

Это **не уничтожать и не переключать автоматически**.

## 4.2. Yandex Cloud Pilot

```text
GitHub Pages — источник frontend
        ↓
Yandex API Gateway — единый HTTPS origin
        ├── /, /core/*, /styles/*, /assets/* → GitHub Pages proxy
        └── /api/health → PRIVATE Serverless Container
                              ↓
                        Node.js backend
```

Цель Yandex Pilot — получить безопасный first-party origin для backend/session/OAuth, при этом **GitHub остаётся главным репозиторием и источником frontend**.

---

# 5. Версионная история Identity / Cloud до текущей точки

## `v0.1.7-alpha.2.2.1`

Cloudflare Sync Transport:

- Worker + D1;
- Nexus Token `nxk_...`;
- first-owner bootstrap;
- D1-only snapshots;
- `PULL/PUSH`;
- cross-device;
- optimistic concurrency;
- `409 REVISION_CONFLICT`;
- cloud project list/import;
- audit.

LIVE подтверждались:

- account bootstrap;
- PUSH revisions;
- PULL;
- PC ↔ iPhone;
- stale revision conflict;
- recovery через PULL + новый PUSH.

## `v0.1.7-alpha.2.3`

Большой baseline-цикл:

- Current State Audit;
- Requirements Baseline;
- Architecture Baseline;
- Data Baseline;
- Identity & Security Design;
- AI Research Design;
- Product / Competitive Research;
- Baseline Closure.

Текущая архитектура того периода: GitHub Pages → browser/PWA → Cloudflare Worker → D1.

## `v0.1.7-alpha.2.4.1`

Account Shell Foundation:

- global Account chip;
- Account Center;
- Profile / Nexus Cloud / Learning / Devices / Security;
- Nexus Cloud Token как alpha bridge;
- Yandex/Google/Apple/Phone/Passkey — planned;
- raw token не показывается;
- Desktop / iPhone / Android UI baseline.

## `v0.1.7-alpha.2.4.2`

Identity v2 Session Foundation.

D1 migration 0004:

- `account_devices`;
- `account_sessions`;
- `identity_security_events`.

Session model:

- raw `nxs_...` не хранится в D1;
- хранится `secret_hash`;
- idle timeout: 60 минут;
- absolute timeout: 8 часов;
- revoke current/specific/all/device;
- security audit;
- controlled legacy bridge.

Worker routes:

- `GET /api/v2/auth/capabilities`
- `POST /api/v2/session/bridge`
- `GET /api/v2/session`
- `DELETE /api/v2/session`
- `GET /api/v2/sessions`
- `POST /api/v2/sessions/revoke-all`
- `DELETE /api/v2/sessions/:id`
- `GET /api/v2/devices`
- `DELETE /api/v2/devices/:id`

Controlled LIVE:

```text
nxk → bridge → nxs → authenticate → list/current → revoke
→ same nxs → 401 INVALID_SESSION → D1 revoked → audit → bridge=false
```

## `v0.1.7-alpha.2.4.3`

Devices & Sessions Foundation:

- live Devices API;
- live Sessions API;
- current server session;
- revoke session/device;
- `sessionStorage`-only `nxs`;
- session-first resolver для Account Center;
- legacy fallback;
- bridge не включается автоматически.

Desktop/iPhone/Android smoke — PASS.

## `v0.1.7-alpha.2.4.3.1`

Cloud UX & Account Routing Cleanup:

- Cloud setup перенесён в Account Center;
- из `Проекты` убрана двусмысленная кнопка `Cloud Sync`;
- dashboard: `+ Новый проект`, `↓ Из облака`, `← Программирование`;
- `SYNC` внутри проекта отвечает только за `PUSH/PULL/revisions/audit`.

LIVE-дефект `Nexus Cloud` → неправильная вкладка `Безопасность` исправлен mapping hotfix.

## `v0.1.7-alpha.2.4.3.2`

Identity Session UI State Refresh Hotfix:

- revoke server session;
- очистка `sessionStorage`;
- automatic legacy fallback;
- UI state меняется без F5;
- disposable device revoke;
- рабочее устройство остаётся active.

Перед `2.4.4` D1 контроль:

```text
devices=2
active_devices=1
revoked_devices=1
sessions=3
active_sessions=0
revoked_sessions=3
security_events=7
```

## `v0.1.7-alpha.2.4.4`

Русское название:

**Переход Cloud Sync на приоритет серверных сессий**

Цель:

- Project Studio / Cloud Sync начинает использовать `nxs` первой;
- `nxk` остаётся controlled rollback;
- legacy fallback разрешён только после допустимого invalid-session `401`;
- `403`, `409`, network error, `5xx` не должны запускать fallback.

Основной flow:

```text
nxs available?
   ↓ yes
use nxs
   ↓
success → done

401 INVALID_SESSION
   ↓
clear stale nxs
   ↓
exactly one nxk retry

403 / 409 / network / 5xx
   ↓
NO FALLBACK
```

Критический boot-дефект `Identifier 'credential' has already been declared` был исправлен. После него введён обязательный **реальный ESM import smoke** в дополнение к `node --check`.

Controlled LIVE:

- PULL через `nxs` — PASS;
- PUSH через `nxs` — PASS;
- cloud rev `7 → 8` — PASS;
- stale `nxs` → `401` — PASS;
- очистка stale session — PASS;
- ровно один legacy retry — PASS;
- Android rev 8 — PASS;
- iPhone rev 8 — PASS;
- cleanup device/session — PASS.

Финальный D1 `2.4.4`:

```text
devices            3
active_devices     1
revoked_devices    2
sessions           4
active_sessions    0
revoked_sessions   4
security_events    10
```

---

# 6. Текущая frontend-версия — `v0.1.7-alpha.2.4.5`

Русское рабочее название:

**Фундамент first-party HttpOnly-сессий**

## 6.1. Что добавлено

Worker health/version:

```text
0.1.7-alpha.2.4.5-first-party-cookie-foundation
```

Foundation capabilities:

```text
identityV2SessionFoundation = true
identityV2BridgeEnabled = false
identityV2CookieSessionFoundation = true
identityV2CookieSessionEnabled = false
firstPartyDeploymentRequired = true
```

Cookie policy foundation:

```text
name      = __Host-nexus_session
HttpOnly  = true
Secure    = true
SameSite  = Strict
HostOnly  = true
idle      = 60 min
absolute  = 8 h
```

## 6.2. Двухключевая защита

Production variables:

```text
FIRST_PARTY_SESSION_ENABLED=false
FIRST_PARTY_DEPLOYMENT_CONFIRMED=false
```

Controlled tests:

```text
false + false → 409 FIRST_PARTY_SESSION_DISABLED .... PASS
true  + false → 409 FIRST_PARTY_SESSION_DISABLED .... PASS
return to false + false ............................. PASS
```

Реальный cookie transport **не активирован**.

## 6.3. No Set-Cookie baseline

При обычном Cloud Sync PULL через текущий production:

```text
Set-Cookie отсутствует
```

То есть foundation существует, но normal production flow не создаёт cookie скрытно.

## 6.4. Regression

После обновления frontend/Worker `2.4.5`:

- Desktop — PASS;
- Account Center — PASS;
- Project Studio — PASS;
- Cloud Sync PULL rev 8 — PASS;
- `auth transport: legacy fallback` сохранён;
- Android — PASS;
- iPhone — PASS;
- PWA cache transition `2.4.4 → 2.4.5` — PASS.

Финальный D1 после `2.4.5` не изменился:

```text
devices            3
active_devices     1
revoked_devices    2
sessions           4
active_sessions    0
revoked_sessions   4
security_events    10
```

`v0.1.7-alpha.2.4.5` считать **FULL LIVE PASS**.

---

# 7. Production Identity-инварианты после `2.4.5`

Сохранить строго:

1. bridge не включать автоматически;
2. production bridge = `false`;
3. `403` не запускает legacy fallback;
4. `409 REVISION_CONFLICT` не запускает legacy fallback;
5. legacy fallback только после допустимого `401` invalid-session;
6. relink/disconnect — отзывать предыдущую/current server session по возможности;
7. browser session credential очищать на trust boundary;
8. raw credentials не рендерить;
9. Cloudflare production не ломать во время Yandex Pilot;
10. real cookie transport не считать работающим до отдельного LIVE probe.

---

# 8. Project Studio / Cloud Sync — что нельзя сломать

Сохранить:

- local-first model;
- multi-file editor;
- checkpoints;
- runtime/build;
- `PUSH`;
- `PULL`;
- local revision;
- cloud revision;
- optimistic concurrency;
- `409 REVISION_CONFLICT`;
- audit `sync.pushed` / `sync.pulled`;
- ACL semantics;
- D1-only snapshots в текущем Cloudflare production;
- Cloud setup только через Account Center.

Тестовый проект:

```text
Экспедиция — Sync Test1-2
cloud rev: 8
```

Тестовый комментарий:

```cpp
// SESSION_FIRST_PUSH_244
```

---

# 9. Почему начат Yandex Cloud Pilot

Проблема current production:

```text
Frontend: github.io
Backend:  workers.dev
```

Это разные origins/sites, поэтому clean first-party `HttpOnly + Secure + SameSite=Strict` architecture неудобно включать как normal auth transport.

Решение: не переносить GitHub как систему разработки, а добавить **Yandex API Gateway как единый HTTPS origin**.

Ключевое решение:

> GitHub остаётся главным репозиторием и источником frontend. Yandex Cloud — pilot/runtime для backend, first-party session и будущей OAuth/Yandex ID архитектуры.

---

# 10. Yandex Cloud Pilot — подтверждённые ресурсы

## Облако

```text
name: akronikl-nexus-pilot
cloud-id: blg9kjv7pkdbfhm7psgk
```

## Каталог

```text
name: nexus-pilot
folder-id: b1gulmnvng1iv3gr7obr
```

> Если ID когда-либо расходится с CLI — считать `yc config list` / текущую консоль каноническим источником и не угадывать вручную.

## Пользователь CLI

```text
subject-id: ajeio37f9f3h2p3uplq2
Yandex username: iwan-tchuprakov
email: iwan.tchuprakov@yandex.ru
federation id: пусто
```

Тип субъекта: обычный `userAccount`, не federated user.

## API Gateway

```text
name: akronikl-nexus-pilot-gateway
status: Active
```

Служебный HTTPS-domain выдан Yandex. Точный domain брать из карточки Gateway; не перепечатывать вручную из старого скриншота при security-настройках.

## Private Object Storage bucket

```text
akronikl-nexus-pilot-static-20260930
```

- размер ограничен 1 GB;
- Standard storage;
- public object read = OFF;
- public list = OFF;
- settings read = authorized;
- versioning = OFF;
- собственный KMS key не используется.

Object Storage использовался для YC-3 proof; текущий frontend YC-4+ уже проксируется с GitHub Pages, но bucket сохранять — он пригодится для assets/user files/content/backups.

## Gateway service account

```text
name: nexus-pilot-gateway-sa
id: aje16buj65j2nmv26ob8
```

Права:

- `storage.viewer` на private bucket;
- `serverless-containers.containerInvoker` на `nexus-pilot-backend`.

## Container Registry

```text
name: nexus-pilot-registry
id: crp26t5as9vgmqmvsau4
status: Active
automatic vulnerability scanning: OFF
```

## Backend runtime service account

```text
name: nexus-pilot-backend-runtime-sa
id: aje1hrso7lva9bnio5b4
status: ACTIVE
```

Права:

- `container-registry.images.puller` на `nexus-pilot-registry`.

Пользователь `iwan-tchuprakov` имеет:

- `iam.serviceAccounts.user` на `nexus-pilot-backend-runtime-sa`.

## Serverless Container

```text
name: nexus-pilot-backend
container-id: bba6huejo1mqo4a6lfk1
runtime: http
```

Первая ревизия:

```text
revision-id: bba854tl7o0n0hrggkpe
image: cr.yandex/crp26t5as9vgmqmvsau4/nexus-pilot-backend:yc5-1
vCPU: 1
core fraction: 100
RAM: 128 MB
execution timeout: 15 s
concurrency: 1
logging: disabled
status: ACTIVE
```

Runtime service account:

```text
aje1hrso7lva9bnio5b4
```

---

# 11. Yandex Cloud Pilot — этапы и результаты

## YC-0 — Account / Billing / Clean Pilot

- старые базы/облако были удалены ранее;
- существующий billing account `account-426` найден;
- cloud `akronikl-nexus-pilot` создан;
- отдельный folder `nexus-pilot` создан;
- GitHub/Cloudflare production не менялся.

## YC-1 — isolated folder

```text
akronikl-nexus-pilot
└── nexus-pilot
```

PASS.

## YC-2 — API Gateway proof

Сначала `dummy` routes:

```text
/           → test HTML
/api/health → dummy JSON
```

Оба маршрута дали `200` через один `*.apigw.yandexcloud.net` origin.

PASS.

## YC-3 — private Object Storage proof

Цепочка:

```text
Internet
  ↓
API Gateway
  ↓
nexus-pilot-gateway-sa
  ↓
PRIVATE Object Storage
  ↓
index.html
```

- bucket оставался private;
- `storage.viewer` назначен на bucket;
- UI-конструктор Object Storage integration давал `403`;
- ручной OpenAPI YAML с `object_storage` сработал;
- `/` отдал `index.html` из private bucket;
- `/api/health` сохранился.

PASS.

Важный lesson:

> если Yandex API Gateway visual/dynamic form падает `403`, при корректном IAM допустимо перейти к ручной OpenAPI спецификации вместо бесконечной борьбы с UI.

## YC-4 — GitHub Frontend Proxy

Принято архитектурное решение **не копировать весь frontend в Object Storage**.

API Gateway проксирует frontend с GitHub Pages:

```text
/                → GitHub Pages root
/{path+}         → GitHub Pages assets/routes
/api/*           → зарезервировано под Yandex backend
```

Проверено:

- настоящий Nexus `v0.1.7-alpha.2.4.5` загружается через Yandex Gateway;
- CSS/JS/assets — PASS;
- Account Shell — PASS;
- local profile ожидаемо новый, т. к. Yandex origin имеет отдельный localStorage/sessionStorage;
- `fetch('/api/health')` работает same-origin.

PASS.

## YC-5 — Yandex Backend Foundation

Минимальный backend построен как Node.js Docker image.

Backend health:

```json
{
  "ok": true,
  "service": "nexus-pilot-backend",
  "platform": "yandex-serverless-container",
  "stage": "yc-5",
  "identityFoundation": true,
  "sessionTransport": "not-enabled"
}
```

Security headers baseline:

```text
Cache-Control: no-store
X-Content-Type-Options: nosniff
```

Подтверждения:

```text
LOCAL DOCKER .............. PASS
REGISTRY PUSH ............. PASS
SERVERLESS REVISION ....... PASS
PRIVATE HTTPS INVOKE ...... PASS
GATEWAY → CONTAINER ....... PASS
SAME-ORIGIN /api/health ... PASS
```

В браузере Nexus через Yandex Gateway:

```text
fetch('/api/health')
STATUS: 200
ORIGIN: https://<gateway>.apigw.yandexcloud.net
BACKEND.service: nexus-pilot-backend
BACKEND.platform: yandex-serverless-container
BACKEND.stage: yc-5
```

**YC-5 считать закрытым как PASS.**

---

# 12. Текущая API Gateway архитектура после YC-5

Логически:

```text
Yandex API Gateway
│
├── GET /api/health
│      ↓
│   serverless_containers
│      ↓
│   nexus-pilot-backend
│
├── /api
│      ↓
│   reserved / controlled 404
│
├── /api/{apiPath+}
│      ↓
│   reserved namespace
│
├── /
│      ↓
│   HTTP proxy → GitHub Pages
│
└── /{path+}
       ↓
    HTTP proxy → GitHub Pages assets/routes
```

Инвариант:

> Cookie/Authorization headers не пересылать GitHub upstream без явной необходимости.

---

# 13. Текущий backend image / local source

Рабочая локальная папка на Windows была создана:

```text
%USERPROFILE%\Desktop\nexus-pilot-backend
```

Файлы:

```text
server.mjs
Dockerfile
.dockerignore
```

Docker image local tag:

```text
nexus-pilot-backend:yc5-1
```

Registry image:

```text
cr.yandex/crp26t5as9vgmqmvsau4/nexus-pilot-backend:yc5-1
```

Backend должен слушать:

```text
process.env.PORT || 8080
```

Container runtime: Linux/amd64.

---

# 14. IAM matrix — текущая каноническая модель

```text
USER: iwan-tchuprakov
  └── iam.serviceAccounts.user
      → nexus-pilot-backend-runtime-sa

nexus-pilot-backend-runtime-sa
  └── container-registry.images.puller
      → nexus-pilot-registry

nexus-pilot-gateway-sa
  ├── storage.viewer
  │   → akronikl-nexus-pilot-static-20260930
  │
  └── serverless-containers.containerInvoker
      → nexus-pilot-backend
```

Не расширять роли до всего folder/cloud без необходимости.

Принцип: least privilege.

---

# 15. YC-6 Session Transport Probe — FULL LIVE PASS

`YC-6 Session Transport Probe` закрыт 2026-10-01 как **FULL LIVE PASS**.

Цель этапа — экспериментально доказать безопасный first-party session transport через единый Yandex HTTPS origin до приватного Serverless Container без browser-readable long-lived session credential и без разрушения текущего GitHub/Cloudflare production rollback.

## 15.1. LIVE PASS — подтверждённые свойства

```text
SET-COOKIE ........................ PASS
HTTPONLY .......................... PASS
SECURE ............................ PASS
SAMESITE=STRICT ................... PASS
BROWSER STORAGE ................... PASS
AUTOMATIC COOKIE RETURN ........... PASS
JS document.cookie secret ......... NOT VISIBLE — PASS
BACKEND SESSION VISIBILITY ........ PASS
CLEAR / LOGOUT .................... PASS
POST-CLEAR cookiePresent .......... false — PASS
POST-CLEAR sessionResolved ........ false — PASS
COOKIE → GITHUB UPSTREAM .......... NOT FORWARDED — PASS
YC-5 /api/health REGRESSION ....... PASS
CLOUDFLARE PRODUCTION ROLLBACK .... PRESERVED
```

Рабочий подтверждённый transport path:

```text
Browser
  ↓
Yandex API Gateway
  ↓
cookie parameter
  ↓
operation context
  ↓
PRIVATE Serverless Container
  ↓
session resolution
```

Backend возвращает только безопасный результат разрешения session, а не raw credential:

```json
{
  "cookiePresent": true,
  "sessionResolved": true
}
```

После controlled clear/logout последующий read подтвердил:

```json
{
  "cookiePresent": false,
  "sessionResolved": false
}
```

Raw probe/session secrets в MASTER, release/evidence документации, screenshots и logs не сохранять.

## 15.2. Закрытый архитектурный риск

До YC-6 было неизвестно, в каком виде cookie/session input сможет пройти через Yandex API Gateway до private Serverless Container. YC-6 доказал поддерживаемый путь через `cookie parameter → operation context`, поэтому предположение о прямом `req.headers.cookie` больше не является обязательным условием архитектуры.

## 15.3. Failed experiment — `container_id`

Во время LIVE probe получен:

```text
404 Container not found
```

Root cause: при ручной перепечатке `container_id` символ `o` был ошибочно заменён на `0`.

Причина подтверждена machine-readable char-code проверкой. Исправлены ровно **3** ссылки с неправильным идентификатором. После исправления regression — **PASS**.

Инженерный вывод:

> cloud/resource IDs не перепечатывать вручную; использовать canonical CLI/console output, copy-from-source и при сомнении machine-readable character comparison.

## 15.4. Rollback evidence

Сохранена YC-5 Gateway rollback-spec.

```text
SHA256: 1563AE432F3F026CDA10F3737E06F6B7E7812EE6D73F618AAF8B42F1075E2828
```

Cloudflare production rollback также сохранён.

## 15.5. Что YC-6 не означает

YC-6 доказывает session transport prerequisite, но **не** означает, что уже реализованы:

- production Nexus Account authentication;
- Internal authentication;
- Yandex ID / OAuth/OIDC;
- Google / Apple login;
- Passkeys / MFA / recovery;
- production cutover с Cloudflare на Yandex.

Следующий Identity milestone:

```text
Nexus Account / Login Methods Foundation
```

---

# 16. Identity roadmap после YC-6

Предварительная последовательность:

```text
YC-6  first-party HttpOnly session transport proof  [FULL LIVE PASS]
   ↓
Nexus Account / Login Methods Foundation            [NEXT]
   ↓
Internal authentication
   ↓
OAuth/OIDC provider broker
   ↓
Yandex ID
   ↓
Google / Apple
   ↓
Passkeys / MFA / recovery
   ↓
Cloud Profile
```

Нумерация релизов может корректироваться после архитектурного аудита.

---

# 17. Целевая модель Nexus Account

Nexus Account не должен быть равен конкретному провайдеру.

Правильная модель:

```text
NexusAccount
│
├── accountId
├── profile
├── roles
├── settings
│
├── Login Methods
│   ├── Nexus Password
│   ├── Passkey
│   ├── Yandex ID
│   ├── Google
│   └── Apple
│
├── Devices
├── Sessions
└── Security Events
```

Внешний provider — способ доказать identity, а не сама сущность account.

Возможная DB-модель:

```text
accounts
account_credentials
oauth_identities
passkeys
account_devices
account_sessions
identity_security_events
```

Для password auth:

- не хранить raw password;
- modern strong password hashing (`Argon2id` или эквивалент после security review);
- rate limiting;
- email verification;
- recovery/reset;
- session revoke;
- device audit.

---

# 18. Cloudflare production пока остаётся rollback

Текущий Cloudflare Worker / D1 нельзя удалять после появления Yandex Pilot.

Нужно сохранить controlled migration:

```text
CURRENT PROD
GitHub Pages + Cloudflare Worker + D1

PARALLEL PILOT
GitHub Pages source + Yandex API Gateway + Serverless backend
```

Cutover только после:

- same-origin session transport PASS — **выполнено в YC-6**;
- Identity flow PASS — ещё не закрыто;
- Desktop PASS;
- Android PASS;
- iPhone PASS;
- Cloud Sync regression PASS;
- D1/data migration plan;
- rollback evidence.

---

# 19. Content Production — отдельная параллельная линия

Рабочая ветка:

```text
feature/content-production-foundation
```

Главное правило:

> Content не зависит от конкретной реализации Identity.

Нельзя связывать Content напрямую с:

- `nxk`;
- `nxs`;
- cookies;
- Yandex ID;
- Google ID;
- Cloudflare auth;
- конкретным OAuth provider.

Использовать abstraction уровня:

```text
learnerId
```

Позже Cloud Profile / Identity подключаются через adapter.

## Статус

Пользователь подтвердил, что в отдельной ветке **CP-0 — Content Foundation Audit выполнен**.

В Library найден также `CP1_1_APPLY_INSTRUCTIONS.txt`, что фиксирует подготовку `CP-1.1 Content Contract`.

**Не заявлять, что CP-1.1 уже применён/закрыт, если отдельная ветка этого явно не подтвердила.**

## CP-1.1 подготовленный contract

Инструкция предполагает additive-only overlay, который создаёт:

- `content/`;
- новые документы;
- `tools/validate-content.mjs`;
- `tests/content-contract.test.mjs`.

Проверки:

```text
node tools/validate-content.mjs
node --test tests/content-contract.test.mjs
```

В реальном repo validator должен видеть:

```text
PASS production-cpp-id-compatibility
```

и не должен предупреждать об отсутствии `courses/cpp/curriculum.json`.

Что CP-1.1 не должен менять:

- текущий C++ UI;
- progress/localStorage contract;
- Project Studio runtime;
- Identity/OAuth;
- Cloud Sync;
- Worker/D1;
- service-worker cache list.

Рекомендуемый коммит:

```text
архитектура: заложить фундамент системы образовательного контента Nexus
```

---

# 20. Content Model target

Базовая структура:

```text
Catalog
└── Course
    └── Module
        └── Topic
            └── Skill
                ├── Theory
                ├── Example
                ├── Exercise
                ├── Practice
                ├── Quiz
                ├── Lab
                ├── Project
                ├── Assessment
                └── Mastery Evidence
```

Контент не должен быть набором HTML, жёстко прошитых в JS.

Разделять:

- content data;
- UI;
- progress;
- assessment;
- execution/test engine;
- cloud storage;
- analytics.

Предпочтительные форматы:

- JSON;
- Markdown;
- assets;
- JSON Schema.

---

# 21. Stable Content IDs

Минимум:

```text
courseId
moduleId
topicId
skillId
exerciseId
quizId
labId
projectId
assessmentId
```

Пример:

```text
courseId:   cpp-foundation
moduleId:   cpp-foundation.basics
topicId:    cpp.variables
skillId:    cpp.variables.declaration
exerciseId: cpp.variables.declaration.ex001
```

Название не использовать как единственный ID.

---

# 22. Skill Graph / Mastery / Learning Events

Skill Graph должен быть графом prerequisites, а не только линейной программой.

Skill fields:

```text
skillId
title
description
prerequisites
relatedSkills
difficulty
estimatedTime
learningObjectives
competencies
masteryRules
```

Mastery states:

```text
not_started
introduced
practicing
proficient
mastered
```

Mastery не может определяться только открытием страницы.

Учитывать:

- correctness;
- attempts;
- hints;
- retries;
- quiz;
- exercises;
- labs;
- projects;
- repeated success;
- delayed review.

Learning Event example:

```json
{
  "eventType": "exercise.completed",
  "learnerId": "...",
  "courseId": "cpp-foundation",
  "skillId": "cpp.variables.declaration",
  "exerciseId": "cpp.variables.declaration.ex001",
  "result": "success",
  "attempt": 2,
  "hintsUsed": 1,
  "timestamp": "..."
}
```

---

# 23. Content Production roadmap

```text
CP-0  Content Foundation Audit                [подтверждён пользователем как выполненный]
CP-1  Canonical Content Model
CP-2  Schemas + Validators
CP-3  Skill Graph Foundation
CP-4  Mastery + Learning Events
CP-5  Reference C++ Dataset
CP-6  C++ Gold Standard Module
CP-7  Progress Integration
CP-8  Content Authoring Tools
CP-9  CMS / Content Control Center
CP-10 Content Factory
CP-11 Mass Course Production
```

Первый эталонный курс:

**C++ — Основы программирования**.

Сначала один Gold Standard Module, а не массовое наполнение.

---

# 24. Content / Project Studio integration target

```text
Topic
 ↓
Exercise / Lab / Project
 ↓
Open in Project Studio
 ↓
starter project
 ↓
Run
 ↓
Tests
 ↓
Result
 ↓
Learning Event
 ↓
Mastery
```

Project Studio не должен хранить копию учебного текста; получает assignment/project definition.

---

# 25. Progress abstraction

Пока Cloud Profile не готов:

```text
ProgressProvider
├── LocalProgressProvider
└── CloudProgressProvider   (later)
```

Не привязывать Course UI напрямую к `localStorage`.

Цель:

```text
Identity
 ↓
Cloud Profile
 ↓
learnerId
 ↓
Progress
 ↓
Learning Events
 ↓
Mastery
```

---

# 26. Release discipline

Для каждого существенного релиза / hotfix сохранять:

```text
PATCH / OVERLAY
FULL
UPLOAD_INSTRUCTIONS
BUILD_VERIFICATION
CHANGESET / CHANGELOG
SHA256SUMS
RELEASE
ARCHITECTURE_DELTA
SECURITY_DELTA
TEST_MATRIX
LIVE_TEST_PROTOCOL
COMMIT_MESSAGE
PROJECT_JOURNAL
ADR при архитектурных решениях
DEFECT_LOG
screenshots / evidence
финальный статус PASS / PARTIAL / FAIL
```

Для крупных закрытий:

```text
FINAL_GITHUB_REPO_OVERLAY.zip
FULL_WITH_EVIDENCE.zip
EVIDENCE_ORIGINALS.zip
SHA256SUMS_FINAL.txt
FINAL_GITHUB_READY_RELEASE_KIT.zip
RELEASE_NOTES_GITHUB.md
GITHUB_PUBLISH_GUIDE.md
```

Все release/commit descriptions — по-русски.

---

# 27. Build / regression gates

После дефекта `2.4.4` обязательны оба уровня:

```text
node --check
+
реальный ESM import smoke
```

Для frontend release нельзя считать syntax-only check достаточным.

Для content:

```text
schema validation
reference validation
duplicate IDs
broken prerequisites
missing refs
orphan content
code/test validation
mobile rendering
```

---

# 28. Mobile / PWA

Крупные milestones проверять:

```text
Desktop
Android
iPhone
PWA
```

Сохранять evidence.

Учитывать service worker/cache transition; старый badge после deploy не считать автоматически runtime defect, пока не проверены deployment + CDN + hard refresh.

---

# 29. GitHub strategy

**GitHub не покидаем.**

GitHub остаётся:

- source of truth для кода;
- commits;
- branches;
- releases;
- docs;
- дипломная история;
- CI/CD.

Yandex Pilot не является отказом от GitHub.

Текущая архитектура YC-4 использует GitHub Pages как frontend upstream.

---

# 30. GitHub connector / Project integration

В новом ChatGPT Project полезно подключить GitHub connector, чтобы новые чаты могли читать актуальный `main` напрямую.

Если connector не подключён, приложить актуальный ZIP `main`.

**Не использовать старый истёкший ZIP как доказательство current main.**

---

# 31. Файлы, которые желательно добавить в новый ChatGPT Project

Минимальный комплект:

1. этот файл `AKRONIKL_IT_NEXUS_FULL_PROJECT_HANDOFF_2026-09-30.md`;
2. `AKRONIKL_IT_NEXUS_CONTENT_PRODUCTION_HANDOFF.md`;
3. `AKRONIKL_IT_NEXUS_FULL_HANDOFF_2026-09-29_v0.1.7-alpha.2.4.4.md` — как исторический engineering handoff;
4. актуальный `akronikl-it-nexus-main.zip` **или** подключённый GitHub connector;
5. CP-0 audit / CP-1.1 artefacts из отдельной Content Production ветки, если они сохранены отдельно;
6. текущие Yandex Pilot screenshots/evidence при подготовке formal release/evidence package.

Часть старых attachment-ов из прошлых чатов уже истекла. Если новый Project должен анализировать конкретный старый ZIP/скрин/patch, этот файл нужно приложить заново или брать каноническую копию из Library/GitHub.

---

# 32. Known lessons / дефекты

## Cloud / Identity

- CORS/preflight может выглядеть как auth failure; проверять Network `OPTIONS/POST`.
- `403` — не повод менять credential.
- `409 REVISION_CONFLICT` — не повод менять credential.
- stale server session fallback должен быть контролируемым и одноразовым.

## Frontend modules

`node --check` недостаточен; нужен real import smoke.

## Yandex API Gateway

Visual integration builder может возвращать `403` даже при корректной архитектуре IAM; ручной OpenAPI YAML уже доказан как рабочий путь.

## Yandex CLI / PowerShell

- избегать длинных paste-блоков с backtick continuation, если UI/PowerShell склеивает строки;
- security-sensitive команды лучше давать по одной строке;
- не угадывать user login / ID — использовать `yc iam whoami`, `organization-manager user list`, `yc ... get`;
- `YC_CLI_INITIALIZATION` warning о version control service не мешал основным API-командам.

---

# 33. Что НЕ делать после переноса в Project

Не делать без отдельного controlled plan:

- не удалять Cloudflare Worker / D1;
- не выключать GitHub Pages;
- не переключать production на Yandex Pilot;
- не включать real cookie session без YC-6 probe;
- не включать OAuth/Yandex ID до session transport proof;
- не расширять IAM роли на весь cloud/folder без необходимости;
- не делать backend public только ради быстрого теста;
- не переносить session secret в `localStorage`/`sessionStorage` как “временное решение”;
- не смешивать Content Production и Identity/Security одним большим коммитом;
- не делать destructive database migration без rollback/evidence.

---

# 34. Текущий Security / Runtime summary

```text
GitHub frontend v0.1.7-alpha.2.4.5 ........ FULL LIVE PASS
Cloudflare production ..................... PRESERVED
Cloudflare D1 baseline .................... PRESERVED
2.4.5 cookie foundation ................... PASS
YC-6 first-party cookie transport probe ... FULL LIVE PASS
production Nexus auth session ............. NOT YET IMPLEMENTED

Yandex Cloud Pilot:
YC-0…YC-5 ................................ PASS
YC-6 Session Transport Probe .............. FULL LIVE PASS
API Gateway ............................... PASS
same-origin frontend ...................... PASS
GitHub frontend proxy ..................... PASS
private Object Storage .................... PASS
Container Registry ......................... PASS
private Serverless Container ............... PASS
private direct invoke ...................... PASS
Gateway → Serverless Container ............. PASS
/api/health backend 200 .................... PASS
cookie parameter → operation context ....... PASS
backend session visibility ................. PASS
clear/logout ............................... PASS
Cookie forwarding → GitHub upstream ........ NOT PRESENT — PASS

NEXT:
Nexus Account / Login Methods Foundation
```

---

# 35. Текущая архитектурная формула

```text
                         GITHUB
                           │
                 source / commits / releases
                           │
                           ▼
                    GitHub Pages
                           │
                    frontend upstream
                           │
                           ▼
                  YANDEX API GATEWAY
                     same HTTPS origin
                    ┌──────┴─────────┐
                    │                │
                    ▼                ▼
              frontend proxy       /api/*
                                      │
                                      ▼
                            PRIVATE Serverless Container
                                      │
                                      ▼
                               Nexus backend

CURRENT PRODUCTION ROLLBACK:
GitHub Pages → Cloudflare Worker → D1
```

---

# 36. Дальнейшая большая архитектура

После session/OAuth/cloud profile:

```text
Identity
  ↓
Cloud Profile
  ↓
learnerId
  ↓
Progress
  ↓
Learning Events
  ↓
Mastery
  ↓
Learner Model
  ↓
Nexus AI
```

Content остаётся независимым от transport/provider.

---

# 37. Definition of Done для следующих security milestones

Для Identity/session milestone минимум:

```text
architecture documented
threat model reviewed
automated tests PASS
Desktop LIVE PASS
Android PASS
iPhone PASS
no Cloud Sync regression
no raw secret in UI/log/evidence
revoke/logout PASS
rollback confirmed
evidence captured
release documented
```

---

# 38. Следующий operational step в новом Project

`YC-6 Session Transport Probe` уже закрыт как **FULL LIVE PASS** и не должен повторяться без regression-причины.

Следующий Identity milestone:

```text
Nexus Account / Login Methods Foundation
```

Перед реализацией реальной production-authentication сохранить инварианты YC-6:

- first-party HttpOnly transport;
- `Secure`;
- `SameSite=Strict`;
- session secret не доступен browser JavaScript;
- Cookie/session input не форвардится GitHub upstream;
- private backend boundary;
- least privilege IAM;
- controlled logout/revoke;
- Cloudflare production остаётся rollback до отдельного cutover gate.

Не переходить напрямую к Yandex ID/OAuth, минуя Nexus Account / Login Methods Foundation и отдельный security design/review.

---

# 39. Canonical project status line

> **AKRONIKL IT NEXUS на 2026-10-01: frontend `v0.1.7-alpha.2.4.5` остаётся подтверждённым FULL LIVE PASS baseline; GitHub остаётся source of truth; Cloudflare Worker + D1 сохранены как production rollback; Yandex Cloud Pilot закрыл `YC-0…YC-6`; `YC-6 Session Transport Probe` получил FULL LIVE PASS и доказал `Set-Cookie`, `HttpOnly`, `Secure`, `SameSite=Strict`, browser storage/automatic return, backend session visibility через `Yandex API Gateway cookie parameter → operation context → private Serverless Container`, clear/logout, отсутствие probe secret в `document.cookie` и отсутствие Cookie forwarding в GitHub upstream. Следующий Identity milestone — `Nexus Account / Login Methods Foundation`.**

---

# 40. Финальная инструкция новому чату

1. Считать handoff `2026-10-01` основной канонической точкой контекста.
2. Исторический handoff `2026-09-30` не удалять.
3. GitHub остаётся source of truth; не возвращаться к плану полного отказа от GitHub.
4. Не повторять закрытые `YC-0…YC-6` без причины/regression-задачи.
5. Следующий Identity milestone — `Nexus Account / Login Methods Foundation`.
6. Для Identity/OAuth/cookies/IAM/security gates использовать `Очень высокий`; для обычной release/documentation работы — `Высокий`.
7. После каждого operational step ждать подтверждение пользователя.
8. Все коммиты / названия релизов / release notes / пользовательская документация — на русском.
9. Не просить и не сохранять raw probe/session secrets.
10. Любое расширение IAM — только least privilege.
11. Cloudflare production сохранять как rollback до formal cutover gate.
12. Перед production cutover обязательно иметь formal evidence / rollback / release kit.

---

# 41. PROJECT OPERATING MODEL — как теперь работать внутри ChatGPT Project

Этот раздел закрепляет новую организационную модель. После переноса в Project **не нужно держать одну бесконечную ветку чата**. Project должен быть постоянным контейнером контекста, а отдельные чаты — рабочими потоками по конкретным задачам.

## 41.1. Канонические уровни контекста

Использовать приоритет источников:

```text
1. FINAL MASTER HANDOFF
   ↓
2. актуальный GitHub main / текущая рабочая ветка
   ↓
3. milestone-specific evidence / release kit
   ↓
4. сообщения текущего чата
   ↓
5. старые исторические handoff / screenshots
```

Если старый чат противоречит текущему GitHub / последнему handoff, **приоритет у последнего подтверждённого состояния**.

## 41.2. Что добавить в Sources проекта

Минимально рекомендуемый набор:

```text
AKRONIKL_IT_NEXUS_FINAL_MASTER_HANDOFF_2026-10-01.md
AKRONIKL_IT_NEXUS_FINAL_MASTER_HANDOFF_2026-09-30.md   # historical, keep
AKRONIKL_IT_NEXUS_CONTENT_PRODUCTION_HANDOFF.md
AKRONIKL_IT_NEXUS_FULL_HANDOFF_2026-09-29_v0.1.7-alpha.2.4.4.md
CP1_1_APPLY_INSTRUCTIONS.txt
актуальный akronikl-it-nexus-main.zip ИЛИ GitHub connector
```

По мере появления добавить:

```text
DIPLOMA_MASTER_LEDGER.md
ARCHITECTURE_DECISIONS.md / ADR/*
THREAT_MODEL.md
ERD / C4 / sequence diagrams
API_SPEC / OpenAPI
TEST_MATRIX
EVIDENCE_INDEX
RELEASE_LEDGER
CONTENT_SCHEMA / SKILL_GRAPH docs
```

## 41.3. Рекомендуемая структура чатов внутри Project

Не вести всё в одном чате. Создавать независимые чаты, но все внутри одного Project:

```text
00 · START / MASTER COORDINATION
01 · ENGINEERING · YANDEX / IDENTITY / SECURITY
02 · ENGINEERING · PROJECT STUDIO / CODE STUDIO
03 · CONTENT PRODUCTION
04 · DIPLOMA / ВКР
05 · RELEASE / EVIDENCE / DOCUMENTATION
06 · RESEARCH / BENCHMARKS / COMPETITORS
07 · UI / UX / MOBILE / PWA
```

Дополнительные чаты создавать по milestone, если текущий становится слишком длинным:

```text
01.1 · YC-6 Session Transport Probe
01.2 · Nexus Account Foundation
01.3 · Yandex ID OAuth
...
```

При переходе в новый чат внутри Project **не нужно заново пересказывать весь проект**. Достаточно сослаться на FINAL MASTER HANDOFF и назвать milestone.

## 41.4. Первый чат нового Project

Первый чат назвать:

```text
00 · START · MASTER COORDINATION
```

Первое сообщение:

```text
Изучи FINAL MASTER HANDOFF проекта AKRONIKL IT NEXUS от 2026-10-01 полностью и считай его
канонической точкой. GitHub/Cloudflare production сохраняем как rollback.
Yandex Cloud Pilot закрыт до YC-6 включительно; YC-6 имеет FULL LIVE PASS. Следующий Identity milestone —
Nexus Account / Login Methods Foundation. Content Production и Diploma / ВКР ведём отдельными
параллельными треками внутри этого Project. Работаем пошагово: один operational
step → мой скрин/вывод → проверка → следующий step. Все коммиты, релизы,
release notes и пользовательская документация — на русском. Подсказывай режим
ChatGPT для каждого этапа.
```

## 41.5. Инструкции Project

В `Project settings → Instructions` рекомендуется вставить файл
`AKRONIKL_IT_NEXUS_PROJECT_INSTRUCTIONS_RU.txt` или его текст.

Ключевые принципы:

- FINAL MASTER HANDOFF — канонический контекст;
- GitHub — source of truth для кода;
- Cloudflare production не ломать без controlled cutover;
- Yandex Pilot развивать параллельно;
- Content / Identity / Diploma вести раздельными треками;
- security-sensitive работа — только пошагово;
- least privilege;
- не просить secrets;
- все русские release/commit descriptions;
- сохранять evidence для ВКР;
- советовать режим ChatGPT.

## 41.6. Когда открывать новый чат

Новый чат создавать, если:

- завершён крупный milestone;
- текущая ветка стала тяжёлой / близка к лимиту;
- меняется предметная область (например Identity → Content);
- нужен чистый security review;
- готовится формальный release/evidence пакет;
- начинается отдельный исследовательский эксперимент.

Перед закрытием старого чата:

```text
1. зафиксировать PASS/PARTIAL/FAIL;
2. обновить milestone handoff;
3. сохранить команды / IDs / версии;
4. сохранить defects / failed experiments;
5. сохранить evidence index;
6. записать точный NEXT STEP.
```

---

# 42. DIPLOMA / ВКР MASTER TRACK

AKRONIKL IT NEXUS официально вести не только как продукт, но и как **накопительную инженерно-исследовательскую основу будущей дипломной работы / ВКР**.

Главный принцип:

> Диплом не пишется задним числом. Каждый значимый milestone проекта должен
> одновременно создавать материал для будущей ВКР: требования, решение,
> обоснование, реализацию, эксперимент, тесты и доказательства.

## 42.1. Статус темы

Финальное название ВКР пока **не утверждено**. Рабочие варианты, которые можно позже адаптировать под методические требования вуза:

1. `Разработка инженерной образовательной IT-платформы с облачной синхронизацией и адаптивной моделью обучения`.
2. `Проектирование и разработка интеллектуальной образовательной платформы для обучения программированию`.
3. `Разработка браузерной образовательной IDE с моделью навыков, облачным профилем и интеллектуальным сопровождением обучения`.
4. `Архитектура и реализация образовательной платформы AKRONIKL IT NEXUS с Project Studio, Skill Graph и AI-наставником`.

До утверждения темы использовать термин:

```text
DIPLOMA / ВКР MASTER TRACK
```

## 42.2. Возможный объект исследования

Рабочая формулировка:

> процесс цифрового обучения программированию и управления индивидуальной
> образовательной траекторией в интерактивной программной среде.

Формулировка не финальная; адаптировать под кафедральные требования.

## 42.3. Возможный предмет исследования

> архитектурные, программные и информационные методы построения браузерной
> образовательной IDE, объединяющей учебный контент, практическое программирование,
> облачное состояние, модель навыков и персонализированное сопровождение.

## 42.4. Рабочая цель ВКР

> спроектировать, реализовать и экспериментально проверить целостную инженерную
> образовательную платформу, обеспечивающую изучение программирования, выполнение
> практических заданий и проектов, межустройственную синхронизацию, безопасную
> идентификацию пользователя, сбор учебных событий и основу адаптивной модели обучения.

## 42.5. Рабочие задачи ВКР

Предварительный набор:

1. провести анализ предметной области и существующих образовательных платформ;
2. сформировать функциональные и нефункциональные требования;
3. спроектировать модульную архитектуру Nexus;
4. разработать browser/PWA frontend и инженерную оболочку платформы;
5. реализовать Code Studio / Project Studio и runtime-контуры;
6. разработать local-first и cloud sync модель;
7. спроектировать Identity / Sessions / Devices / Security;
8. реализовать safe first-party session transport и OAuth provider layer;
9. разработать Content Model и стабильные ID;
10. разработать Skill Graph / Mastery / Learning Events;
11. сформировать learner/progress abstraction;
12. разработать тестовый и regression контур;
13. провести экспериментальную проверку на Desktop / Android / iPhone;
14. оценить надёжность, безопасность, производительность и удобство;
15. подготовить documentation/evidence/reproducibility package.

## 42.6. Практическая значимость

Нужно доказывать не декларацией, а реализацией:

- единая web/PWA среда обучения и программирования;
- реальный Project Studio;
- запуск кода/тестов;
- local-first + cloud;
- multi-device;
- Identity / Security;
- прогресс и Learning Events;
- структурированный контент;
- Skill Graph;
- возможность персонализации;
- воспроизводимая инженерная документация.

## 42.7. Предполагаемые элементы новизны — только как рабочие гипотезы

Не заявлять научную новизну без исследования и сравнения с литературой/аналогами.

Возможные направления для проверки:

- объединение IDE + learning content + project workflow + learner state в одном браузерном продукте;
- графовая модель навыков, связанная с реальными evidence из кода/тестов;
- local-first/cloud hybrid для учебных проектов;
- learner model на основе событий, а не только факта открытия урока;
- explainable mastery rules;
- provider-independent Identity и session model;
- разделение Content Domain от transport/identity provider;
- интеграция project artifacts в evidence образовательной траектории.

## 42.8. Исследовательские вопросы

Рабочий набор:

```text
RQ1. Насколько единая среда “теория → код → тест → проект → mastery” уменьшает
     разрыв между учебным материалом и практической работой?

RQ2. Как безопасно совместить local-first работу и cross-device cloud sync?

RQ3. Какие learning events достаточны для более достоверного mastery state,
     чем бинарное “урок открыт / не открыт”?

RQ4. Как Skill Graph влияет на построение образовательной траектории?

RQ5. Можно ли реализовать provider-independent account model с безопасной
     first-party session и внешними OAuth-провайдерами?

RQ6. Какие архитектурные компромиссы возникают между GitHub Pages,
     serverless backend и first-party security boundary?
```

## 42.9. Возможные гипотезы для будущего эксперимента

Не считать доказанными до измерения.

```text
H1. Событийная модель прогресса повышает точность оценки mastery по сравнению
    с completion-only моделью.

H2. Интеграция Project Studio с заданиями уменьшает количество ручных переходов
    и потерь контекста между теорией и практикой.

H3. Same-origin HttpOnly session уменьшает browser credential exposure по
    сравнению с browser-readable long-lived token.
```

## 42.10. Методология разработки и исследования

Комбинировать:

- requirements engineering;
- architecture design;
- iterative prototyping;
- controlled experiments;
- regression testing;
- security threat modeling;
- performance measurements;
- usability evaluation;
- comparative analysis;
- reproducibility/evidence collection.

## 42.11. Предварительная структура диплома

Структуру позже привести к методичке вуза.

### Глава 1. Анализ предметной области

- современное обучение программированию;
- web IDE / LMS / coding platforms;
- проблемы разрыва theory/practice;
- multi-device learning;
- аналоги и конкурентный анализ;
- постановка задачи.

### Глава 2. Требования и архитектура

- stakeholders;
- use cases;
- FR/NFR;
- C4 Context / Container / Component;
- frontend/runtime/cloud boundaries;
- local-first;
- Project Studio;
- Identity;
- Content Domain;
- data model;
- security architecture.

### Глава 3. Реализация платформы

- frontend shell;
- PWA;
- Code Studio;
- Project Studio;
- runtime;
- sync;
- Account Center;
- API;
- cloud infrastructure.

### Глава 4. Образовательная модель

- Content Model;
- stable IDs;
- Skill Graph;
- Learning Events;
- Mastery;
- ProgressProvider;
- Learner Model;
- связь assignment ↔ project ↔ evidence.

### Глава 5. Identity, Cloud и Security

- evolution Cloudflare → Yandex Pilot;
- sessions/devices;
- HttpOnly transport;
- OAuth/Yandex ID;
- IAM;
- threat model;
- rollback;
- audit.

### Глава 6. Тестирование и экспериментальная оценка

- automated regression;
- ESM/import checks;
- LIVE tests;
- Desktop/Android/iPhone;
- sync conflict tests;
- security probes;
- performance;
- usability;
- comparison with baseline/analogs.

### Заключение

- достигнутые результаты;
- ограничения;
- направления развития.

### Приложения

- схемы;
- OpenAPI;
- ERD;
- test protocols;
- screenshots;
- hashes;
- release excerpts;
- key source fragments;
- deployment/runbook.

## 42.12. Диаграммы, которые обязаны накопиться

```text
C4 Context
C4 Container
C4 Component
Deployment Diagram
ER Diagram
Identity sequence
OAuth sequence
Session lifecycle state machine
Cloud Sync sequence
PUSH/PULL conflict sequence
Project lifecycle
Content Model
Skill Graph example
Mastery state machine
Learning Event flow
Project Studio execution pipeline
Yandex IAM/resource map
Threat model / trust boundaries
Data flow diagram
```

Не рисовать все диаграммы в конце. Обновлять по milestone.

## 42.13. Дипломный Evidence Ledger

Для каждого milestone фиксировать:

```text
ID / дата
проблема
исходное состояние
требование
архитектурное решение
альтернативы
почему выбран текущий вариант
изменённые компоненты
автотесты
LIVE-тесты
результат
дефекты
исправления
rollback
скриншоты
commit
release/tag
SHA256
связь с главой ВКР
```

## 42.14. ADR — Architecture Decision Records

Значимые решения оформлять ADR:

```text
ADR-001 GitHub как source of truth
ADR-002 Cloudflare D1 sync baseline
ADR-003 Session-first Cloud Sync
ADR-004 First-party cookie foundation
ADR-005 Yandex API Gateway same-origin pilot
ADR-006 GitHub frontend proxy вместо полного frontend migration
ADR-007 Private Serverless Container backend
ADR-008 Provider-independent Nexus Account
...
```

Структура ADR:

```text
Status
Context
Decision
Alternatives
Consequences
Security impact
Migration / rollback
Evidence
```

## 42.15. Метрики для будущей экспериментальной части

### Engineering

- boot time;
- API latency p50/p95;
- runtime start latency;
- sync latency;
- cold/warm container behavior;
- payload size;
- cache hit behavior;
- error rate.

### Reliability

- successful PUSH/PULL;
- conflict detection;
- rollback success;
- session revoke latency;
- recovery success.

### Security

- browser-readable secrets = 0 для target auth;
- raw token logs = 0;
- unauthorized route behavior;
- revoked credential rejection;
- cookie flags;
- IAM least privilege checks.

### Learning

- completion;
- attempts;
- success rate;
- hint usage;
- delayed review;
- mastery transition;
- prerequisite violations;
- project/test evidence.

### UX

- task completion time;
- navigation steps;
- error recovery;
- mobile usability;
- cross-device continuity.

## 42.16. Конкурентный анализ для ВКР

Сравнивать не маркетинговыми лозунгами, а по матрице возможностей:

```text
content depth
browser IDE
multi-file projects
runtime languages
automated tests
project workflow
cloud sync
cross-device
skill graph
mastery model
learning events
AI mentor
team access
PWA/offline
identity/security
export
analytics
content authoring
```

Источники и дату проверки фиксировать отдельно, потому что конкуренты меняются.

## 42.17. Научные и технические источники

Постепенно собирать bibliography по темам:

- CS education;
- mastery learning;
- knowledge tracing;
- learning analytics;
- skill/knowledge graphs;
- intelligent tutoring systems;
- browser IDE / WASM;
- local-first software;
- distributed sync;
- OAuth/OIDC;
- WebAuthn/passkeys;
- web security;
- serverless architecture;
- HCI/usability.

Не генерировать фиктивные ссылки. Каждая ссылка должна быть проверяема.

## 42.18. Что сохранять из разработки специально для диплома

- initial requirements;
- architecture evolution;
- screenshots старых и новых UI;
- failed experiments;
- bug examples;
- threat decisions;
- D1/Yandex migration evidence;
- real terminal outputs;
- mobile evidence;
- benchmark results;
- release history;
- git history;
- code statistics;
- test statistics;
- version hashes.

## 42.19. Diploma Definition of Done

К моменту подготовки ВКР должны существовать:

```text
Requirements baseline
Architecture baseline
ERD
C4 set
Threat model
API specification
Content/Skill/Mastery model docs
Test matrix
Performance report
Usability report
Comparative analysis
Evidence ledger
Release ledger
Reproducibility guide
Deployment guide
Source code repository
Appendix package
```

---

# 43. YC-6 — выполненный controlled probe и release closure

`YC-6 Session Transport Probe` выполнен и закрыт как **FULL LIVE PASS**.

Диагностический namespace использовался как controlled probe; реальные probe/session secret values в каноническую документацию не переносятся.

## 43.1. Probe A — Set-Cookie

LIVE доказано:

- response `Set-Cookie` — PASS;
- browser storage — PASS;
- `HttpOnly` — PASS;
- `Secure` — PASS;
- `SameSite=Strict` — PASS;
- probe secret в `document.cookie` — NOT VISIBLE / PASS.

## 43.2. Probe B — return path

LIVE доказано:

- browser автоматически возвращает cookie на same-origin request — PASS;
- Cookie не утекает GitHub frontend upstream — PASS;
- Gateway/container chain доставляет session input backend — PASS.

Подтверждённый transport:

```text
Yandex API Gateway cookie parameter
→ operation context
→ private Serverless Container
```

## 43.3. Probe C — backend read

Backend возвращает не secret, а безопасный результат:

```json
{
  "cookiePresent": true,
  "sessionResolved": true
}
```

Результат — PASS.

## 43.4. Probe D — clear/logout

После clear/logout последующий read подтвердил:

```json
{
  "cookiePresent": false,
  "sessionResolved": false
}
```

Результат — PASS.

## 43.5. Probe E — regression

```text
YC-5 /api/health ................ PASS
Cloudflare production rollback .. PRESERVED
GitHub upstream Cookie leak ...... NOT PRESENT — PASS
```

## 43.6. Failed experiment

Ошибка ручной перепечатки `container_id` (`0` вместо `o`) вызвала LIVE `404 Container not found`.

Root cause подтверждён char-code проверкой. Исправлены ровно **3** ссылки. После fix regression — PASS.

## 43.7. Rollback evidence

YC-5 Gateway rollback-spec сохранена.

```text
SHA256 = 1563AE432F3F026CDA10F3737E06F6B7E7812EE6D73F618AAF8B42F1075E2828
```

## 43.8. Release/evidence artefacts YC-6

Для milestone должны сохраняться:

```text
YC6_EVIDENCE_INDEX.md
YC6_LIVE_TEST_PROTOCOL.md
YC6_DEFECT_LOG.md
YC6_ARCHITECTURE_DELTA.md
YC6_SECURITY_DELTA.md
YC6_IAM_EVIDENCE.md
YC6_MILESTONE_HANDOFF.md
SHA256SUMS_FINAL.txt
```

Скриншоты/оригинальные outputs должны храниться отдельно в `EVIDENCE_ORIGINALS`, если они экспортируются в release kit. Raw probe/session secrets туда не включать.

---

# 44. MASTER DOCUMENTATION SET

Канонический набор документации проекта постепенно привести к структуре:

```text
docs/
├── 00-product/
│   ├── vision.md
│   ├── requirements.md
│   └── roadmap.md
├── 01-architecture/
│   ├── c4/
│   ├── deployment.md
│   ├── data-model.md
│   └── adr/
├── 02-security/
│   ├── threat-model.md
│   ├── identity.md
│   ├── sessions.md
│   └── iam.md
├── 03-content/
│   ├── content-model.md
│   ├── skill-graph.md
│   ├── mastery.md
│   └── learning-events.md
├── 04-api/
│   └── openapi.yaml
├── 05-testing/
│   ├── test-matrix.md
│   ├── live-protocols.md
│   └── regression.md
├── 06-operations/
│   ├── deployment.md
│   ├── rollback.md
│   └── runbook.md
├── 07-diploma/
│   ├── diploma-master-ledger.md
│   ├── chapter-map.md
│   ├── evidence-map.md
│   └── bibliography.md
└── 08-release/
    ├── release-ledger.md
    └── evidence-index.md
```

Пока это target-структура; не объявлять каталоги существующими, пока они реально не добавлены в repo.

---

# 45. MASTER HANDOFF UPDATE PROTOCOL

Этот FINAL MASTER HANDOFF не должен становиться устаревшим архивом без замены.

После каждого крупного milestone:

```text
1. создать milestone handoff;
2. обновить canonical status line;
3. добавить новые resource IDs / versions;
4. добавить security delta;
5. добавить architecture delta;
6. добавить defects / failed experiments;
7. добавить tests / LIVE evidence;
8. обновить NEXT STEP;
9. обновить Diploma Evidence Ledger;
10. сохранить SHA256.
```

Исторические handoff не удалять. Новый master может получить новую дату.

---

# 46. FINAL PROJECT BOOT SEQUENCE

Когда открывается новый ChatGPT Project или новый чат внутри него:

```text
STEP 1
Read AKRONIKL_IT_NEXUS_FINAL_MASTER_HANDOFF_2026-10-01.md

STEP 2
Confirm canonical status:
frontend v0.1.7-alpha.2.4.5 FULL LIVE PASS
YC-0…YC-6 PASS
YC-6 Session Transport Probe FULL LIVE PASS
next = Nexus Account / Login Methods Foundation

STEP 3
Check current GitHub main / current branch if code changes are needed

STEP 4
Work only in relevant track/chat

STEP 5
After milestone → evidence + handoff + diploma ledger + canonical MASTER update when required
```

---

# 47. FINAL MASTER STATUS

> **AKRONIKL IT NEXUS на 2026-10-01 — каноническая точка:** frontend
> `v0.1.7-alpha.2.4.5` остаётся подтверждённым FULL LIVE PASS baseline; GitHub остаётся source of truth;
> Cloudflare Worker + D1 сохранены как production rollback; Yandex Cloud Pilot закрыл
> `YC-0…YC-6`. `YC-6 Session Transport Probe` закрыт как FULL LIVE PASS: доказаны
> `Set-Cookie`, `HttpOnly`, `Secure`, `SameSite=Strict`, browser storage/automatic return,
> backend session visibility через `Yandex API Gateway cookie parameter → operation context → private Serverless Container`,
> отсутствие probe secret в `document.cookie`, clear/logout с последующим `cookiePresent=false / sessionResolved=false`,
> отсутствие Cookie forwarding в GitHub upstream и regression PASS для YC-5 `/api/health`.
> Cloudflare production rollback PRESERVED. Failed experiment с `container_id` (`0` вместо `o`)
> сохранён: LIVE `404 Container not found`, root cause подтверждён char-code проверкой,
> исправлены ровно 3 ссылки, regression PASS. Следующий Identity milestone —
> `Nexus Account / Login Methods Foundation`. Параллельно продолжаются Content Production,
> Release/Evidence и Diploma / ВКР tracks.

---

# 48. ПРАВИЛО НА СЛУЧАЙ ПОТЕРИ СТАРЫХ ВЛОЖЕНИЙ

Часть старых вложений из предыдущих длинных чатов может истекать и становиться
недоступной. Это ожидаемо.

Если нужен конкретный старый ZIP / patch / screenshot / video:

1. сначала искать каноническую копию в Library;
2. затем в GitHub/release;
3. если её нет — попросить пользователя приложить файл заново;
4. не восстанавливать байты старого архива по памяти;
5. не выдавать реконструированный файл за оригинал.

Контекст решений должен сохраняться в handoff даже при истечении бинарных вложений.

---

# 49. REVISION DELTA — 2026-10-01 / YC-6 RELEASE CLOSURE

## 49.1. Причина новой канонической версии

Новая версия MASTER создана после крупного security milestone `YC-6 Session Transport Probe — FULL LIVE PASS` согласно MASTER HANDOFF UPDATE PROTOCOL.

Историческая версия:

```text
AKRONIKL_IT_NEXUS_FINAL_MASTER_HANDOFF_2026-09-30.md
```

сохраняется и не удаляется.

Новая каноническая версия:

```text
AKRONIKL_IT_NEXUS_FINAL_MASTER_HANDOFF_2026-10-01.md
```

## 49.2. Architecture delta

До YC-6 session transport через Yandex Gateway/private backend оставался недоказанным prerequisite.

После YC-6 LIVE доказан путь:

```text
Browser
→ first-party HttpOnly cookie
→ Yandex API Gateway cookie parameter
→ operation context
→ private Serverless Container
→ session resolution
```

GitHub frontend upstream не получает Cookie/session credential.

## 49.3. Security delta

LIVE подтверждены:

- `HttpOnly`;
- `Secure`;
- `SameSite=Strict`;
- secret не виден в `document.cookie`;
- backend не отражает raw secret;
- controlled clear/logout;
- post-clear unresolved state;
- private backend boundary;
- Cloudflare production rollback preserved.

## 49.4. Defect / failed experiment

`container_id`: `0` вместо `o` → LIVE `404 Container not found`.

Root cause: char-code proof.

Fix: ровно 3 ссылки.

Regression: PASS.

## 49.5. Rollback evidence

```text
YC-5 Gateway rollback-spec
SHA256: 1563AE432F3F026CDA10F3737E06F6B7E7812EE6D73F618AAF8B42F1075E2828
```

## 49.6. NEXT

```text
Nexus Account / Login Methods Foundation
```

До его отдельного PASS не объявлять production Nexus authentication завершённой.
