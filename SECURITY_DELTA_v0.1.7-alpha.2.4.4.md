# Изменения безопасности — v0.1.7-alpha.2.4.4

## 1. Разрешённый fallback

Fallback с `nxs_...` на `nxk_...` выполняется только если server session получила:

- HTTP `401` + `INVALID_SESSION`;
- HTTP `401` + `UNAUTHORIZED`.

Перед legacy retry stale `nxs_...` удаляется из `sessionStorage`.

## 2. Запрещённый fallback

Legacy retry **не выполняется** для:

- `403 FORBIDDEN`;
- `409 REVISION_CONFLICT`;
- network failure;
- `5xx`;
- других business/security ошибок.

Это предотвращает обход решения сервера заменой credential.

## 3. Account trust boundary

При успешной смене Nexus Cloud connection:
- старая server session по возможности отзывается сервером;
- browser credential затем удаляется;
- только после этого сохраняется новая Cloud account config.

При локальном отключении Nexus Cloud:
- текущая server session по возможности отзывается;
- локальные session/config credentials удаляются независимо от результата сети;
- если server revoke не удался, UI сообщает пользователю проверить «Устройства и сессии».

## 4. Что не решено этим релизом

- `nxk_...` всё ещё browser-readable и хранится в legacy localStorage config;
- `nxs_...` browser-readable в `sessionStorage`;
- first-party HttpOnly cookie не реализована;
- federation / Passkey / MFA не реализованы.

Поэтому `2.4.4` — migration foundation, а не финальная модель авторизации.
