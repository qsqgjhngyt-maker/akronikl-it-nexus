# Публикация кандидата v0.1.7-alpha.2.4.5

## Рекомендуемый порядок
1. Обновить Cloudflare Worker кодом `2.4.5`.
2. Добавить/проверить text vars:

```text
IDENTITY_V2_BRIDGE_ENABLED=false
FIRST_PARTY_SESSION_ENABLED=false
FIRST_PARTY_DEPLOYMENT_CONFIRMED=false
```

3. D1 не менять.
4. Проверить `/api/v1/health` и `/api/v2/auth/capabilities`.
5. Только после этого наложить GitHub overlay и дождаться Pages.

## Коммит

`безопасность: добавить фундамент first-party HttpOnly-сессий v0.1.7-alpha.2.4.5`

## Запрет
Не переключать first-party flags в `true` на текущем `github.io ↔ workers.dev` deployment.
