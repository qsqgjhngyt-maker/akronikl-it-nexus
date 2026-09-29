# Identity v2 Session API Foundation

## Public

### GET `/api/v2/auth/capabilities`
No auth required.

Возвращает:
- server session foundation;
- bridge flag;
- first-party cookie foundation;
- cookie transport enabled/disabled;
- first-party deployment requirement;
- session timeouts.

## Authenticated credentials
Поддерживаются:
- legacy `nxk_...`;
- bearer `nxs_...`;
- first-party HttpOnly cookie — только при явно подтверждённом first-party deployment.

### POST `/api/v2/session/bridge`
Только legacy `nxk_...` + `IDENTITY_V2_BRIDGE_ENABLED=true`.

### GET `/api/v2/session`
Возвращает текущую session metadata.

### DELETE `/api/v2/session`
Отзывает текущую session. При cookie-auth также очищает `__Host-nexus_session`.

### GET `/api/v2/sessions`
Список session аккаунта.

### DELETE `/api/v2/sessions/:id`
Отзывает указанную session.

### POST `/api/v2/sessions/revoke-all`
Отзывает активные session аккаунта.

### GET `/api/v2/devices`
Список устройств.

### DELETE `/api/v2/devices/:id`
Отзывает устройство и его активные session.

## First-party cookie foundation

### POST `/api/v2/session/cookie/upgrade`
Требует:
- `FIRST_PARTY_SESSION_ENABLED=true`;
- `FIRST_PARTY_DEPLOYMENT_CONFIRMED=true`;
- точный configured Origin;
- действующий Bearer `nxs_...`.

Устанавливает:

```text
__Host-nexus_session=<session credential>; Path=/; HttpOnly; Secure; SameSite=Strict
```

`Domain` не устанавливается.
Raw session token не возвращается в JSON body.

После успешного ответа frontend должен удалить browser-readable `nxs_...` из `sessionStorage`.

### POST `/api/v2/session/cookie/clear`
Не требует auth, потому что только очищает host-only cookie, но требует подтверждённый first-party deployment и точный app Origin.

Используется для удаления stale HttpOnly cookie, в том числе когда server session уже недействительна.

## Security boundary
В текущем `github.io ↔ workers.dev` deployment cookie transport должен оставаться выключенным.
