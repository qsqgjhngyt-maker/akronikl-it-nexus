# 0.1.7-alpha.2.4.6-ui1a.10.10.2-p4q.19 · P4-Q для тестировщиков

- Помощник, личные API-подключения, история, вложения и вставка скриншотов.
- Озвучка Piper «Уют-7», автоозвучка и самозагружающийся установщик локальной Qwen TTS.
- Сохранение сессий, оба ролика запуска, управление пользователями и независимое продление сроков приглашения и доступа.
- Рабочая публикация, проверенные артефакты и сохранённый откат: [манифест](release/production-release.json).

Предыдущие записи сохранены ниже.

- 0.1.7-alpha.2.4.5 — Фундамент first-party HttpOnly-сессий: безопасный `__Host`/HttpOnly foundation с two-key gate; текущий GitHub Pages production остаётся cookie-disabled.
- 0.1.7-alpha.2.4.4 — Переход Cloud Sync на приоритет серверных сессий: полная LIVE-проверка пройдена; PULL/PUSH via nxs, stale-session fallback, Android/iPhone regression, D1 proof.
- 0.1.7-alpha.2.4.3.2 — Identity Session UI State Refresh Hotfix: FULL LIVE PASS; no-F5 session revoke fallback + controlled device revoke confirmed.
- 0.1.7-alpha.2.4.3.1 — Cloud UX & Account Routing Cleanup: Nexus Cloud account setup moved to Account Center; Projects dashboard now contains only project actions; cloud import/settings route through the Account Center; backend unchanged.
- 0.1.7-alpha.2.4.3 — Devices & Sessions / Session Migration Foundation: real server device/session UI, revoke actions, session-first Account Center resolver and safe legacy rollback; backend 2.4.2 retained.
- 0.1.7-alpha.2.4.2 — Identity v2 Session Foundation LIVE PASS: D1 sessions/devices/security audit, revocation, controlled legacy bridge, Cloud Sync backward compatibility and full session lifecycle production verification.
- 0.1.7-alpha.2.4.1 — Nexus Account Shell Foundation: global account chip, Account Center, home account state, current Nexus Cloud identity bridge and Identity v2 planned-method surface.
- 0.1.7-alpha.2.3 — Architecture & AI Research Baseline: closes WORK01–WORK08, formalizes requirements/architecture/data/security/AI research/competitive research and bumps frontend/cache metadata. Existing Cloud Sync LIVE PASS retained.
- 0.1.7-alpha.2.2.1 — Cloud Sync Bootstrap Transport Hotfix — D1-only: dynamic CORS preflight headers, no empty Authorization on bootstrap, D1 snapshot storage, SW cache/version bump. LIVE bootstrap retest later completed successfully.

# CHANGELOG v0.1.7-alpha.2.3

Historical release: **v0.1.7-alpha.2.3 — Architecture & AI Research Baseline**.

See [`CHANGELOG_v0.1.7-alpha.2.3.md`](CHANGELOG_v0.1.7-alpha.2.3.md). Historical changelogs are preserved alongside it.
