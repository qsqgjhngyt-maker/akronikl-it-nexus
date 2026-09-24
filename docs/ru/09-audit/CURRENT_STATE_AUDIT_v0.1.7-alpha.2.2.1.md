# Current State Audit — AKRONIKL IT NEXUS v0.1.7-alpha.2.2.1

**Этап:** v0.1.7-alpha.2.3 WORK01 — Architecture & AI Research Baseline  
**Дата:** 2026-09-24  
**Источник аудита:** полный закрытый релиз `v0.1.7-alpha.2.2.1` с LIVE evidence.  
**Статус:** первый фактический аудит кода и документации завершён.

## 1. Зафиксированный baseline

Текущий релиз содержит:

- 359 файлов;
- 228 Markdown-документов;
- 40 JavaScript-файлов;
- 38 MJS-файлов, из них 36 автоматических regression/test scripts;
- 18 JSON-файлов;
- 4 SQL-файла;
- 12 WebP-доказательств LIVE-тестов;
- 61 русскоязычный документ в `docs/ru`;
- 60 англоязычных документов в `docs/en`.

Версия runtime: `0.1.7-alpha.2.2.1`.

Зафиксированное содержимое:
- 40 русскоязычных уроков C++;
- 3 вручную подготовленных английских эталонных урока;
- 6 практикумов C++;
- 7 проектов C++;
- реестр 24 языков программирования;
- 53 курса в долгосрочном плане.

## 2. Реально реализованные подсистемы

### Platform Shell / PWA
Есть единая оболочка платформы, маршрутизация по hash-view, локализация RU/EN, настройки интерфейса, Service Worker и installable PWA.

### C++ Academy
C++ используется как reference course. Контент вынесен в `courses/cpp`, присутствуют curriculum, lessons, practicums, projects, provenance и стандарты контента.

### Sandbox / Code Studio
Реализованы:
- multi-file workspace;
- file tree / tabs;
- add / rename / delete;
- syntax highlighting;
- line numbers;
- diagnostics;
- persistent workspace;
- Clang/WASM provider;
- multi-translation-unit build;
- editor resume state.

### Project Studio
Реализованы:
- persistent project entity;
- nested paths;
- milestones;
- checkpoints / restore;
- local identity;
- ACL foundation;
- audit foundation;
- Cloud Sync provider contract;
- manual PUSH/PULL;
- import remote project;
- revision conflict state;
- D1-only project snapshots.

### Cloud Sync
Production-связка подтверждена LIVE:

`GitHub Pages client ↔ Cloudflare Worker ↔ Cloudflare D1 ↔ другое устройство`

Подтверждены:
- Nexus Account bootstrap;
- token authentication;
- PUSH rev 1 / rev 2;
- PC → iPhone PULL;
- iPhone → PC PULL;
- stale write rejection;
- conflict recovery;
- последующий PUSH rev 6.

### Team / ACL foundation
В коде и D1 schema присутствуют:
- workspaces;
- workspace/project membership;
- роли;
- path-scoped policies;
- explicit DENY precedence;
- invites foundation;
- audit events.

Полноценный UX командной работы ещё не завершён.

## 3. AI — фактическое состояние

Важно отделять целевую архитектуру от реализованной.

На текущем baseline реализован только минимальный `Akronikl Context Model`:
- courseId;
- lessonId;
- sectionId;
- taskId;
- code;
- stdin;
- stdout;
- stderr;
- attempts;
- language.

В production-клиенте кнопка «Разобрать с Akronikl» пока только сообщает, что Context Model готов.

Полноценные:
- LLM gateway;
- RAG;
- Learner Model;
- Knowledge/Skill Graph;
- Recommendation Engine;
- AI evaluation pipeline

**ещё не реализованы**. Это становится центральной исследовательской областью следующих этапов.

## 4. Текущий Cloud API

Реально существуют endpoints:

- `GET /api/v1/health`
- `POST /api/v1/bootstrap`
- `GET /api/v1/me`
- `GET /api/v1/projects`
- `GET /api/v1/projects/:id`
- `PUT /api/v1/projects/:id`
- `GET /api/v1/projects/:id/audit`

Authentication:
- `AUTH_MODE=nexus-token`;
- токен сервер хранит как SHA-256 hash;
- bootstrap закрывается после первого account subject.

## 5. Критические расхождения документации

### DOC-001 — Sync architecture устарела
`docs/ru/02-architecture/NEXUS_SYNC_TEAM_ARCHITECTURE.md` всё ещё описывает R2 как обязательное snapshot storage и имеет baseline `v0.1.7-alpha.2.1`.

Фактическая реализация `v0.1.7-alpha.2.2.1` — **D1-only snapshots**.

### DOC-002 — version.json содержит устаревший статус
`version.json.notes` всё ещё говорит `Bootstrap LIVE retest pending`.

Фактически bootstrap, cross-device sync, revision conflict и recovery уже имеют **LIVE PASS**.

### DOC-003 — AI документация существенно опережает реализацию
Документы описывают Secure AI Gateway и персонального наставника как целевую архитектуру, но runtime AI-подсистема пока минимальна.

В новых документах требуется маркировка:
- `IMPLEMENTED`;
- `FOUNDATION`;
- `PLANNED`;
- `RESEARCH`.

### DOC-004 — текущая DATA_MODEL не описывает реальную D1 schema
`docs/ru/02-architecture/DATA_MODEL.md` описывает в основном учебные сущности, но не фиксирует production Cloud Sync schema из 12 таблиц.

Нужны отдельные:
- ERD;
- Data Dictionary;
- schema ownership;
- migration history.

## 6. Security findings

### SEC-AUDIT-001 — Nexus token хранится в localStorage
Текущий `sync/cloudflare-config.js` сохраняет account token в localStorage.

Это допустимый временный alpha-компромисс, но противоречит целевой политике `SECRET_MANAGEMENT.md`, где секреты не должны храниться в localStorage.

Перед production Identity v2 нужно перейти к:
- short-lived session;
- HttpOnly/SameSite cookie или эквивалентной защищённой session model;
- refresh/session revocation;
- device/session registry;
- passkeys / OAuth identities / MFA.

### SEC-AUDIT-002 — subject references логические, но не все закреплены FK
Например `owner_subject_id`, `created_by`, `actor_subject_id` логически ссылаются на subject, но D1 schema не везде задаёт SQL FOREIGN KEY.

Нужно принять явное ADR: database FK vs application-enforced identity references.

## 7. Главный архитектурный вывод

Nexus уже вышел за рамки «учебного сайта».

Фактически есть три слоя:

1. **Learning Platform** — курсы, уроки, progress, sandbox.
2. **Engineering Workspace** — Code Studio, Project Studio, checkpoints, build/runtime.
3. **Cloud Engineering Layer** — account, sync, revisioning, ACL, audit.

Следующая цель — добавить четвёртый слой:

4. **Intelligent Learning Layer** — Learner Model, Knowledge Graph, AI Context Engine, RAG, Recommendation Engine и Nexus AI.

## 8. Gate для перехода к реализации Identity/AI

До начала крупного нового функционала нужно завершить baseline:

- C4 Context;
- C4 Container;
- ERD current + target;
- Data Dictionary;
- Requirements IDs;
- Traceability Matrix;
- Identity Architecture;
- Threat Model;
- AI Research Problem;
- AI Evaluation Plan;
- roadmap с экспериментальными milestone.

Это и есть содержание `v0.1.7-alpha.2.3`.
