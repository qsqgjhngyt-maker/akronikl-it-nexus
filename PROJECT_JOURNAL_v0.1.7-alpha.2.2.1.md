# PROJECT JOURNAL — v0.1.7-alpha.2.2.1

## 2026-09-24 — Cloud Sync LIVE closure

### Goal
Доказать реальную межустройственную синхронизацию проекта и защиту от конкурентной перезаписи.

### Sequence
1. Зафиксирован исходный дефект bootstrap: `ERR_CONNECTION_RESET / Failed to fetch`.
2. Исправлен CORS/preflight и удалён пустой `Authorization` для `skipAuth`.
3. Первый Nexus Account успешно создан; health изменился `bootstrapOpen:true → false`.
4. D1 подтвердил активный account subject и активный token record с `last_used_at`.
5. ПК выполнил PUSH → rev 1 и rev 2.
6. iPhone подключён сохранённым Nexus token и выполнил PULL rev 2.
7. Изменение со смартфона дошло обратно на ПК; наблюдалась rev 4.
8. Проведён conflict test: stale PUSH с ПК был отклонён.
9. ПК сделал PULL rev 5, сохранил удалённое изменение, затем PUSH rev 6.

### Outcome
- Cross-device synchronization: **LIVE PASS**.
- Optimistic concurrency: **LIVE PASS**.
- Conflict recovery: **LIVE PASS**.

### Documentation impact
Сформирована доказательная серия скриншотов, test matrix, ADR и defect log для дальнейшей технической/дипломной документации.
