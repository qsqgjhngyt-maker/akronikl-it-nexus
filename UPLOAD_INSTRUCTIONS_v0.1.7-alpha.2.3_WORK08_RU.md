# Публикация WORK08 / v0.1.7-alpha.2.3

## 1. Репозиторий

Распаковать:

`AKRONIKL_IT_NEXUS_v0.1.7-alpha.2.3_WORK08_BASELINE_CLOSURE_GITHUB_OVERLAY.zip`

поверх текущего `main`.

Этот overlay:
- добавляет WORK08 closure docs;
- обновляет README/CHANGELOG/release metadata;
- поднимает frontend/version badge до `v0.1.7-alpha.2.3`;
- обновляет Service Worker cache;
- обновляет version-consistency tests.

## 2. Commit

```text
release: close v0.1.7-alpha.2.3 architecture and AI research baseline
```

Расширенное описание:
`COMMIT_MESSAGE_v0.1.7-alpha.2.3_WORK08.txt`

## 3. После deploy

Проверить:
- главная открывается;
- badge показывает `v0.1.7 α2.3`;
- hard refresh/PWA cache обновился;
- Project Studio открывается;
- Cloud Sync не регрессировал.

## 4. GitHub Release

Tag:
`v0.1.7-alpha.2.3`

Title:
`AKRONIKL IT NEXUS v0.1.7-alpha.2.3 — Architecture & AI Research Baseline`

Описание:
`RELEASE_NOTES_GITHUB_v0.1.7-alpha.2.3.md`

Attach:
- FULL archive;
- final SHA256SUMS;
- optional COMPLETE RELEASE KIT.

## 5. Важно

Новый Cloudflare Worker deploy не требуется: backend Worker code в WORK08 не менялся.
