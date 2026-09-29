# Архитектурные изменения — v0.1.7-alpha.2.4.4

## Название этапа
**Переход Cloud Sync на приоритет серверных сессий**

## До
`Project Studio → cloud-sync.js → cloudflare-provider.js → config.token (nxk)`

## После
`Project Studio → cloud-sync.js → cloudflare-provider.js → identityV2AuthenticatedRequest()`

`identityV2AuthenticatedRequest()` использует:
1. действующую `nxs_...` server session;
2. legacy `nxk_...` только как контролируемый rollback.

## Изменённые обязанности

### `sync/identity-v2-client.js`
- предоставляет общий authenticated request для `/api/v1` и `/api/v2`;
- сохраняет единый порядок credential;
- удаляет stale session при допустимом fallback;
- предоставляет отзыв текущей server session.

### `sync/cloudflare-provider.js`
- поддерживает внешний authenticated request adapter;
- bootstrap/health остаются на прежнем пути;
- provider contract не меняется.

### `sync/cloud-sync.js`
- Project Studio больше не берёт `config.token` как основной bearer;
- account relink и local disconnect пытаются отозвать текущую server session;
- при неудаче отзыва browser credential всё равно очищается;
- backend/D1 протокол не меняется.

### `project-studio/project-studio.js`
В SYNC-панели отображается фактический тип авторизации:
- `server session`;
- `legacy fallback`.

Raw credential не отображается.

## Rollback
Legacy Cloud config и Nexus Token сохраняются без миграции данных.
Если session-first frontend вызовет проблему, рабочий `nxk_...` transport остаётся доступен как rollback.
