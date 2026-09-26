# Публикация v0.1.7-alpha.2.4.3

## GitHub
Распаковать `AKRONIKL_IT_NEXUS_v0.1.7-alpha.2.4.3_GITHUB_REPO_OVERLAY.zip` поверх текущего `main`.

Commit:

`feat: add Devices & Sessions migration foundation v0.1.7-alpha.2.4.3`

## Cloudflare
Ничего не менять:
- Worker не deploy;
- D1 migration не выполнять;
- `IDENTITY_V2_BRIDGE_ENABLED` оставить `false`.

## После Pages deploy
Hard refresh.

Сначала выполнить только read-only smoke:
Account → Devices → проверить реальные devices/sessions и отсутствие layout-регрессии.

Revoke-тест делаем отдельно и только на disposable session/device.
