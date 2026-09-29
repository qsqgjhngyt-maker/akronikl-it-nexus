# First-party HttpOnly foundation — v0.1.7-alpha.2.4.5

## Важно
Это **foundation**, а не команда включить cookie в текущем production.

Текущая схема:
- приложение: `github.io`;
- API: `workers.dev`.

Для неё:

```text
FIRST_PARTY_SESSION_ENABLED=false
FIRST_PARTY_DEPLOYMENT_CONFIRMED=false
```

## Будущий target deployment
Допустимые варианты:
1. приложение и API на одном origin;
2. приложение и API на same-site доменах под контролируемым доменом.

Перед включением cookie transport отдельно проверяются:
- DNS / custom domain;
- HTTPS;
- точный `ALLOWED_ORIGIN`;
- CORS credentials;
- logout / stale cookie clear;
- CSRF/Origin gate;
- iPhone/Safari;
- Android/Chrome;
- desktop Chrome/Edge/Firefox.

## Включение в будущем
Только после отдельного security gate:

```text
FIRST_PARTY_SESSION_ENABLED=true
FIRST_PARTY_DEPLOYMENT_CONFIRMED=true
```

Обе переменные нужны одновременно.
