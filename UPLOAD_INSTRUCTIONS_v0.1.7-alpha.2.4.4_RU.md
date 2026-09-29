# Публикация кандидата v0.1.7-alpha.2.4.4

## GitHub
Распаковать `AKRONIKL_IT_NEXUS_v0.1.7-alpha.2.4.4_GITHUB_REPO_OVERLAY.zip` поверх текущего `main`.

Коммит:

`миграция: перевести Cloud Sync на приоритет серверных сессий v0.1.7-alpha.2.4.4`

## Cloudflare
На этапе deploy ничего не менять:
- Worker не обновлять;
- D1 migration не выполнять;
- `IDENTITY_V2_BRIDGE_ENABLED=false`.

## После Pages deploy
1. дождаться deployment;
2. hard refresh;
3. проверить badge `v0.1.7 α2.4.4`;
4. открыть Account → Nexus Cloud;
5. открыть Project Studio и проверить `auth transport: legacy fallback`.

Controlled session-first LIVE-тест выполняется отдельными шагами после read-only smoke.
