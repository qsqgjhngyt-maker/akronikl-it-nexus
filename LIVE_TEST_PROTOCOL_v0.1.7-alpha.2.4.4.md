# LIVE-протокол — v0.1.7-alpha.2.4.4

## Финальный результат: ПОЛНАЯ LIVE-ПРОВЕРКА ПРОЙДЕНА

### A. Boot / legacy baseline
- boot после hotfix: PASS
- `auth transport: legacy fallback`: PASS
- cloud rev 7 baseline: PASS

### B. Controlled server-session
- bridge временно true только для issuance: PASS
- `nxs` создана без вывода credential: PASS
- bridge возвращён в false: PASS
- Project Studio показывает `auth transport: server session`: PASS

### C. Cloud Sync через nxs
- PULL rev 7: PASS
- PUSH: PASS
- rev 7→8: PASS
- audit `sync.pulled/sync.pushed`: PASS

### D. Stale-session fallback
- session отозвана server-side при сохранённом browser credential: PASS
- следующий Cloud Sync запрос получает invalid session: PASS
- stale nxs удаляется: PASS
- один legacy retry: PASS
- PULL rev 8: PASS
- UI transport меняется на legacy fallback: PASS

### E. Cross-device regression
- Android обнаруживает rev 8: PASS
- Android PULL rev 8 via legacy fallback: PASS
- iPhone обнаруживает rev 8: PASS
- iPhone PULL rev 8 via legacy fallback: PASS

### F. Cleanup / D1
- session-first test device revoked: PASS
- working device остаётся active: PASS
- devices=3 / active=1 / revoked=2: PASS
- sessions=4 / active=0 / revoked=4: PASS
- security_events=10: PASS
- bridge=false: PASS
