# AKRONIKL-0 — Internal Core Foundation

**Дата:** 26.10.2026. **Владелец:** 08 · INTELLIGENT ASSISTANT.
**Получатель сводного результата:** MASTER 00.
**База:** `065606a788198045cadf250fea663246ddbb2d56`.
**Feature-ветка кандидата:** `feature/akronikl-0-core-foundation-20261026`.
**Версия Core:** `0.1.0`; схема API: `1`.

## STATUS

**PASS — изолированный implementation candidate; IMPLEMENTED + AUTOMATED PASS.**

Это приёмка архитектурного ядра, контрактных адаптеров и подготовленных данных. Подключение к пользовательскому интерфейсу, браузерный LIVE, физические устройства и production release этим статусом не закрываются. В `main`, production backend, IAM, OAuth, D1 и текущий PWA-кэш кандидат не интегрирован.

Решение владельца от 26.10.2026 закрепляет полную ответственность за Akronikl в ветке 08. Прежнее предложение вести его через 02 заменено этим решением. MASTER 00 координирует остальные ветки, ВКР, приоритеты и выпуск.

## IMPLEMENTED

- Восемь ESM-модулей `akronikl/core/`: contracts, context, capabilities, knowledge, model-api, offline, studio, index.
- Закрытый реестр пяти capabilities: `assistant.capabilities`, `context.current`, `knowledge.search`, `navigation.propose`, `model.generate`.
- Единый проверяемый запрос/результат, контроль размеров, нормализованные ошибки, независимые замороженные снимки.
- Host-разрешения отделены от текста запроса; данные кода/диагностики требуют policy и явного выбора.
- Непрозрачная boundary, внутренний epoch, invalidate/dispose, AbortSignal, таймаут и подавление поздних успехов/ошибок.
- Адаптер реальных полей маршрута Nexus и legacy-контекста; отдельные языки наставника и курса.
- Адаптер явного диапазона реального CodeWorkspace и первичной диагностики настоящего `parseRuntimeError`, привязанной к файлу и ревизии.
- Offline knowledge index по существующим материалам Академии; воспроизводимый builder, source/package SHA256, manifest и проверка drift.
- Загрузчик подготовленного пакета через внедрённый reader: фиксированный путь, размер, SHA256, UTF-8/JSON/schema, версия и язык.
- Модельный API `generate` с default-off policy. Реальный inference не включён; локальный адаптер проверен на синтетическом provider. Внешние адаптеры безусловно закрыты до AKRONIKL-3.
- Архитектура, ADR, source baseline, тестовые транскрипты и журнал обнаруженных ограничений/исправлений.

### Подготовленные данные

| Пакет | Уроки | Фрагменты | Покрытие | Несжатые байты |
|---|---:|---:|---|---:|
| RU | 50 | 410 | 46 Gold + 4 baseline | 651 219 |
| EN | 50 | 404 | 46 Gold + 1 baseline + 3 только заголовка | 443 628 |

Всего 814 фрагментов, 1 094 847 байт для двух JSON. Индекс содержит вступления/цели, теорию и терминологию; решения, quiz answers, assessment, личные проекты и learner state не извлекаются. Это индекс нынешнего контента репозитория; дополнительная педагогическая валидация всех источников не заявляется. Отдельные фрагменты ограничены по длине; manifest отмечает возможное усечение.

Три EN title-only темы: `cpp.classes-objects-state-control`, `cpp.constructors-destructors`, `cpp.visual-event-model`. Их заголовки не считаются переводом теории. Скрытого fallback на RU нет.

## WHAT WAS PROVED

1. Реальные ESM-модули импортируются; локальные операции выполняются без обращения к fetch, XHR, WebSocket, DOM, browser storage и IndexedDB.
2. Реальный поиск и предложения навигации сохраняют curriculum ID, язык, исходный путь, contentVersion и SHA256.
3. Снимки данных не принимают произвольные поля, getter-инструкции или mutable ссылки; источник/модель не регистрирует и не исполняет tools.
4. Неизвестный урок не получает вымышленную ссылку; отсутствие языкового пакета отличается от отсутствия поискового совпадения.
5. Смена boundary, invalidate, A→B→A, dispose, отмена и timeout подавляют устаревшие операции.
6. Адаптер Code Studio берёт только выбранный диапазон; диагностика других файлов, прежней ревизии и ограничения runtime не приписываются выбранному коду ученика.
7. Подмена/обрезка офлайн-пакета отклоняется до создания индекса. Доверенный manifest остаётся обязательным: одновременная подмена descriptor и данных не устраняется одной проверкой hash.
8. Сохранены точные байты 247 исходных файлов, полученных с указанного commit и сверенных по Git blob SHA и SHA256. Текущие startup/import/account-storage регрессии прошли.

Доказательство неизменности полной исходной Git-структуры проверяется отдельно по сравнению feature candidate с исходным commit; в changeset допустимы только новые файлы assistant/tests/tools/docs.

## TESTS

Среда фактического локального запуска: Linux, Node.js `v24.22.1`. Использована точечная копия нужных исходников из GitHub на зафиксированном commit; это не полный локальный clone истории. Целостность каждого полученного исходника сверена по исходному Git blob SHA. Полное дерево кандидата строится на исходном Git tree, сохраняя остальные записи.

