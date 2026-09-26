# Публикация v0.1.7-alpha.2.4.2

## Порядок строго такой

### 1. D1
Применить:
`cloudflare/nexus-sync-worker/migrations/0004_identity_v2_session_foundation.sql`

Проверить `D1_0004_VERIFY.sql`.

### 2. Worker
Обновить Worker код из:
`AKRONIKL_NEXUS_WORKER_v0.1.7-alpha.2.4.2_IDENTITY_SESSION_FOUNDATION.txt`

Существующие bindings/secrets не менять.

Добавить text variable:

```text
IDENTITY_V2_BRIDGE_ENABLED=false
```

Deploy.

### 3. Проверка backend
Проверить `/api/v1/health` и `/api/v2/auth/capabilities`.

### 4. GitHub
Распаковать GITHUB OVERLAY поверх `main`.

Commit:

```text
feat: add Identity v2 session foundation v0.1.7-alpha.2.4.2
```

### 5. LIVE regression
Проверить Account Center и существующий Project Studio Cloud Sync.

## Не делать пока
- не включать Yandex/Google/Apple credentials;
- не удалять legacy `account_tokens`;
- не включать bridge без намеренного теста;
- не публиковать `nxk_...` или `nxs_...`.
