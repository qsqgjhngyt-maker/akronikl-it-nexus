Закрытие `v0.1.7-alpha.2.4.3.2` после полного controlled LIVE-теста Identity v2 Devices & Sessions.

## ✅ FULL LIVE PASS

Подтверждено в production:

- server-session создаётся и аутентифицируется;
- migration bridge возвращается в `false` до обычной работы;
- текущая server-session отзывается через Account Center;
- `nxs_...` удаляется из временного `sessionStorage`;
- automatic fallback на legacy credential работает;
- **верхние карточки Identity обновляются сразу, без F5**;
- D1 фиксирует revoked session;
- security audit фиксирует lifecycle;
- disposable device отзывается через UI;
- рабочее зарегистрированное устройство остаётся active.

## Финальное controlled D1-состояние

- devices: `2`
- active devices: `1`
- revoked devices: `1`
- sessions: `3`
- active sessions: `0`
- revoked sessions: `3`
- security events: `7`

## Production state

`IDENTITY_V2_BRIDGE_ENABLED=false`

Worker, D1 schema и Cloud Sync protocol этим hotfix не изменялись.

## Evidence

Оптимизированные доказательства находятся в репозитории:

`docs/evidence/releases/v0.1.7-alpha.2.4.3.2/`

Оригинальные screenshots приложены к GitHub Release отдельным архивом.

## Следующий этап

`v0.1.7-alpha.2.4.4 — Session-First Cloud Migration Foundation`
