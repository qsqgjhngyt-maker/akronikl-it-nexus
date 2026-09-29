# Журнал дефектов — v0.1.7-alpha.2.4.4

## BOOT-244-001 — Nexus не завершал загрузку после первой публикации кандидата

**Симптом:** `SyntaxError: Identifier 'credential' has already been declared`  
**Статус:** ИСПРАВЛЕНО / LIVE ПОДТВЕРЖДЕНО  
**Потеря данных:** нет  
**Backend / D1:** не затронуты

Причина — двойное lexical declaration `credential` в `core/account-shell.js`. После исправления добавлен обязательный ESM module import smoke. Повторный GitHub Pages boot прошёл успешно.

## Известные архитектурные ограничения этапа

### LIM-244-001 — legacy token всё ещё нужен как rollback
Полный session-only режим не заявляется. `nxk_...` остаётся migration/rollback credential до first-party session transport.

### LIM-244-002 — server session пока browser-readable
`nxs_...` хранится в `sessionStorage`, а не в HttpOnly cookie.

### LIM-244-003 — best-effort revoke при сетевой ошибке
При relink/disconnect frontend пытается отозвать server session. При сетевой ошибке browser credential очищается, но server session может существовать до expiry/revoke.

## LIVE defects после boot-hotfix
Новых product/security дефектов в session-first Cloud Sync lifecycle не выявлено.
