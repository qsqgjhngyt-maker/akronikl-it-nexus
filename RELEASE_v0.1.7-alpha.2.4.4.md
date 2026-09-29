# Релиз v0.1.7-alpha.2.4.4

**Название:** Переход Cloud Sync на приоритет серверных сессий  
**Дата закрытия:** 2026-09-29  
**Статус:** полная LIVE-проверка пройдена

## Что изменилось

Project Studio Cloud Sync теперь использует общий Identity v2 credential flow:

1. действующая `nxs_...` server session — первый credential;
2. legacy `nxk_...` — только контролируемый rollback после допустимого `401`;
3. `403`, `409`, network/5xx не маскируются fallback.

## LIVE подтверждение

- PULL через `nxs`: PASS;
- PUSH через `nxs`: PASS;
- cloud rev `7 → 8`: PASS;
- stale session → `401 INVALID_SESSION`: PASS;
- stale `nxs` очищается: PASS;
- ровно один legacy retry: PASS;
- fallback PULL rev 8: PASS;
- Android/iPhone legacy compatibility: PASS;
- test device revoke: PASS;
- финальный D1/security state: PASS.

## Production

`IDENTITY_V2_BRIDGE_ENABLED=false`

Worker и D1 schema этим релизом не менялись.

## Следующий архитектурный рубеж

First-party session transport / HttpOnly foundation с постепенным выводом browser-readable legacy token из normal sign-in path.
