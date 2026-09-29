# Журнал дефектов / ограничений — v0.1.7-alpha.2.4.5

## LIM-245-001 — текущий deployment не first-party
Статус: ожидаемое архитектурное ограничение.

`github.io ↔ workers.dev` не используется для включения cookie transport.

## LIM-245-002 — обычный sign-in всё ещё начинается с legacy/browser credential
Статус: ожидаемое ограничение этапа.

HttpOnly foundation пока не заменяет account bootstrap/federated login.

## LIM-245-003 — реальный cookie LIVE lifecycle отложен
Статус: by design.

До custom/same-site deployment выполняются только automated security tests и LIVE proof того, что foundation остаётся выключенным.

## LIVE defects
Заполняется после production smoke.
