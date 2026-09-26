# Functional Requirements Catalog — v0.1.7-alpha.2.3

| ID | Priority | Status | Domain | Normative requirement | Current/Target component | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| FR-PLAT-001 | P0 | IMPLEMENTED | Платформенная оболочка | Платформа должна предоставлять единую навигационную оболочку для Home, Academy, Skills, Labs, Projects, Practices и Akronikl. | core/app.js | ui-alpha4-check.mjs |
| FR-PLAT-002 | P0 | IMPLEMENTED | Маршрутизация | Переход между представлениями, курсами, уроками, практикумами и проектами должен выполняться без потери корректного состояния маршрута. | core/app.js | production-entry-syntax-check.mjs |
| FR-PLAT-003 | P1 | IMPLEMENTED | Настройки UI | Пользователь должен управлять языком UI, языком курса, языком наставника, визуальными эффектами и режимом чтения. | core/app.js, core/storage.js | ui-alpha4-1-check.mjs |
| FR-PLAT-004 | P0 | IMPLEMENTED | PWA | Платформа должна устанавливаться как PWA и кэшировать базовую оболочку/критические ресурсы. | manifest.webmanifest, service-worker.js | service-worker-assets-check.mjs |
| FR-COURSE-001 | P0 | IMPLEMENTED | Каталог курсов | Пользователь должен видеть единый каталог направлений и состояние доступности курсов. | courses/catalog.json, core/app.js | public-content-check.mjs |
| FR-COURSE-002 | P0 | IMPLEMENTED | Урок | Урок должен поддерживать теорию, примеры, практику, лабораторный контекст, самопроверку и связанный учебный контекст. | courses/cpp/* | lesson-standard-freeze-check.mjs |
| FR-COURSE-003 | P0 | IMPLEMENTED | C++ reference course | C++ должен выступать эталонным курсом с 40 темами, 6 практикумами и 7 проектами. | courses/cpp/* | public-content-check.mjs |
| FR-COURSE-004 | P1 | FOUNDATION | Prerequisites | Учебные сущности должны иметь устойчивые prerequisites и связи для построения маршрута. | course metadata/docs | — |
| FR-PROGRESS-001 | P0 | IMPLEMENTED | Локальный прогресс | Прогресс уроков и практикумов должен сохраняться локально между запусками. | core/storage.js | workspace-persistence-resume-check.mjs |
| FR-PROGRESS-002 | P0 | PLANNED | Облачный прогресс | После входа на другом устройстве пользователь должен получать свой учебный прогресс и профиль из облака. | target identity/profile layer | — |
| FR-PROGRESS-003 | P1 | RESEARCH | Skill mastery | Система должна поддерживать состояние освоения навыков, пригодное для Skill Graph и AI Learner Model. | target learning model | — |
| FR-CODE-001 | P0 | IMPLEMENTED | Редактирование и запуск | Пользователь должен редактировать код, передавать stdin и видеть stdout/stderr поддерживаемого runtime. | sandbox/* | sandbox-provider-check.mjs |
| FR-CODE-002 | P0 | IMPLEMENTED | Multi-file workspace | Code Studio должен поддерживать несколько файлов, вкладки и дерево проекта. | sandbox/code-studio.js, sandbox/code-workspace.js | multi-file-code-studio-check.mjs |
| FR-CODE-003 | P0 | IMPLEMENTED | Diagnostics | Среда должна показывать компиляторные/runtime diagnostics без ложного утверждения об успешном запуске. | sandbox/diagnostics.js | modern-cpp-compiler-integration-check.mjs |
| FR-CODE-004 | P1 | IMPLEMENTED | Runtime Router | Выбор runtime должен выполняться через language-neutral provider/capability abstraction. | sandbox/runtime-router.js, provider-contract.js | polyglot-runtime-check.mjs |
| FR-CODE-005 | P1 | IMPLEMENTED | Modern C++ WASM | C++ runtime должен поддерживать утверждённый capability baseline и безопасные лимиты input/output/source/wasm. | sandbox/providers/* | modern-cpp-safety-limits-check.mjs |
| FR-PROJ-001 | P0 | IMPLEMENTED | Project entity | Project Studio должен создавать и сохранять самостоятельную сущность проекта. | project-studio/project-store.js | project-studio-foundation-check.mjs |
| FR-PROJ-002 | P0 | IMPLEMENTED | Project VFS | Проект должен поддерживать вложенные пути, создание, переименование и удаление файлов. | project-studio/project-store.js | project-vfs-path-hotfix-check.mjs |
| FR-PROJ-003 | P0 | IMPLEMENTED | Checkpoints | Пользователь должен создавать контрольные точки и восстанавливать состояние проекта. | project-studio/* | project-studio-foundation-check.mjs |
| FR-PROJ-004 | P1 | FOUNDATION | Milestones | Проект должен поддерживать этапы/вехи и учебную фиксацию прогресса проекта. | project-studio/* | project-studio-foundation-check.mjs |
| FR-PROJ-005 | P1 | PLANNED | Export/Release | Пользователь должен экспортировать исходники и выпускной snapshot проекта; native/container artifacts допускаются отдельным secure-build этапом. | target release layer | — |
| FR-SYNC-001 | P0 | IMPLEMENTED | Cloud connection | Клиент должен подключаться к Nexus Cloud через Cloudflare Worker и идентифицировать account subject. | sync/cloud-sync.js | cloud-sync-client-transport-check.mjs |
| FR-SYNC-002 | P0 | IMPLEMENTED | PUSH | Пользователь должен отправлять текущий проект в cloud с baseRevision. | sync/cloud-sync.js | LIVE + cloud-sync-ui-check.mjs |
| FR-SYNC-003 | P0 | IMPLEMENTED | PULL cross-device | Пользователь должен получить облачный проект на другом устройстве. | sync/cloud-sync.js | LIVE PC↔iPhone |
| FR-SYNC-004 | P0 | IMPLEMENTED | Optimistic concurrency | Stale write не должен бесшумно перезаписывать более новую cloud revision; система должна перейти в conflict state. | sync/cloud-sync.js + Worker | LIVE conflict test |
| FR-SYNC-005 | P0 | IMPLEMENTED | Conflict recovery | После конфликта пользователь должен иметь безопасный путь PULL актуальной revision и последующего PUSH новой revision. | sync/cloud-sync.js | LIVE recovery rev5→rev6 |
| FR-SYNC-006 | P1 | FOUNDATION | Offline sync queue | Архитектура должна поддерживать очередь синхронизации для будущего offline-first reconciliation. | sync/sync-queue.js | sync-team-foundation-check.mjs |
| FR-AUDIT-001 | P0 | IMPLEMENTED | Audit trail | Критические операции проекта и Cloud Sync должны оставлять audit events. | collaboration/audit-log.js + Worker/D1 | LIVE audit evidence |
| FR-TEAM-001 | P1 | FOUNDATION | Project roles | Проект должен поддерживать owner, maintainer, developer, docs_editor, qa и viewer. | collaboration/access-control.js | sync-team-foundation-check.mjs |
| FR-TEAM-002 | P1 | FOUNDATION | Path-scoped ACL | Разрешения должны поддерживать scope по пути и explicit DENY с приоритетом над ALLOW. | collaboration/access-control.js | sync-team-foundation-check.mjs |
| FR-TEAM-003 | P1 | FOUNDATION | Membership/invites | Cloud schema должна поддерживать project/workspace membership и invites; полноценный UX реализуется позднее. | D1 migrations | cloudflare-sync-backend-foundation-check.mjs |
| FR-ID-001 | P0 | FOUNDATION | Nexus identity v1 | Локальная identity должна уметь связываться с cloud account subject. | core/identity.js, sync/cloud-sync.js | cloudflare-nexus-token-auth-check.mjs |
| FR-ID-002 | P0 | PLANNED | Unified Nexus Account | Пользователь должен иметь единый Nexus Account, восстанавливающий профиль, прогресс и проекты на любом доверенном устройстве. | target Identity v2 | — |
| FR-ID-003 | P1 | PLANNED | Identity providers | Nexus Account должен проектно поддерживать несколько методов входа: телефон/OTP, Яндекс ID, Google, Apple и другие провайдеры без создания дубликатов при явном linking. | target Identity v2 | — |
| FR-ID-004 | P0 | PLANNED | MFA/Passkeys | Система должна поддерживать Passkeys/WebAuthn и дополнительный MFA, включая TOTP и recovery codes. | target Identity v2 | — |
| FR-ID-005 | P0 | PLANNED | Sessions/devices | Пользователь должен видеть активные сессии/устройства и уметь отзывать их. | target Identity v2 | — |
| FR-ID-006 | P1 | PLANNED | Visible account state | Главная/верхняя панель должна явно показывать текущего пользователя, состояние входа и синхронизации. | target shell/account UI | — |
| FR-ADMIN-001 | P1 | PLANNED | Nexus Control Center | Администратор/разработчик должен управлять пользователями, курсами, публикациями, feature flags, обращениями, audit и состоянием платформы из отдельного защищённого интерфейса. | target admin layer | — |
| FR-CMS-001 | P1 | PLANNED | Course CMS | Администратор должен создавать/редактировать курс, главы, уроки, практики, тесты и медиа без ручного редактирования Git-файлов. | target CMS | — |
| FR-CMS-002 | P2 | PLANNED | Nexus Journal | Платформа должна поддерживать блог/журнал с публикациями, категориями и связью статей с обучающим контентом. | target CMS | — |
| FR-SUPPORT-001 | P1 | PLANNED | Связь с разработчиком | Пользователь должен создавать обращение, выбирать тип, прикладывать контекст/вложения и вести диалог внутри платформы. | target support layer | — |
| FR-AI-001 | P0 | FOUNDATION | Context Model | Akronikl должен получать минимально необходимый контекст текущего курса/урока/задачи/кода/результатов выполнения. | akronikl/context.js | code inspection |
| FR-AI-002 | P0 | RESEARCH | Learner Model | AI-подсистема должна использовать формализованную модель знаний/ошибок/прогресса пользователя. | target AI research layer | experiment |
| FR-AI-003 | P0 | RESEARCH | Skill/Knowledge Graph | AI-подсистема должна учитывать граф prerequisites и уровень освоения связанных компетенций. | target AI research layer | experiment |
| FR-AI-004 | P0 | RESEARCH | Course RAG | Ответы по учебному материалу должны иметь режим retrieval grounding по утверждённой базе контента. | target AI research layer | retrieval evaluation |
| FR-AI-005 | P0 | RESEARCH | Project/Code intelligence | AI должен уметь использовать разрешённый контекст выбранного проекта, compiler/runtime diagnostics и историю попыток. | target AI research layer | code-grounding evaluation |
| FR-AI-006 | P1 | RESEARCH | Recommendation engine | Система должна исследовать персональный выбор следующего шага обучения на основе Learner Model и Skill Graph. | target AI research layer | offline/online evaluation |
| FR-AI-007 | P0 | PLANNED | Pedagogical behavior | По умолчанию наставник должен помогать понять и диагностировать проблему, а не автоматически подменять учебную деятельность готовым решением. | AI policy | rubric evaluation |
| FR-AI-008 | P0 | RESEARCH | AI baseline comparison | Качество Nexus AI должно сравниваться с Generic LLM baseline по заранее определённым метрикам. | AI evaluation plan | controlled experiment |
| FR-AI-009 | P0 | PLANNED | AI permission boundary | AI получает только явно разрешённый минимальный контекст через Context/Permission Gateway. | target AI security | security tests |
| FR-AI-010 | P1 | PLANNED | Unified assistant modes | Один Akronikl может адаптировать поведение под Tutor, Engineer, Navigator, Reviewer и Nexus Guide без обязательного разделения на разных ботов. | target AI UX | scenario tests |
