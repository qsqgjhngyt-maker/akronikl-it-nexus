# Публикация v0.1.7-alpha.2.4.3.1

## GitHub
Распаковать `AKRONIKL_IT_NEXUS_v0.1.7-alpha.2.4.3.1_GITHUB_REPO_OVERLAY.zip` поверх текущего `main`.

Commit:

`refactor: centralize Nexus Cloud settings in Account Center v0.1.7-alpha.2.4.3.1`

## Cloudflare
**Ничего не менять.**

- Worker не deploy;
- D1 migration не выполнять;
- `IDENTITY_V2_BRIDGE_ENABLED=false` оставить без изменений.

## После GitHub Pages deploy
1. hard refresh;
2. проверить версию `v0.1.7 α2.4.3.1`;
3. открыть Projects — кнопки `Cloud Sync` там быть не должно;
4. открыть Account → Nexus Cloud;
5. проверить desktop/iPhone/Android по `LIVE_TEST_PROTOCOL_v0.1.7-alpha.2.4.3.1.md`.

До завершения smoke не выполнять destructive Identity revoke.
