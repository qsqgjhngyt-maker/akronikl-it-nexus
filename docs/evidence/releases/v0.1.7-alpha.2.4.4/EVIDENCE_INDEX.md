# Индекс LIVE-доказательств — v0.1.7-alpha.2.4.4

**Этап:** Переход Cloud Sync на приоритет серверных сессий  
**Дата закрытия:** 2026-09-29  
**Финальный статус:** полная LIVE-проверка пройдена

## Политика безопасности

В evidence не публикуются raw `nxk_...`, raw `nxs_...` и `BOOTSTRAP_SECRET`. Оригинальные screenshots вынесены отдельным архивом GitHub Release.

| № | Evidence | Подтверждение |
|---:|---|---|
| 01 | `01_boot_failure_syntax_error.webp` | Первый deploy кандидата: boot-blocking SyntaxError duplicate credential. |
| 02 | `02_boot_failure_timeout.webp` | Вторичное bootstrap timeout-сообщение как следствие boot failure. |
| 03 | `03_boot_hotfix_pass_baseline.webp` | После boot-hotfix v2.4.4 загружается; Account Center и legacy baseline работают. |
| 04 | `04_project_studio_legacy_baseline.webp` | Project Studio до nxs: auth transport = legacy fallback, cloud rev 7. |
| 05 | `05_bridge_enabled_controlled.webp` | Bridge временно включён только для controlled issuance test. |
| 06 | `06_nxs_session_created_pass.webp` | Controlled nxs session создана и аутентифицирована; token не выведен. |
| 07 | `07_project_studio_server_session.webp` | Project Studio переключился на auth transport = server session при bridge=false. |
| 08 | `08_pull_via_nxs_pass.webp` | PULL через nxs успешно; cloud rev 7; sync.pulled. |
| 09 | `09_push_via_nxs_rev8_pass.webp` | PUSH через nxs успешно; cloud revision 7→8; sync.pushed. |
| 10 | `10_stale_session_prepared.webp` | Server session отозвана намеренно, browser credential оставлен stale для fallback-теста. |
| 11 | `11_fallback_pull_rev8_pass.webp` | Следующий PULL успешно выполняет controlled fallback и показывает legacy fallback, rev 8. |
| 12 | `12_account_devices_after_fallback.webp` | Account Center после fallback: 0 active/current server sessions, bridge=false. |
| 13 | `13_android_rev8_project.webp` | Android открыл rev 8 через legacy fallback; Project Studio sync state корректен. |
| 14 | `14_android_rev8_discovery.webp` | Android обнаружил облачный проект rev 8. |
| 15 | `15_iphone_rev8_pull.webp` | iPhone открыл/PULL rev 8 через legacy fallback. |
| 16 | `16_iphone_rev8_discovery.webp` | iPhone обнаружил облачный проект rev 8. |
| 17 | `17_test_device_revoked.webp` | Test session-first device отозван через UI; working device остаётся active. |
| 18 | `18_final_d1_counts.webp` | Финальный D1: devices=3, active=1, revoked=2, sessions=4, active=0, revoked=4, events=10. |

## Итоговая проверенная цепочка

```text
legacy baseline
→ controlled nxs issuance
→ bridge=false
→ Project Studio: server session
→ PULL via nxs
→ PUSH via nxs (rev 7→8)
→ server-side revoke while browser nxs remains stale
→ next PULL: 401 INVALID_SESSION
→ stale nxs cleared
→ exactly one legacy retry
→ PULL rev 8 succeeds
→ Project Studio: legacy fallback
→ Android/iPhone legacy regression PASS
→ test device revoked
→ final D1/security state PASS
```

## Финальное D1-состояние

- devices: `3`
- active devices: `1`
- revoked devices: `2`
- sessions: `4`
- active sessions: `0`
- revoked sessions: `4`
- security events: `10`

Production bridge после тестов: `IDENTITY_V2_BRIDGE_ENABLED=false`.
