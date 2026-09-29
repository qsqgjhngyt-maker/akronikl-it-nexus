# Матрица тестирования — v0.1.7-alpha.2.4.5

| ID | Проверка | Кандидат |
|---|---|---|
| FP-001 | cookie foundation capability | PASS automated |
| FP-002 | two-key env gate | PASS automated |
| FP-003 | `__Host-` / HttpOnly / Secure / Strict / Path=/ | PASS automated |
| FP-004 | `Domain` отсутствует | PASS automated |
| FP-005 | exact Origin gate | PASS automated |
| FP-006 | credentialed CORS только при enabled | PASS automated |
| FP-007 | cookie auth `/api/v2/session` | PASS automated |
| FP-008 | explicit Authorization приоритетнее cookie | PASS automated |
| FP-009 | upgrade bearer → cookie | PASS automated |
| FP-010 | upgrade JSON не возвращает raw token | PASS automated |
| FP-011 | stale cookie получает clear response | PASS automated |
| FP-012 | cookie logout revokes session + clears cookie | PASS automated |
| FP-013 | frontend upgrade удаляет raw `nxs` | PASS automated |
| FP-014 | local marker не содержит raw token | PASS automated |
| FP-015 | cookie-first frontend API | PASS automated |
| FP-016 | stale cookie → controlled legacy fallback | PASS automated |
| FP-017 | existing 2.4.4 session-first Cloud Sync regression | PASS automated |
| FP-018 | production Worker deploy with cookie disabled | LIVE PENDING |
| FP-019 | `/health` shows foundation=true/enabled=false | LIVE PENDING |
| FP-020 | `/capabilities` shows first-party required | LIVE PENDING |
| FP-021 | existing Cloud Sync PULL regression | LIVE PENDING |
| FP-022 | Account Security readiness UI | LIVE PENDING |
| FP-023 | real HttpOnly cookie lifecycle | DEFERRED to first-party deployment |
