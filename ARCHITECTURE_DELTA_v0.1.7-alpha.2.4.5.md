# Архитектурные изменения — v0.1.7-alpha.2.4.5

**Название:** Фундамент first-party HttpOnly-сессий  
**Дата:** 2026-09-29

## Цель
Подготовить следующий слой Identity v2: перенос browser session credential из JavaScript-readable storage в first-party `HttpOnly` cookie **без включения этого режима в текущем `github.io → workers.dev` production**.

## Базовый подтверждённый контур
`v0.1.7-alpha.2.4.4` остаётся рабочим baseline:

`server session (nxs) → Cloud Sync session-first → controlled legacy nxk rollback`

Этот контур не удаляется и остаётся production path.

## Новый Worker foundation
Добавлены:
- cookie name: `__Host-nexus_session`;
- `HttpOnly`;
- `Secure`;
- `SameSite=Strict`;
- `Path=/`;
- без `Domain`;
- cookie authentication поверх существующей `account_sessions` / SHA-256 hash session model;
- `POST /api/v2/session/cookie/upgrade`;
- `POST /api/v2/session/cookie/clear`;
- очистка stale HttpOnly cookie при `INVALID_SESSION`;
- очистка cookie при logout текущей cookie-session;
- exact Origin gate для cookie-authenticated API;
- credentialed CORS только при реально включённом first-party режиме.

## Двухключевой gate
Cookie transport активен только если одновременно:

```text
FIRST_PARTY_SESSION_ENABLED=true
FIRST_PARTY_DEPLOYMENT_CONFIRMED=true
```

Одна переменная без второй ничего не включает.

## Frontend foundation
`identity-v2-client.js` теперь умеет:
- безопасно upgrade существующей `nxs` в HttpOnly cookie;
- после успешного upgrade удалить raw `nxs` из `sessionStorage`;
- хранить только **несекретный marker** endpoint-а;
- использовать cookie credential первой;
- при stale cookie удалить marker и выполнить существующий controlled fallback;
- явно очистить host-only cookie через server endpoint.

## Что не меняется
- D1 schema — без новой migration;
- `account_sessions.secret_hash` остаётся источником истины;
- Project ACL;
- `409 REVISION_CONFLICT`;
- D1-only project snapshots;
- legacy rollback;
- migration bridge default `false`.
