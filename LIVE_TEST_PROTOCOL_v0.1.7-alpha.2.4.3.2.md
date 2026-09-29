# LIVE TEST PROTOCOL — v0.1.7-alpha.2.4.3.2

## Финальный результат: FULL LIVE PASS

### 1. Deployment
- `v0.1.7 α2.4.3.2` visible: PASS
- Worker unchanged: PASS
- D1 schema unchanged: PASS

### 2. Controlled session
- bridge temporarily enabled only for session issuance: PASS
- disposable session created: PASS
- `authMode=nexus-session`: PASS
- session stored only in `sessionStorage`: PASS
- bridge returned to false before normal test: PASS

### 3. Reactive revoke
- top summary shows Server session before revoke: PASS
- live list shows 1 active / 1 current session: PASS
- current session revoked through UI: PASS
- **without F5**, top summary switches to legacy: PASS
- **without F5**, Session Migration switches to legacy: PASS
- live counts become 0 active / 0 current: PASS

### 4. Device lifecycle
- disposable device revoked through UI: PASS
- revoked device remains in audit/history: PASS
- working `Nexus browser bridge test` device remains active/current: PASS

### 5. D1 final proof
- devices=2: PASS
- active_devices=1: PASS
- revoked_devices=1: PASS
- sessions=3: PASS
- active_sessions=0: PASS
- revoked_sessions=3: PASS
- security_events=7: PASS

### 6. Production close
- `IDENTITY_V2_BRIDGE_ENABLED=false`: PASS
- no raw `nxk_...` / `nxs_...` in evidence: PASS

## Mobile note
No dedicated `2.4.3.2` mobile revoke cycle is claimed. Mobile Account/Devices routing and responsive UI were already LIVE-smoke verified on the immediately preceding `2.4.3.1` baseline.
