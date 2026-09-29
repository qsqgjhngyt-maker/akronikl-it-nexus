# CHANGELOG v0.1.7-alpha.2.4.3.2

## Identity Session UI State Refresh Hotfix

### Исправлено
- верхняя сводка Identity больше не остаётся stale после отзыва текущей server-session;
- Session Migration мгновенно отражает automatic legacy fallback;
- live Devices & Sessions и верхние карточки используют согласованное credential state.

### LIVE подтверждение
- revoke current session through UI: PASS;
- fallback without F5: PASS;
- D1 revoked state: PASS;
- security audit: PASS;
- disposable device revoke: PASS;
- working device preserved: PASS.

### Production
- Worker: unchanged;
- D1 schema: unchanged;
- `IDENTITY_V2_BRIDGE_ENABLED=false`.
