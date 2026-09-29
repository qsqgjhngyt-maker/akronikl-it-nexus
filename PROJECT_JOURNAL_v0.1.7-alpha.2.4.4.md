# Журнал проекта — v0.1.7-alpha.2.4.4

Дата: 2026-09-29

Этап `2.4.4` устранил архитектурный разрыв между Account Center и Project Studio: оба теперь используют единый session-first credential flow.

## Проверенный production lifecycle

`legacy baseline → controlled nxs → bridge=false → PULL/PUSH через nxs → rev 8 → server revoke → stale browser nxs → automatic legacy fallback → Android/iPhone regression → device cleanup → D1 proof`

Первый deploy кандидата выявил boot-blocking duplicate declaration. Дефект был устранён до релиза, а pipeline усилен реальным ESM import smoke-test.

## Инженерный вывод

Session-first transport можно внедрять без изменения Worker/D1, потому что production Worker уже принимает `nxs` на защищённых `/api/v1/*` маршрутах.

Legacy token пока оставлен как контролируемый rollback; следующий этап должен убрать его из normal path только после появления first-party session transport.
