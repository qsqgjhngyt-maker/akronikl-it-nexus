# Аудит потока авторизации Cloud Sync — v0.1.7-alpha.2.4.4

## Итог аудита и LIVE-подтверждение

До `2.4.4` Account Center уже работал session-first, но Project Studio всегда использовал `config.token`. Релиз перевёл Cloud Sync на `identityV2AuthenticatedRequest()`.

Проверенная политика:

- `nxs` используется первой;
- `401 INVALID_SESSION/UNAUTHORIZED` → stale session очищается → один `nxk` retry;
- `403`, `409`, network error и `5xx` не вызывают fallback.

LIVE подтвердил:

- PULL/PUSH через server session;
- automatic legacy fallback после server-side revoke;
- cross-device legacy compatibility;
- отсутствие необходимости менять Worker/D1.

## Остаточный риск

Legacy token и server session всё ещё browser-readable. Это сознательно оставлено до first-party HttpOnly session foundation.