| Проверка | Фактический результат | Evidence |
|---|---|---|
| Core + knowledge + независимые security-регрессии | 69 / 69 PASS, 0 fail, 0 skipped | `core-tests.tap` |
| Существующие startup/load/lazy-import tests | 11 / 11 PASS | `startup-regression.tap` |
| Существующий реальный ESM import smoke | 5 модулей PASS | `module-import-smoke.txt` |
| Существующая изоляция account storage | 21 проверки PASS | `account-storage-regression.txt` |
| Детерминированный knowledge builder, `--check` | PASS | `knowledge-check.txt` |
| Сохранность выбранных исходников | 247 / 247, changed = 0 | `scope-check.json` |

Команды воспроизведения:

```bash
node --test --test-isolation=none tests/akronikl-core.test.mjs tests/akronikl-knowledge.test.mjs tests/akronikl-security.test.mjs
node tools/build-akronikl-knowledge.mjs --check
node tools/check-akronikl-core-scope.mjs
node --test --test-isolation=none tests/platform-startup-load.test.mjs tests/platform-lazy-imports.test.mjs
node tests/module-import-smoke-check.mjs
node tests/account-storage-isolation-check.mjs
```

`--test-isolation=none` использован из-за запрета дочерних Node-процессов в среде проверки. Это реальное выполнение test cases в одном процессе; не syntax-only check. Native ESM в Node не заменяет браузерную приёмку. Браузерного runtime в среде не найдено; браузерные/мобильные проверки не объявлены выполненными.

## SECURITY

- Внешняя передача данных отсутствует. API-ключи, provider endpoints и BYOK persistence в Core не реализованы.
- Request JSON не может назначить себе роли, policy, consent или включить external provider.
- По умолчанию нет выбранного кода, diagnostic data, stdout/stderr, credentials, account internals и произвольного storage.
- Авторитетные Nexus Account/ACL/HttpOnly/Cloud Sync contracts сохраняются. Host обязан пользоваться ими, давать новую boundary и вызывать invalidate на каждом relevant lifecycle event.
- Произвольные ошибки и подделки CoreError не отражаются в ответах. Cancellation использует нативный AbortSignal/EventTarget; cleanup не выпускает исходные исключения.
- Источники и текст модели остаются недоверенными данными. Будущий UI должен рендерить их как текст/проверенный Markdown, а не исполняемый HTML.
- Доверенные provider callbacks не являются sandbox: тестирование mock-адаптера не доказывает безопасность стороннего JavaScript, BYOK или готовность внешнего transport.
- Подготовленные индексы — публичные данные. Разрешение загрузить/сохранить материалы не распространяется на личный код, секреты или профили.

## EVIDENCE

Каталог: [`evidence/ak0-20261026/`](evidence/ak0-20261026/).

- Финальные TAP/text/JSON транскрипты из таблицы выше.
- `failed-initial-integration.tap`: сохранён первый общий запуск 63/65; обе ошибки оказались дефектом сборки test fixture, а не скрытыми успешными проверками.
- [`BASELINE_AKRONIKL_0.json`](BASELINE_AKRONIKL_0.json): 247 исходных путей, размеры, Git blob SHA и SHA256.
- [`DEFECTS_AKRONIKL_0.md`](DEFECTS_AKRONIKL_0.md): найденные дефекты, причины, исправления и конкретные регрессии.
- [`SHA256SUMS_AKRONIKL_0.txt`](SHA256SUMS_AKRONIKL_0.txt): хэши файлов кандидата, кроме самого checksum-файла.
- [`ARCHITECTURE_AKRONIKL_0.md`](ARCHITECTURE_AKRONIKL_0.md) и [`ADR-AK0-001-OFFLINE_CORE.md`](ADR-AK0-001-OFFLINE_CORE.md).

## WHAT REMAINS

1. Подключить host к фактическому account/route/editor lifecycle в отдельном integration candidate.
2. Заменить заглушку помощника на проверяемый интерфейс: источники, выбор контекста, доступные действия, отмена.
3. Определить и проверить доставку/подготовку core, индекса и полного учебного контента для холодного PWA offline startup и обновления кэша.
4. Проверить Desktop browser, Android, iPhone/PWA, доступность, реальные переходы и сохранение прогресса.
5. Измерить время подготовки/поиска/открытия помощника и влияние на загрузку/навигацию. 43 811 байт исходников Core и отдельные ~1,1 MB индексов — размеры артефактов, не измеренная браузерная latency. Индексация сейчас выполняется в потоке вызывающего кода; решение о worker требует следующего performance gate.
6. Системные тексты Core v0.1.0 преимущественно RU; полноценная UI-локализация относится к интеграции. Контекст и source locale RU/EN проверены.
7. Развивать AKRONIKL-1…5 последовательно. Голос, реальные модели, BYOK, долговременная персональная память, Skill Graph/Events/Mastery/Learner Model этим кандидатом не реализованы.

## NEXT MILESTONE

**AKRONIKL-0.2 — контролируемая интеграция Core с Nexus и локальный UI-приёмочный сценарий.**

Работа продолжается в 08, с единым отчётом для MASTER 00. Изменение чужого контракта или выпуск в main/production требует предусмотренного согласования. Мелкие технические исправления решаются внутри 08.

Материал для ВКР: ADR о независимости ядра от моделей; сравнение вариантов offline-first/remote-only; модель доверия и ограничение контекста; воспроизводимый knowledge index; случаи отказа и их регрессии. Эффект на обучение и UX пока является предметом будущего эксперимента.
