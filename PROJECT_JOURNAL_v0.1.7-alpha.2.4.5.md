# Журнал проекта — v0.1.7-alpha.2.4.5

Дата: 2026-09-29

После FULL LIVE PASS `2.4.4` следующий риск — browser-readable session credentials.

Принято решение не включать cookies поверх текущего `github.io ↔ workers.dev`, а сначала построить серверный и клиентский foundation с fail-closed gate.

## Реализовано
- Worker понимает HttpOnly session cookie;
- cookie использует существующую server session / D1 hash-модель;
- upgrade не создаёт новую D1 сущность;
- frontend умеет перейти с browser-readable `nxs` на cookie и удалить raw token;
- cookie transport работает первым credential только после успешного upgrade/marker;
- stale cookie может безопасно вернуться в существующий rollback;
- current production остаётся без изменения поведения.

## Инженерная граница
`2.4.5` не заявляет, что first-party authentication уже production-ready.
Он заявляет, что безопасный transport foundation подготовлен и может быть включён только после отдельного deployment/security этапа.
