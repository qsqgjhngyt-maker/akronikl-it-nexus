# PATCH v0.1.7-alpha.2.4.5

## Фундамент first-party HttpOnly-сессий

Worker:
- first-party cookie authentication foundation;
- two-key enable gate;
- cookie upgrade / clear;
- Origin enforcement;
- credentialed CORS only when enabled;
- stale cookie cleanup;
- security audit on upgrade.

Frontend:
- cookie marker без secret;
- cookie-first credential candidate;
- bearer → cookie upgrade;
- stale cookie fallback;
- Account Security readiness status.

D1:
- migration отсутствует;
- используется существующая `account_sessions` schema.
