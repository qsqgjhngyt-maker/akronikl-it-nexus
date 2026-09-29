# LIVE-протокол — v0.1.7-alpha.2.4.5

## Режим проверки
Этот релиз проверяет **foundation в выключенном состоянии**.
Реальный HttpOnly cookie lifecycle в текущем `github.io ↔ workers.dev` не выполняется.

## A. Worker deploy
1. Развернуть Worker `0.1.7-alpha.2.4.5-first-party-cookie-foundation`.
2. Явно оставить:

```text
IDENTITY_V2_BRIDGE_ENABLED=false
FIRST_PARTY_SESSION_ENABLED=false
FIRST_PARTY_DEPLOYMENT_CONFIRMED=false
```

3. D1 migration не выполнять.

## B. Health
Открыть `/api/v1/health`.
Ожидается:
- Worker version `0.1.7-alpha.2.4.5-first-party-cookie-foundation`;
- `identityV2SessionFoundation=true`;
- `identityV2CookieSessionFoundation=true`;
- `identityV2CookieSessionEnabled=false`;
- `firstPartyDeploymentRequired=true`.

## C. Capabilities
`GET /api/v2/auth/capabilities`:
- `sessionFoundation=true`;
- `bridgeEnabled=false`;
- `cookieSessionFoundation=true`;
- `cookieSessionEnabled=false`;
- `firstPartyDeploymentRequired=true`;
- cookie metadata: HttpOnly/Secure/Strict/host-only.

## D. Disabled-route negative check
`POST /api/v2/session/cookie/clear` с текущего app Origin должен вернуть:

`409 FIRST_PARTY_SESSION_DISABLED`

Это подтверждает, что foundation deploy не включил cookie auth.

## E. Frontend deploy
1. Опубликовать frontend `v0.1.7-alpha.2.4.5`.
2. Hard refresh.
3. Account → Security.
4. Ожидается статус:
   `Фундамент HttpOnly-сессий готов · требуется first-party deployment`.

## F. Cloud Sync regression
На существующем проекте:
- transport остаётся `legacy fallback` без active `nxs`;
- PULL работает;
- cloud revision не повреждается.

При controlled `nxs` session существующий `2.4.4` session-first path должен работать как раньше.

## G. Mobile smoke
На iPhone и Android:
- приложение загружается;
- Account → Security не ломает layout;
- Cloud project discovery работает.

## PASS для 2.4.5
Foundation считается LIVE PASS, если A–G пройдены при cookie transport **выключенном**.

Реальный cookie LIVE PASS будет отдельным этапом после first-party deployment.
