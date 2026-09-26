# PROJECT JOURNAL — v0.1.7-alpha.2.4.2

Дата: 2026-09-26

Закрыт первый реальный server-side increment **Identity v2 Session Foundation**.

## Что изменилось

До этого Nexus имел:
- Account Shell;
- legacy Nexus Cloud token;
- архитектуру будущей Identity v2.

Теперь production Worker реально умеет:
- создавать серверную device/session запись;
- выдавать одноразово session credential `nxs_...`;
- хранить только SHA-256 hash credential;
- аутентифицировать session;
- перечислять sessions;
- отзывать session;
- немедленно отвергать revoked credential;
- вести security audit.

## LIVE доказательство

Controlled lifecycle:

```text
legacy nxk
→ gated bridge
→ nxs session
→ authenticate
→ list/current
→ revoke
→ same nxs returns 401 INVALID_SESSION
→ D1 status revoked
→ security audit
→ bridge disabled again
```

Также проверена обратная совместимость:
legacy Cloud Sync PULL/PUSH продолжил работать, cloud revision 6→7.

## Найденные эксплуатационные особенности

1. D1 Dashboard Console в нашем deployment использовался как one-statement-per-request; migration применена пошагово.
2. Built-in Worker Preview дал misleading старый/unauthorized response; direct production URL подтвердил фактическую новую версию.

Обе особенности сохранены в документации вместо удаления из истории.

## Следующий increment

Devices/Sessions UX + controlled migration of Account Shell away from direct legacy-token dependence, while preserving recovery/rollback.
