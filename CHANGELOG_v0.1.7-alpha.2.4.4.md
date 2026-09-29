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

### Исправление запуска кандидата
- устранено двойное объявление `credential` в `Account Center`;
- исправлен boot-blocking `SyntaxError`;
- добавлен обязательный ESM module import smoke-test;
- уточнён текст Session Migration: Cloud Sync в `2.4.4` уже использует session-first модель.
