# CHANGELOG v0.1.7-alpha.2.4.5

## Фундамент first-party HttpOnly-сессий

### Добавлено
- first-party `__Host-nexus_session` foundation;
- `HttpOnly / Secure / SameSite=Strict`;
- two-key deployment gate;
- `POST /api/v2/session/cookie/upgrade`;
- `POST /api/v2/session/cookie/clear`;
- cookie-auth support в существующих API;
- stale-cookie cleanup;
- frontend cookie marker без raw credential;
- Account Security readiness indicator.

### Не изменено
- D1 schema;
- Project ACL;
- revision conflict protocol;
- legacy rollback;
- session-first Cloud Sync baseline.

### Production-default
Cookie transport выключен.
