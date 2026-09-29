# Аудит потока авторизации Cloud Sync — v0.1.7-alpha.2.4.4

**Этап:** Переход Cloud Sync на приоритет серверных сессий  
**Дата:** 2026-09-29  
**Базовый релиз:** `v0.1.7-alpha.2.4.3.2` — FULL LIVE PASS

## 1. Что было до этого этапа

До `2.4.4` в Nexus существовали два параллельных потока авторизации:

### Account Center / Identity v2
`identity-v2-client.js` уже работал по схеме:

`nxs server session → при 401 INVALID_SESSION/UNAUTHORIZED → очистка sessionStorage → nxk legacy rollback`

### Project Studio / Cloud Sync
`cloud-sync.js` создавал Cloudflare provider с `tokenProvider: () => config.token`.

Это означало, что `PUSH`, `PULL`, импорт облачных проектов и `/api/v1/me` в рабочем Project Studio всегда использовали legacy `nxk_...`, даже если в той же вкладке уже была действующая `nxs_...` server session.

## 2. Вывод аудита

Backend уже был готов к session-first без изменения Worker:

- `authenticate()` сначала распознаёт `nxs_...`;
- затем, при `AUTH_MODE=nexus-token`, принимает `nxk_...`;
- эта логика применяется и к `/api/v1/*`, и к `/api/v2/*`.

Следовательно, для `2.4.4` не требуется:
- новая D1 migration;
- новый Worker;
- изменение ACL;
- изменение revision conflict protocol.

## 3. Риски старого frontend-flow

1. **Разные механизмы авторизации в двух частях Nexus.**
   Account Center использовал server session, Project Studio — legacy token.

2. **Browser-readable legacy token оставался основным credential для Cloud Sync.**

3. **Старая server session могла пережить смену Cloud account в текущей вкладке.**
   Это риск неверной границы доверия при relink.

4. **Нельзя использовать legacy fallback на любой ошибке.**
   `403 FORBIDDEN` и `409 REVISION_CONFLICT` должны возвращаться пользователю как реальные решения сервера, а не маскироваться повтором через другой credential.

## 4. Целевая схема v0.1.7-alpha.2.4.4

`Project Studio → Cloud Sync → Identity authenticated request`

Далее:

`nxs server session`
→ если запрос успешен: использовать результат  
→ если `401 INVALID_SESSION` или `401 UNAUTHORIZED`: удалить stale `nxs_...` и один раз повторить через `nxk_...`  
→ если `403`, `409`, network error или иная ошибка: **не выполнять fallback**

## 5. Граница текущего этапа

`2.4.4` — это **не отказ от legacy token**.

В этом релизе:
- `nxk_...` всё ещё хранится в существующей Cloud config как rollback;
- `cloudflareSyncConfigured()` всё ещё требует legacy account configuration;
- server session находится только в `sessionStorage`;
- автоматического вызова `/api/v2/session/bridge` нет;
- `IDENTITY_V2_BRIDGE_ENABLED=false` остаётся production-default;
- HttpOnly cookie session ещё не реализована.

Следующий этап после LIVE PASS должен отдельно решать переход от `legacy-required fallback` к нормальному first-party session transport.
