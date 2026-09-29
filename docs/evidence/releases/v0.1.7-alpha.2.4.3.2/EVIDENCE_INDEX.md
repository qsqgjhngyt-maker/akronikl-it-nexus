# Evidence Index — v0.1.7-alpha.2.4.3.2

**Release:** Identity Session UI State Refresh Hotfix  
**Closure date:** 2026-09-29  
**Final status:** FULL LIVE PASS (hotfix + Devices/Sessions lifecycle scope)

## Security rule
Evidence contains no raw `nxk_...`, `nxs_...` or `BOOTSTRAP_SECRET`.
Original screenshots are distributed separately in the GitHub Release evidence archive.

## Pre-hotfix / defect proof

| ID | Evidence | Result |
|---|---|---|
| P01 | disposable server session created without rendering credentials | PASS |
| P02 | migration bridge returned to `false` | PASS |
| P03 | Account Center authenticated by server session | PASS |
| P04 | session revoke succeeded; stale top summary defect reproduced | DEFECT CONFIRMED |
| P05 | page reload confirmed canonical legacy fallback | PASS |
| P06 | D1 counts after revoke | PASS |
| P07 | `auth.session.bridge_created` / `auth.session.revoked` audit events | PASS |

## Post-hotfix / final proof

| ID | Evidence | Result |
|---|---|---|
| F01 | `v0.1.7-alpha.2.4.3.2` deployed; legacy baseline clean | PASS |
| F02 | controlled bridge enabled for temporary test | PASS |
| F03 | hotfix test session created / authenticated | PASS |
| F04 | server-session state visible with bridge already disabled | PASS |
| F05 | revoke immediately refreshes top + live summary **without F5** | PASS |
| F06 | disposable device revoked via UI; working device remains active | PASS |
| F07 | final D1 lifecycle counts: devices 2 (1 active / 1 revoked), sessions 3 (0 active / 3 revoked), security events 7 | PASS |

## Final verified lifecycle

`legacy nxk → controlled bridge → nxs session → bridge false → Account Center server session → UI session revoke → immediate legacy fallback without reload → D1/audit → UI device revoke → D1 final state`

## Mobile scope
iPhone and Android Account Center / Devices / Nexus Cloud routing were LIVE-smoke tested on the immediately preceding `v0.1.7-alpha.2.4.3.1` baseline. The `2.4.3.2` code change is limited to reactive Identity summary projection; no separate mobile `2.4.3.2` revoke cycle was performed, so this package does not claim a new mobile revoke proof.
