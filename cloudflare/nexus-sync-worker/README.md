# AKRONIKL IT NEXUS — Cloudflare Sync / Identity Worker

Version: `0.1.7-alpha.2.4.5-first-party-cookie-foundation`

Этот Worker сохраняет подтверждённый D1-only Cloud Sync / Identity v2 lifecycle и добавляет **first-party HttpOnly session foundation**, выключенный по умолчанию.

## Текущий production-compatible режим
- `nxk_...` legacy rollback остаётся совместимым;
- `nxs_...` server sessions остаются совместимыми;
- Cloud Sync session-first lifecycle не меняется;
- ACL / `409 REVISION_CONFLICT` / D1 snapshots не меняются;
- D1 migration не требуется.

## Новый first-party cookie foundation
Подготовлены:
- `__Host-nexus_session`;
- `HttpOnly`;
- `Secure`;
- `SameSite=Strict`;
- `Path=/`;
- без `Domain` (host-only);
- точная проверка Origin;
- credentialed CORS только при включённом first-party deployment;
- upgrade существующей `nxs_...` session в HttpOnly cookie без возврата raw token в body;
- очистка stale/revoked cookie;
- logout/revoke с очисткой cookie.

Новые API:
- `POST /api/v2/session/cookie/upgrade`
- `POST /api/v2/session/cookie/clear`

`GET /api/v2/session` и существующие защищённые API могут использовать cookie credential только когда first-party transport явно включён.

## Двухключевой production gate
Обе переменные должны быть `true`:

```text
FIRST_PARTY_SESSION_ENABLED=true
FIRST_PARTY_DEPLOYMENT_CONFIRMED=true
```

Если хотя бы одна `false`/отсутствует, cookie auth выключена.

### Текущий GitHub Pages production
Для текущей схемы `github.io ↔ workers.dev` **обе переменные должны оставаться false**.

Причина: foundation предназначен для будущего same-site / first-party deployment. Этот релиз не делает сторонние cookies production-моделью.

## Migration bridge

```text
IDENTITY_V2_BRIDGE_ENABLED=false
```

Оставлять `false`, кроме коротких controlled migration tests.

## Text variables текущего production
- `ENVIRONMENT=production`
- `AUTH_MODE=nexus-token`
- `ALLOWED_ORIGIN=https://YOUR-GITHUB-PAGES-HOST`
- `IDENTITY_V2_BRIDGE_ENABLED=false`
- `FIRST_PARTY_SESSION_ENABLED=false`
- `FIRST_PARTY_DEPLOYMENT_CONFIRMED=false`

Encrypted secret:
- `BOOTSTRAP_SECRET=<existing secret>`

## D1
Схема остаётся на migration `0004_identity_v2_session_foundation.sql`.
Новой migration в `2.4.5` нет.

## Безопасность
- raw session token не сохраняется в D1;
- HttpOnly cookie использует тот же server-side hash/session record;
- cookie-auth запросы требуют configured Nexus app Origin;
- explicit `Authorization` остаётся авторитетным, cookie не подменяет явно переданный credential;
- stale/invalid cookie очищается ответом Worker;
- first-party CORS credentials не рекламируются, пока transport выключен.

## Сохранённые Cloud Sync invariants
- D1 table `project_snapshots` остаётся хранилищем snapshot-проектов.
- Explicit ACL `deny` имеет приоритет над allow.
- HTTP `409 REVISION_CONFLICT` остаётся защитой от stale write.
- Bootstrap closes after the first Nexus account exists.
