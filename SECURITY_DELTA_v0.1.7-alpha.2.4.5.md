# Изменения безопасности — v0.1.7-alpha.2.4.5

## Модель cookie

```text
__Host-nexus_session=<nxs credential>
Path=/
HttpOnly
Secure
SameSite=Strict
Max-Age=8h
Domain отсутствует
```

`__Host-` + отсутствие `Domain` ограничивают cookie конкретным API-host.

## Защита от CSRF / cross-origin misuse
Cookie-auth запросы принимаются только если:
- first-party transport явно включён двумя env-флагами;
- `Origin` точно совпадает с `ALLOWED_ORIGIN`, либо same-origin request URL соответствует ему.

При включённом режиме CORS добавляет:

`Access-Control-Allow-Credentials: true`

при этом `Access-Control-Allow-Origin` остаётся точным origin, не `*`.

## Credential precedence
1. явно переданный `Authorization` остаётся авторитетным;
2. cookie рассматривается только когда `Authorization` отсутствует;
3. cookie не может тихо подменить явно переданный bearer.

## Upgrade
`POST /api/v2/session/cookie/upgrade`:
- требует действующий bearer `nxs_...`;
- устанавливает HttpOnly cookie;
- **не возвращает raw token в JSON**;
- пишет `auth.session.cookie_upgraded` в security audit;
- frontend после успеха удаляет raw `nxs` из `sessionStorage`.

## Stale/revoked cookie
При `INVALID_SESSION` Worker отправляет expired `Set-Cookie`, чтобы браузер удалил stale credential.

Отдельный `POST /api/v2/session/cookie/clear` позволяет очистить cookie даже если session уже не может пройти auth.

## Текущая production boundary
В `github.io ↔ workers.dev`:

```text
FIRST_PARTY_SESSION_ENABLED=false
FIRST_PARTY_DEPLOYMENT_CONFIRMED=false
```

Cookie transport **не должен включаться** до отдельного same-site/custom-domain security gate.
