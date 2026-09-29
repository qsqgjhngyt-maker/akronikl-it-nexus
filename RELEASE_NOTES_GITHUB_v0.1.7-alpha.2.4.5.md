Этот релиз добавляет фундамент first-party HttpOnly-сессий для следующего этапа Identity v2.

## Добавлено
- host-only `__Host-nexus_session`;
- HttpOnly / Secure / SameSite=Strict;
- two-key production gate;
- bearer `nxs` → HttpOnly cookie upgrade;
- stale cookie cleanup;
- cookie logout/revoke;
- exact Origin security gate;
- frontend cookie-first foundation без хранения raw token в marker.

## Важно
В текущем `github.io ↔ workers.dev` production cookie transport **остаётся выключенным**.

```text
FIRST_PARTY_SESSION_ENABLED=false
FIRST_PARTY_DEPLOYMENT_CONFIRMED=false
```

Реальное включение будет отдельным этапом после first-party/custom-domain deployment и нового security gate.

## D1
Новая migration не требуется.
