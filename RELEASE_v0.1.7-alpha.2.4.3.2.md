# RELEASE v0.1.7-alpha.2.4.3.2

**Название:** Identity Session UI State Refresh Hotfix  
**Дата закрытия:** 2026-09-29  
**Тип:** frontend-only Identity v2 hotfix  
**Статус:** FULL LIVE PASS

## Назначение
Закрыть последний UX-дефект, обнаруженный при реальном отзыве текущей server-session и автоматическом fallback на legacy Nexus credential.

## Что исправлено
После отзыва текущей `nxs_...` session Account Center без F5 синхронно обновляет:
- `CURRENT DEVICE → Identity transport`;
- `SESSION MIGRATION`;
- live Devices & Sessions summary.

## Подтверждено LIVE
- controlled server session;
- bridge returned to false;
- current session revoke through UI;
- immediate automatic legacy fallback;
- no-F5 summary refresh;
- D1 revoked state;
- security audit;
- disposable device revoke;
- preservation of the working registered device.

## Финальное D1-состояние controlled test
- devices: 2
- active devices: 1
- revoked devices: 1
- sessions: 3
- active sessions: 0
- revoked sessions: 3
- security events: 7

## Production
`IDENTITY_V2_BRIDGE_ENABLED=false`

Worker and D1 schema are unchanged by this hotfix.

## Следующий этап
`v0.1.7-alpha.2.4.4 — Session-First Cloud Migration Foundation`
