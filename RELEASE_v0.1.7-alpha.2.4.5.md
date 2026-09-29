# Релиз v0.1.7-alpha.2.4.5

**Название:** Фундамент first-party HttpOnly-сессий  
**Дата сборки кандидата:** 2026-09-29  
**Статус:** AUTOMATED PASS / LIVE FOUNDATION PENDING

## Пользовательский результат
В Account → Security Nexus сможет показать, что HttpOnly foundation присутствует, но current deployment требует first-party topology.

## Главное
Этот релиз **не включает cookie transport** в текущем production.

## Backend
Worker обновляется.
D1 migration отсутствует.

## Release gate
- automated security/regression: PASS;
- Worker deploy с обоими first-party flags=false: PENDING;
- health/capabilities: PENDING;
- disabled-route negative check: PENDING;
- frontend/account security smoke: PENDING;
- Cloud Sync regression: PENDING.
