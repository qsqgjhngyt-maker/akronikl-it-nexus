Этот релиз переводит Project Studio Cloud Sync на общий Identity v2 credential flow.

## Что изменилось
- Cloud Sync при наличии `nxs_...` сначала использует server session;
- legacy `nxk_...` остаётся контролируемым rollback;
- stale session очищается только после допустимого `401`;
- `403` и `409 REVISION_CONFLICT` не вызывают fallback;
- SYNC-панель показывает фактический auth transport;
- при relink/disconnect предыдущая server session отзывается по возможности.

## Что не изменилось
- Cloudflare Worker;
- D1 schema;
- PUSH/PULL API;
- revision conflict protocol;
- ACL.

## Важно
Это migration foundation, а не окончательный отказ от browser-readable credentials.

`IDENTITY_V2_BRIDGE_ENABLED=false` остаётся production-default.

## Статус
Автоматическая регрессия пройдена.
LIVE-проверка production ещё не выполнена.
