# Cloudflare — пошаговое развертывание v0.1.7-alpha.2.4.5

## Цель
Развернуть first-party HttpOnly foundation **без включения cookie transport** в текущем production.

## 1. Worker code
В Cloudflare Workers & Pages → `akronikl-nexus-sync` открыть редактор Worker и заменить код на:

`AKRONIKL_NEXUS_WORKER_v0.1.7-alpha.2.4.5_FIRST_PARTY_COOKIE_FOUNDATION.txt`

Deploy.

## 2. Variables and Secrets
Проверить production:

```text
ALLOWED_ORIGIN=https://<ваш-github-pages-origin>
AUTH_MODE=nexus-token
ENVIRONMENT=production
IDENTITY_V2_BRIDGE_ENABLED=false
FIRST_PARTY_SESSION_ENABLED=false
FIRST_PARTY_DEPLOYMENT_CONFIRMED=false
```

`BOOTSTRAP_SECRET` остаётся Secret и не меняется.

D1 binding:

```text
DB → akronikl-nexus-sync
```

## 3. D1
Ничего не выполнять.
Migration `0004` остаётся актуальной.

## 4. Health
Открыть:

`/api/v1/health`

Проверить:
- version = `0.1.7-alpha.2.4.5-first-party-cookie-foundation`;
- `identityV2CookieSessionFoundation=true`;
- `identityV2CookieSessionEnabled=false`;
- `firstPartyDeploymentRequired=true`.

## 5. Capabilities
Открыть:

`/api/v2/auth/capabilities`

Проверить foundation=true / enabled=false / firstPartyDeploymentRequired=true.

## 6. Frontend
Только после успешного Worker smoke развернуть GitHub overlay `v0.1.7-alpha.2.4.5`.

## 7. Запрет
На текущем `github.io ↔ workers.dev` не переключать first-party flags в true.
