# Публикация GitHub Release — v0.1.7-alpha.2.4.4

## 1. Репозиторий

Распаковать `AKRONIKL_IT_NEXUS_v0.1.7-alpha.2.4.4_FINAL_GITHUB_REPO_OVERLAY.zip` поверх текущего `main`.

Коммит:

`документация: закрыть переход Cloud Sync на приоритет серверных сессий как полную LIVE-проверку v0.1.7-alpha.2.4.4`

## 2. Cloudflare

Ничего не менять. Финальное production-состояние:

`IDENTITY_V2_BRIDGE_ENABLED=false`

## 3. GitHub Release

Тег:
`v0.1.7-alpha.2.4.4`

Название:
`AKRONIKL IT NEXUS v0.1.7-alpha.2.4.4 — Переход Cloud Sync на приоритет серверных сессий — полная LIVE-проверка пройдена`

В поле «Примечания к выпуску» вставить содержимое `RELEASE_NOTES_GITHUB_v0.1.7-alpha.2.4.4.md`.

Приложить только:

1. `AKRONIKL_IT_NEXUS_v0.1.7-alpha.2.4.4_FULL_WITH_EVIDENCE.zip`
2. `AKRONIKL_IT_NEXUS_v0.1.7-alpha.2.4.4_EVIDENCE_ORIGINALS.zip`
3. `AKRONIKL_IT_NEXUS_v0.1.7-alpha.2.4.4_SHA256SUMS_FINAL.txt`

FINAL GITHUB REPO OVERLAY в Release assets не добавлять — его содержимое должно быть закоммичено в `main`.
