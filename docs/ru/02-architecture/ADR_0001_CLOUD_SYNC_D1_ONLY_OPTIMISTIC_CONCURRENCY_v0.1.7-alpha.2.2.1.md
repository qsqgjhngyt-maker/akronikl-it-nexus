# ADR-0001 — D1-only Cloud Sync и optimistic concurrency

**Status:** Accepted / LIVE verified  
**Date:** 2026-09-24

## Context
Для alpha-этапа требовалась облачная синхронизация проектов без обязательного подключения отдельного object storage. Также нужно было предотвратить потерю данных при одновременном редактировании на нескольких устройствах.

## Decision
1. Хранить project snapshots в Cloudflare D1 `project_snapshots` в пределах установленного размера snapshot.
2. Сохранять local-first модель клиента.
3. Использовать `baseRevision` как optimistic concurrency token.
4. Отклонять stale write через HTTP 409 / `REVISION_CONFLICT`.
5. Разрешать восстановление через PULL актуальной ревизии и повторный PUSH.

## Alternatives
- R2/object storage: отложено; не требуется для текущего alpha и может быть добавлено для крупных бинарных артефактов.
- Last-write-wins: отклонено из-за риска тихой потери изменений.
- Автоматический three-way merge: отложен до следующего этапа сложности.

## Consequences
### Positive
- Нет silent overwrite.
- Межустройственная синхронизация подтверждена LIVE.
- Простая воспроизводимая архитектура для текстовых проектов.

### Limitations
- Snapshot ограничен 1,500,000 bytes.
- Конфликт пока требует ручного PULL/повторного PUSH.
- Binary/build artifacts должны храниться отдельно в будущем.
