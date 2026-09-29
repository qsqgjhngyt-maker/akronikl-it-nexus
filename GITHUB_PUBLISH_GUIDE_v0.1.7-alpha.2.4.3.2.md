# GitHub Publish Guide — v0.1.7-alpha.2.4.3.2 FINAL

## 1. Repository
Распаковать `AKRONIKL_IT_NEXUS_v0.1.7-alpha.2.4.3.2_FINAL_GITHUB_REPO_OVERLAY.zip` поверх текущего `main`.

Коммит:

`документация: закрыть Identity Session UI hotfix как FULL LIVE PASS v0.1.7-alpha.2.4.3.2`

## 2. Cloudflare
Ничего не менять.

Финальное production-состояние:
`IDENTITY_V2_BRIDGE_ENABLED=false`

## 3. GitHub Release
Tag:
`v0.1.7-alpha.2.4.3.2`

Название:
`AKRONIKL IT NEXUS v0.1.7-alpha.2.4.3.2 — Identity Session UI State Refresh FULL LIVE PASS`

В Release Notes вставить содержимое:
`RELEASE_NOTES_GITHUB_v0.1.7-alpha.2.4.3.2.md`

Assets:
1. `AKRONIKL_IT_NEXUS_v0.1.7-alpha.2.4.3.2_FULL_WITH_EVIDENCE.zip`
2. `AKRONIKL_IT_NEXUS_v0.1.7-alpha.2.4.3.2_EVIDENCE_ORIGINALS.zip`
3. `AKRONIKL_IT_NEXUS_v0.1.7-alpha.2.4.3.2_SHA256SUMS_FINAL.txt`

`FINAL_GITHUB_REPO_OVERLAY.zip` в Release assets не добавлять: его содержимое должно быть закоммичено в `main`.
