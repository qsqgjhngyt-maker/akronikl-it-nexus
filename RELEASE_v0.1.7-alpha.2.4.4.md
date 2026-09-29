# Релиз v0.1.7-alpha.2.4.4

**Название:** Переход Cloud Sync на приоритет серверных сессий  
**Дата сборки кандидата:** 2026-09-29  
**Статус:** AUTOMATED PASS / LIVE PENDING

## Пользовательский результат
Если в текущей вкладке существует действующая Identity v2 server session, Project Studio использует её для Cloud Sync раньше legacy token.

SYNC-панель показывает:
- `auth transport: server session`;
- либо `auth transport: legacy fallback`.

## Безопасный fallback
Legacy credential используется только после допустимого `401`.
`403`, `409`, network errors не маскируются.

## Account boundary
При relink/disconnect старая server session отзывается по возможности и browser credential очищается.

## Backend
Изменения Worker/D1 не требуются.

## Release gate
Автоматические тесты пройдены.
Production LIVE-проверка ещё не выполнена.
