# Матрица тестирования — v0.1.7-alpha.2.4.4

| ID | Проверка | Итог |
|---|---|---|
| CSF-001 | nxs используется первой | PASS |
| CSF-002 | successful nxs без legacy retry | PASS |
| CSF-003 | stale nxs очищается после 401 | PASS |
| CSF-004 | ровно один legacy retry | PASS |
| CSF-005 | 403 без fallback | PASS automated |
| CSF-006 | 409 без fallback | PASS automated |
| CSF-007 | conflict state сохраняется | PASS automated |
| CSF-008 | relink retires prior session | PASS automated |
| CSF-009 | disconnect retires/clears session | PASS automated |
| CSF-010 | raw credentials не рендерятся | PASS |
| CSF-011 | Project Studio auth transport | PASS LIVE |
| CSF-012 | legacy baseline | PASS LIVE |
| CSF-013 | PULL через nxs | PASS LIVE |
| CSF-014 | PUSH через nxs | PASS LIVE |
| CSF-015 | stale-session automatic fallback | PASS LIVE |
| CSF-016 | bridge final false | PASS LIVE |
| CSF-017 | Android legacy regression | PASS LIVE |
| CSF-018 | iPhone legacy regression | PASS LIVE |
| CSF-019 | test device revoke | PASS LIVE |
| CSF-020 | final D1/security counts | PASS LIVE |
