# Изменения безопасности — v0.1.7-alpha.2.4.4

## Подтверждённые свойства

- server session имеет приоритет над legacy token;
- legacy fallback ограничен допустимым `401`;
- `403` и `409` не обходятся другим credential;
- stale `nxs` удаляется перед legacy retry;
- при relink/disconnect session retirement выполняется по возможности;
- bridge после controlled issuance возвращается в `false`;
- raw credentials не входят в release evidence.

## Финальный controlled state

- active devices: 1;
- active sessions: 0;
- revoked sessions: 4;
- security events: 10.

## Не закрыто этим этапом

- HttpOnly first-party session;
- удаление browser-readable legacy token из normal sign-in path;
- federated providers / Passkey / MFA.
