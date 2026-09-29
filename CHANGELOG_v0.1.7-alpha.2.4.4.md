# CHANGELOG v0.1.7-alpha.2.4.4

## Переход Cloud Sync на приоритет серверных сессий

### Добавлено
- session-first authentication для Project Studio Cloud Sync;
- controlled legacy fallback только после допустимого 401;
- отображение `auth transport` в SYNC-панели;
- отзыв текущей server session при relink/disconnect;
- предупреждение при неудачном revoke во время local disconnect.

### Сохранено
- PUSH/PULL API;
- revision conflict semantics;
- ACL;
- D1 schema;
- Worker;
- legacy rollback.

### Не заявляется
- отказ от legacy token;
- HttpOnly session;
- федеративный вход.
