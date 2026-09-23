# Architecture Delta — v0.1.7-alpha.2.2.1

## Cloud Sync D1-only + verified optimistic concurrency

### Transport
- Health/bootstrap calls с `skipAuth` не формируют пустой `Authorization`.
- Worker preflight отражает `Access-Control-Request-Headers` при разрешённом origin.
- Exact-origin CORS restriction сохранён.

### Storage
- Immutable project snapshots текущего alpha-этапа хранятся в D1 `project_snapshots`.
- Лимит snapshot: 1,500,000 bytes.
- Legacy `r2_key`/`latest_r2_key` сохранены для совместимости и используют `d1:<project>:<revision>` locator.

### Concurrency
Cloud Sync использует optimistic concurrency:
- клиент отправляет `baseRevision`;
- сервер сравнивает её с `current_revision`;
- stale write отклоняется `409 REVISION_CONFLICT`;
- пользователь выполняет PULL, получает новую базу и повторяет PUSH.

Механизм подтверждён LIVE-тестом: stale PUSH был отклонён, затем выполнены PULL rev 5 и PUSH rev 6 без потери удалённого изменения.

### Cross-device
Подтверждена двусторонняя цепочка:
`PC ↔ GitHub Pages client ↔ Cloudflare Worker ↔ D1 ↔ iPhone`.

### Deferred
- автоматический three-way merge;
- background queue reconciliation;
- large/binary artifact storage;
- полноценный OIDC/session layer;
- team invitation acceptance UI.
