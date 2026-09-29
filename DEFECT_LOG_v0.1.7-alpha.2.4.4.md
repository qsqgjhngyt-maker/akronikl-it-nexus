# Журнал дефектов — v0.1.7-alpha.2.4.4

## Известные ограничения кандидата

### LIM-244-001 — legacy token всё ещё обязателен для normal linked-account configuration
Статус: ожидаемое ограничение этапа.

Даже при наличии `nxs_...` существующий Cloud account config содержит `nxk_...` для rollback. Полный session-only режим не заявляется.

### LIM-244-002 — server session остаётся browser-readable
`nxs_...` хранится в `sessionStorage`, а не HttpOnly cookie. Это промежуточная foundation-модель.

### LIM-244-003 — best-effort revoke при сетевой ошибке
При account relink/disconnect frontend пытается отозвать старую server session. Если сеть недоступна:
- browser credential очищается;
- server session может оставаться до expiry/revoke;
- при disconnect пользователь получает предупреждение.

## LIVE defects
Заполняется после production smoke.
