> **Основной язык документации: русский.** Русская версия является нормативной.

# Управление секретами

## Never store in Git/browser-readable storage
- OAuth/OIDC client secret;
- Apple/provider private signing material;
- SMS provider secret;
- AI provider key;
- TOTP encryption key;
- session-signing/HMAC keys;
- OTP HMAC key;
- BOOTSTRAP_SECRET.

## Allowed storage
- Cloudflare Worker Secrets / managed secret manager;
- local `.env` excluded from Git for development.

## Current alpha exception/debt
The current raw `nxk_...` account token is stored by the browser Cloud Sync config. This is an accepted alpha foundation only and must be migrated away before Identity v2 public production.

## Secret lifecycle
Every secret should have:
- owner;
- purpose;
- environment;
- creation/rotation date;
- rotation procedure;
- revoke procedure.

## Logging rule
Secrets are redacted before logging. A suspected secret is rotated/revoked; deleting a Git commit alone is not sufficient.
