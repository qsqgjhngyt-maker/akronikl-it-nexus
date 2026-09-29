# CHANGELOG v0.1.7-alpha.2.4.4

## Переход Cloud Sync на приоритет серверных сессий

### Добавлено
- session-first auth для Project Studio Cloud Sync;
- controlled legacy fallback только после допустимого 401;
- отображение `auth transport`;
- account-boundary session retirement при relink/disconnect;
- ESM module import quality gate.

### LIVE подтверждено
- PULL/PUSH via nxs;
- cloud rev 7→8;
- stale-session automatic fallback;
- Android/iPhone legacy regression;
- test device cleanup;
- final D1/security state.

### Исправлено
- boot-blocking duplicate `credential` declaration в первом candidate deploy.

### Не изменялось
- Worker;
- D1 schema;
- ACL;
- revision-conflict semantics.
