# TEST MATRIX — v0.1.7-alpha.2.2.1

| ID | Область | Сценарий | Ожидание | Результат |
|---|---|---|---|---|
| T01 | Worker | `/api/v1/health` | ok/d1/d1-only | PASS |
| T02 | Bootstrap | первый Nexus Account | token issued, bootstrap closes | PASS |
| T03 | D1 | `account_subjects` | active subject | PASS |
| T04 | D1 | `account_tokens` | active token record, last_used_at | PASS |
| T05 | Auth | запрос с Nexus token | accepted | PASS |
| T06 | Sync | Desktop first PUSH | rev 1 | PASS |
| T07 | Sync | Desktop second PUSH | rev 2 | PASS |
| T08 | Cross-device | PC → iPhone PULL | project state received | PASS |
| T09 | Cross-device | iPhone → PC PULL | mobile change received | PASS |
| T10 | Audit | sync events | pushed/pulled recorded | PASS |
| T11 | Concurrency | stale PUSH | 409 conflict / no overwrite | PASS |
| T12 | Recovery | PULL after conflict | rev 5 received | PASS |
| T13 | Recovery | PUSH after reconciliation | rev 6 | PASS |
| T14 | Static | JS/MJS syntax | 78/78 | PASS |
| T15 | Static | JSON parse | 18/18 | PASS |
| T16 | Regression | tests/*.mjs | 36/36 | PASS |

## Final gate
**LIVE PASS**.
