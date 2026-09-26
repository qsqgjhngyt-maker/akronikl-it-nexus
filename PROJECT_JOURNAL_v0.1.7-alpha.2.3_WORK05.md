# PROJECT JOURNAL — `v0.1.7-alpha.2.3` WORK05

Дата: 2026-09-26

Закрыт этап **Identity & Security Design**.

Главное решение:
Nexus Account становится самостоятельной сущностью, а способы входа — подключаемыми identities.

Принятые направления:
- server-side Identity Broker;
- federated/passwordless-first;
- Yandex/Google/Apple/phone adapters;
- passkeys + TOTP;
- revocable sessions/devices;
- no email auto-merge;
- first-party session deployment as public-release gate;
- admin/security step-up;
- explicit migration from current `nxk_...` token.

Особенно важный архитектурный вывод:
текущий `github.io ↔ workers.dev` alpha Cloud Sync не ломается, но production Identity v2 не будет строиться на third-party cookie assumptions.

Security regression baseline: 36/36 PASS.

Следующий этап: **WORK06 — AI Research Design**.
