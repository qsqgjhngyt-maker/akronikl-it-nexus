# PROJECT JOURNAL — v0.1.7-alpha.2.4.3.2

Дата: 2026-09-29

## Причина hotfix
Во время controlled Identity v2 session lifecycle теста серверная session отзывалась корректно и нижний LIVE-блок сразу переходил на legacy fallback, но верхние карточки Account Center оставались в состоянии `Server session` до F5.

## Исправление
Введена единая реактивная проекция credential state для:
- CURRENT DEVICE;
- SESSION MIGRATION;
- Devices & Sessions live summary.

## LIVE-проверка после исправления
1. `v0.1.7-alpha.2.4.3.2` опубликован.
2. Создана новая disposable `nxs_...` session.
3. Bridge возвращён в `false`.
4. Account Center увидел текущую server session.
5. Session отозвана через UI.
6. Без F5 верхняя и нижняя части интерфейса одновременно перешли на `Legacy credential + server API`.
7. Disposable device отозван отдельно.
8. D1 подтвердил итоговые счётчики и security events.

## Итог
Hotfix и полный controlled Devices & Sessions lifecycle закрыты как FULL LIVE PASS.

## Production state
`IDENTITY_V2_BRIDGE_ENABLED=false`

## Следующая архитектурная работа
`v0.1.7-alpha.2.4.4 — Session-First Cloud Migration Foundation`.
