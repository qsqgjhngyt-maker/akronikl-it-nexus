# AKRONIKL IT NEXUS v0.1.7-alpha.2.4.4 — Переход Cloud Sync на приоритет серверных сессий

Этот релиз переводит Project Studio Cloud Sync на общий Identity v2 credential flow и закрывает этап полной production LIVE-проверкой.

## ✅ Полная LIVE-проверка пройдена

Подтверждено:

- Project Studio использует `nxs_...` server session первой;
- PULL через server session — PASS;
- PUSH через server session — PASS;
- cloud revision `7 → 8` — PASS;
- stale server session → `401 INVALID_SESSION` — PASS;
- stale `nxs_...` очищается — PASS;
- выполняется ровно один controlled retry через legacy `nxk_...`;
- fallback PULL rev 8 — PASS;
- Android legacy regression — PASS;
- iPhone legacy regression — PASS;
- test device revoke — PASS;
- рабочее зарегистрированное устройство сохранено active;
- финальное D1/security состояние подтверждено.

## 🔐 Политика fallback

Legacy retry разрешён только после допустимого `401`.

`403`, `409 REVISION_CONFLICT`, network errors и `5xx` не маскируются другим credential.

## 🧪 Финальное D1-состояние

- devices: `3`;
- active devices: `1`;
- revoked devices: `2`;
- sessions: `4`;
- active sessions: `0`;
- revoked sessions: `4`;
- security events: `10`.

## 🛡️ Production state

`IDENTITY_V2_BRIDGE_ENABLED=false`

Worker и D1 schema этим релизом не менялись.

## 📸 Evidence

Оптимизированные LIVE-доказательства находятся в репозитории:

`docs/evidence/releases/v0.1.7-alpha.2.4.4/`

Оригинальные screenshots приложены к GitHub Release отдельным архивом.

## Следующий архитектурный этап

First-party session transport / HttpOnly foundation и дальнейший вывод browser-readable legacy token из normal sign-in path.
