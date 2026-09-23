# Evidence Index — v0.1.7-alpha.2.2.1

Дата LIVE-проверок: **2026-09-24**

Назначение: доказательная база релиза Cloud Sync для технической документации и будущей дипломной работы.

> В репозиторий включены оптимизированные WebP-копии. Оригиналы PNG/JPEG хранятся отдельным GitHub Release asset. На снимках отсутствуют `BOOTSTRAP_SECRET` и полный `nxk_...` токен.

| № | Файл | Статус | Что подтверждает |
|---:|---|:---:|---|
| 1 | [01_bootstrap_failure_err_connection_reset.webp](01_bootstrap_failure_err_connection_reset.webp) | DEFECT | До исправления: браузерный bootstrap завершался `net::ERR_CONNECTION_RESET / Failed to fetch`. |
| 2 | [02_health_bootstrap_closed.webp](02_health_bootstrap_closed.webp) | PASS | После успешного bootstrap `/api/v1/health` показывает `bootstrapOpen:false`. |
| 3 | [03_d1_account_subjects.webp](03_d1_account_subjects.webp) | PASS | D1: создан активный Nexus Account `Akronikl` в `account_subjects`. |
| 4 | [04_d1_account_tokens.webp](04_d1_account_tokens.webp) | PASS | D1: активная запись токена и заполненный `last_used_at`; секретный `nxk_...` не отображается. |
| 5 | [05_desktop_push_cloud_rev1.webp](05_desktop_push_cloud_rev1.webp) | PASS | ПК: первый облачный PUSH, `cloud rev 1`, запись `sync.pushed`. |
| 6 | [06_desktop_push_cloud_rev2.webp](06_desktop_push_cloud_rev2.webp) | PASS | ПК: повторный PUSH, `cloud rev 2`; подтверждена последовательная ревизия. |
| 7 | [07_iphone_pull_cloud_rev2_a.webp](07_iphone_pull_cloud_rev2_a.webp) | PASS | iPhone: PULL проекта из облака; в AUDIT `sync.pulled / Cloud revision 2`. |
| 8 | [08_iphone_pull_cloud_rev2_b.webp](08_iphone_pull_cloud_rev2_b.webp) | PASS | iPhone: Cloud Sync подключён к аккаунту `Akronikl`, `cloud rev 2`. |
| 9 | [09_desktop_pull_cloud_rev4_a.webp](09_desktop_pull_cloud_rev4_a.webp) | PASS | ПК: обратная синхронизация после изменения на смартфоне; получены метаданные и содержимое проекта. |
| 10 | [10_desktop_pull_cloud_rev4_b.webp](10_desktop_pull_cloud_rev4_b.webp) | PASS | ПК: `sync.pulled / Cloud revision 4`; подтверждён iPhone → Cloud → PC. |
| 11 | [11_revision_conflict_rejected.webp](11_revision_conflict_rejected.webp) | PASS | Конфликт ревизий: stale PUSH с ПК отклонён сообщением `Cloud project changed since this client base revision`. |
| 12 | [12_conflict_recovery_cloud_rev6.webp](12_conflict_recovery_cloud_rev6.webp) | PASS | Восстановление после конфликта: PULL rev 5, затем успешный PUSH rev 6; обе контрольные строки сохранены. |

## Итог доказательной серии

- Bootstrap первого Nexus Account: **PASS**.
- Token authentication: **PASS**.
- D1 persistence: **PASS**.
- PC → Cloud → iPhone: **PASS**.
- iPhone → Cloud → PC: **PASS**.
- Revision conflict detection / stale write protection: **PASS**.
- Conflict recovery and subsequent PUSH: **PASS**.
- Финальная наблюдаемая облачная ревизия теста: **6**.
