# CP-1.1 — EVIDENCE RECORD

## Scope

CP-1.1 реализуется только в feature-ветке `feature/cp-1.1-content-contract-foundation` и draft PR #14.

Базовый production main: `0f71bb9f8752a34040ccb007acb2efcb89d8e36a`.

## Architecture evidence

- `courses/` сохранён canonical production root.
- `content/` добавлен только для shared schemas/contracts.
- Существующий C++ payload не мигрирован и не удалён.
- `core/course-registry.js` не потребляет новый contract в CP-1.1.
- progress/localStorage, Code Studio, Project Studio, service worker, Identity и Cloud Sync production files не изменяются.

## Automated evidence

Первый run `39895851099` зафиксирован как failed experiment: CP-1.1 tests PASS, затем обнаружен stale `verify-v011` gate.

После исправления gate run `39895949999` прошёл PASS.

После архитектурного self-review run `39896346854` прошёл PASS и подтвердил:

- Content Contract / schema tests;
- C++ / Academy regression;
- 102 RU/EN shared learning renders;
- Code Studio;
- Project Studio;
- Offline/PWA policy.

Final PR workflow дополнительно включает Cloud Sync synthetic regression и формирует downloadable evidence artifact:

`cp11-evidence-<HEAD_SHA>`

Артефакт содержит только diff names/status, тестовые логи и SHA-256 новых CP-1.1 файлов. Production credentials и user data не собираются.

## Evidence classification

До merge: **AUTOMATED PASS candidate**, не LIVE PASS и не production release.

LIVE-тест не требуется для metadata-only CP-1.1 до отдельного runtime integration milestone, потому что новый `content-package.json` намеренно не подключён к Academy runtime.

## Thesis relevance

CP-1.1 создаёт устойчивую identity chain для будущих learning events:

`courseId → moduleId → topicId → skillId? → activityId`.

Неполный skill mapping остаётся явным и не подменяет CP-3. Это важно для последующей воспроизводимой ML-оценки навыков: будущие события смогут ссылаться на стабильные сущности без хранения полного учебного текста/кода в event payload.
