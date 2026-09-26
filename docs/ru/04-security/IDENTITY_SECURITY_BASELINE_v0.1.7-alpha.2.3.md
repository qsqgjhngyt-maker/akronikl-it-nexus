# AKRONIKL IT NEXUS — Identity & Security Baseline

**Этап:** `v0.1.7-alpha.2.3` WORK05  
**Runtime baseline:** `v0.1.7-alpha.2.2.1`  
**Дата:** 2026-09-26  
**Статус:** WORK05 COMPLETE — DESIGN ONLY  
**Нормативный язык:** русский

## 1. Цель

WORK05 проектирует переход от текущей alpha-аутентификации через вручную сохранённый `nxk_...` token к полноценному Nexus Account:

- вход с любого устройства;
- несколько login identities для одного аккаунта;
- Yandex ID / Google / Apple;
- телефон + OTP;
- passkeys/WebAuthn;
- MFA/2FA;
- устройства и сессии;
- восстановление доступа;
- безопасное account linking;
- видимый account state на главной;
- усиленная защита административных действий.

## 2. Current state

В `v0.1.7-alpha.2.2.1`:

- browser local identity хранится в `akronikl:it-nexus:identity:v1`;
- Cloud Sync token хранится в browser storage;
- Worker аутентифицирует `Authorization: Bearer nxk_...`;
- D1 хранит SHA-256 hash token, а не raw token;
- bootstrap создаёт первого account subject и закрывается после первого аккаунта;
- Cloud authorization выполняется Worker, не UI.

Это **FOUNDATION**, а не production Identity v2.

## 3. Target principle

Nexus Account отделяется от конкретного способа входа.

```text
Nexus Account
├── Profile
├── External identities
│   ├── Yandex ID
│   ├── Google
│   ├── Apple
│   └── verified phone
├── Passkeys
├── MFA methods
├── Recovery codes
├── Devices
├── Sessions
├── Projects
├── Learning progress
└── AI/learning permissions
```

## 4. Архитектурные решения WORK05

1. **Federated/passwordless-first.** Локальный Nexus password не обязателен для Identity v2 launch.
2. **Server-side Identity Broker.** OAuth/OIDC provider credentials и token exchange выполняются сервером.
3. **Account linking — explicit only.** Email совпадение не объединяет аккаунты автоматически.
4. **Passkey/TOTP preferred for strong authentication.** SMS не является preferred second factor.
5. **Revocable sessions.** Пользователь видит и отзывает активные устройства/сессии.
6. **No raw session secrets in D1.** Сервер хранит hash/HMAC session secret.
7. **First-party deployment before public auth.** Production session cookies не должны зависеть от third-party-cookie behavior между `github.io` и `workers.dev`.
8. **Step-up authentication** для критических admin/security операций.
9. **Minimal identity data.** Провайдерские access tokens не становятся частью профиля и не попадают в AI.
10. **Audit security events without secrets.**

## 5. Public Identity launch gate

До публичного запуска Identity v2 необходимо закрыть:

- first-party/custom-domain deployment;
- session storage;
- CSRF/origin policy;
- provider callback allowlists;
- account linking;
- passkey/MFA/recovery;
- rate limiting;
- email/phone enumeration protection;
- session revocation;
- security test matrix;
- current `nxk_...` migration path;
- incident/recovery procedure.

## 6. Runtime

WORK05 не меняет runtime и не внедряет provider credentials.

Runtime остаётся `v0.1.7-alpha.2.2.1`.
