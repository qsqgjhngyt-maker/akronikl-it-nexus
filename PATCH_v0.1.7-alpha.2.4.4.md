# PATCH v0.1.7-alpha.2.4.4

## Переход Cloud Sync на приоритет серверных сессий

Изменено:
- `sync/identity-v2-client.js`
- `sync/cloudflare-provider.js`
- `sync/cloud-sync.js`
- `project-studio/project-studio.js`
- `core/account-shell.js`
- version/cache metadata
- regression tests

Добавлено:
- `tests/cloud-sync-session-first-migration-check.mjs`
- архитектурный/security аудит
- LIVE-протокол и test matrix

Backend:
- Worker не меняется;
- D1 не меняется;
- bridge production-default остаётся false.

## LIVE boot correction

После первой публикации кандидата GitHub Pages обнаружен:
`SyntaxError: Identifier 'credential' has already been declared`.

Исправлен только frontend Account Center.
Worker, D1, Cloud Sync API и production variables не изменялись.

Добавлен regression gate реального ESM-import ключевых frontend-модулей.
