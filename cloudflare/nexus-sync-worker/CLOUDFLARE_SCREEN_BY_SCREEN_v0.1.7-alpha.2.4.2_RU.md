# Cloudflare — v0.1.7-alpha.2.4.2 пошагово

## Шаг 1 — D1
Cloudflare Dashboard -> D1 -> `akronikl-nexus-sync` -> Console.

Выполнить содержимое:
`migrations/0004_identity_v2_session_foundation.sql`

Потом выполнить:
`D1_0004_VERIFY.sql`

Ожидаются таблицы:
- account_devices
- account_sessions
- identity_security_events

## Шаг 2 — Worker variable
Worker -> Settings / Variables.

Добавить text variable:

```text
IDENTITY_V2_BRIDGE_ENABLED = false
```

Не менять:
- DB binding;
- ENVIRONMENT;
- AUTH_MODE;
- ALLOWED_ORIGIN;
- BOOTSTRAP_SECRET.

## Шаг 3 — Worker code
Вставить содержимое:
`AKRONIKL_NEXUS_WORKER_v0.1.7-alpha.2.4.2_IDENTITY_SESSION_FOUNDATION.txt`

Deploy.

## Шаг 4 — Backend smoke
Open `/api/v1/health`.

Expected:
- version `0.1.7-alpha.2.4.2-identity-foundation`;
- `identityV2SessionFoundation: true`;
- `identityV2BridgeEnabled: false`.

Open `/api/v2/auth/capabilities`.

Expected:
- `sessionFoundation: true`;
- `bridgeEnabled: false`;
- `legacyTokenCompatible: true`;
- `cookieSessionEnabled: false`.

## Шаг 5 — Existing Cloud Sync regression
До GitHub frontend update проверить существующий Project Studio PULL/PUSH.

Это доказывает backward compatibility Worker.

## Шаг 6 — GitHub frontend
Распаковать GITHUB OVERLAY поверх main и выполнить commit:

```text
feat: add Identity v2 session foundation v0.1.7-alpha.2.4.2
```

После Pages deploy сделать hard refresh.

Account -> Security/Devices должен показать:

```text
Серверный фундамент сессий доступен · migration bridge выключен
```

## Шаг 7 — Controlled bridge test
Не обязателен для первого smoke.

Если выполняется:
- временно set `IDENTITY_V2_BRIDGE_ENABLED=true`;
- raw `nxk_...`/`nxs_...` не показывать в чате/скриншотах;
- после revoke test вернуть variable в `false`.
