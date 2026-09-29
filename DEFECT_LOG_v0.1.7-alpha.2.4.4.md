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

## BOOT-244-001 — Nexus не завершал загрузку после публикации кандидата

**Обнаружено:** LIVE smoke GitHub Pages  
**Симптом:** `SyntaxError: Identifier 'credential' has already been declared`  
**Статус:** ИСПРАВЛЕНО В КАНДИДАТЕ ДО РЕЛИЗА  
**Потеря данных:** нет  
**Backend / D1:** не затронуты

### Причина
В `core/account-shell.js`, внутри `accountPageMarkup()`, после добавления session-first статуса `credential` был объявлен второй раз в том же lexical scope.

### Почему старый gate пропустил
`node --check` для этого файла вернул успешный результат, однако реальный ESM import воспроизводил тот же SyntaxError, что Chrome.

### Исправление
- удалено второе объявление `credential`;
- добавлен `tests/module-import-smoke-check.mjs`;
- новый gate импортирует ключевые frontend ES modules, а не только выполняет `node --check`.

### Проверка
- прямой `import('./core/account-shell.js')`: PASS;
- полный module import smoke: PASS;
- полная регрессия: PASS.
