# Публикация v0.1.7-alpha.2.4.3.2

## GitHub
Распаковать `AKRONIKL_IT_NEXUS_v0.1.7-alpha.2.4.3.2_GITHUB_REPO_OVERLAY.zip` поверх текущего `main`.

Commit:

`fix: refresh Identity session summary after revoke v0.1.7-alpha.2.4.3.2`

## Cloudflare
Ничего не менять:
- Worker не deploy;
- D1 migration не выполнять;
- `IDENTITY_V2_BRIDGE_ENABLED=false` оставить как есть.

## После GitHub Pages deploy
1. дождаться Pages;
2. hard refresh;
3. проверить badge `v0.1.7 α2.4.3.2`;
4. Account → Devices;
5. выполнить `LIVE_TEST_PROTOCOL_v0.1.7-alpha.2.4.3.2.md`.
