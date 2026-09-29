# Матрица тестирования — v0.1.7-alpha.2.4.4

| ID | Проверка | Статус кандидата |
|---|---|---|
| CSF-001 | Cloud Sync выбирает `nxs` первой | PASS automated |
| CSF-002 | успешная `nxs` не вызывает legacy retry | PASS automated |
| CSF-003 | `401 INVALID_SESSION` очищает stale `nxs` | PASS automated |
| CSF-004 | после invalid session выполняется один `nxk` retry | PASS automated |
| CSF-005 | `403` не вызывает fallback | PASS automated |
| CSF-006 | `409 REVISION_CONFLICT` не вызывает fallback | PASS automated |
| CSF-007 | conflict-state Project Studio сохраняется | PASS automated |
| CSF-008 | relink отзывает предыдущую server session | PASS automated |
| CSF-009 | disconnect отзывает session и очищает sessionStorage | PASS automated |
| CSF-010 | raw credentials не выводятся в Project Studio | PASS automated |
| CSF-011 | Project Studio показывает auth transport | PASS automated |
| CSF-012 | legacy Cloud Sync baseline без `nxs` сохранён | PASS regression |
| CSF-013 | production PULL через `nxs` | LIVE PENDING |
| CSF-014 | production PUSH через `nxs` | LIVE PENDING |
| CSF-015 | production stale-session → `nxk` fallback | LIVE PENDING |
| CSF-016 | bridge возвращён в false | LIVE PENDING |
| CSF-017 | iPhone/Android обычный legacy baseline не регрессировал | LIVE PENDING |
