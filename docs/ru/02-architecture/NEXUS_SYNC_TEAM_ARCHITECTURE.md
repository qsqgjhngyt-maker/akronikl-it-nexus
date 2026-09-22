# Nexus Sync & Team Architecture

Версия основы: `v0.1.7-alpha.2.1`.

## Цель

Один Project Studio должен безопасно существовать на нескольких устройствах и, при явном приглашении, у нескольких участников команды. Личный проект остаётся приватным по умолчанию.

## Граница безопасности

Клиентский UI не считается источником прав. Решение ALLOW/DENY для облачной операции принимает Worker после установления личности пользователя.

Проверка строится по цепочке:

`subject -> workspace membership -> project membership -> role -> path scope -> action -> ALLOW/DENY`

Явный DENY имеет приоритет над ALLOW.

## Роли и scope

Базовые роли: owner, maintainer, developer, docs_editor, qa, viewer.

`docs_editor` получает write по `docs/**`, `qa` — по `tests/**`. Владелец может добавлять точечные allow/deny политики для конкретного пользователя или роли, например запретить `/releases/**` или разрешить только `/docs/api/**`.

## Local-first

Локальная копия проекта остаётся рабочей без сети. В проекте отдельно хранятся local revision, server revision и base server revision. Если серверная версия изменилась независимо, push должен завершиться конфликтом, а не тихим перезаписыванием.

## Cloudflare split

- Worker: API, authentication adapter, authorization, revision protocol.
- D1: workspace/project metadata, memberships, ACL, invites, revision index, audit.
- R2: immutable project snapshots.
- Durable Objects: будущая координация realtime/locks/presence.
- Queues: будущие build/export/background jobs.

R2 key формируется только Worker-ом из подтверждённых workspace/project/revision. Клиент не задаёт путь объекта напрямую.

## Audit

Серверный audit append-only по смыслу системы. Для sync-update фиксируются actor, revision before/after и список изменённых путей. UI журнала и diff-review будут наращиваться поверх этой модели.
