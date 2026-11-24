# Знания Nexus для профильных специалистов

Начинайте со снимка в актуальном задании и рабочего SHA. Хронология C11 зафиксирована в handoff от 23 ноября. Для C12 применимы фактический merge `a944f722` и исходник выпуска `0473ec63`. Исторический handoff от 30 сентября хранится в проектных источниках. Сведения из закрытых чатов применяются после подтверждения владельцем или фиксации в доступном документе. [Handoff C11](AKRONIKL_IT_NEXUS_MASTER_HANDOFF_2026-11-23_RU.md) · [Nexus C12](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/releases/tag/nexus-ux-v2026.11.24)

| Профиль | Контракт и рабочие источники |
| --- | --- |
| Identity | `server-access/`, `cloudflare/`, `core/account-storage.js`, ADR-0003 |
| Studio | `project-studio/`, `sandbox/`, ADR-0010 и ADR-0011 |
| Содержание | `courses/catalog.json`, `courses/programming/languages.json`, реестры курса и [стандарт уроков](../03-content/NEXUS_LESSON_STANDARD_1.0.md) |
| ВКР | [Журнал утверждений и доказательств](../10-research/CLAIM_EVIDENCE_LEDGER.md), исходники, независимые проверки |
| QA | `.github/workflows/`, `tests/`, [журнал дефектов PR #65](../03-content/cpp-clarity-01/R65_DEFECT_LEDGER_RU.md) |
| Research | [ADR](../adr/), официальный источник по предмету и точные условия эксперимента |
| UX | [Аудит](../03-content/reference-courses-20261112/independent-audit-20261123/NEXUS_INDEPENDENT_UX_AUDIT_REVIEW_RU.md), `styles/`, `pwa/` |
| Помощник | [ADR автономного ядра](../08-assistant/ADR-AK0-001-OFFLINE_CORE.md), [Model Hub](../08-assistant/ADR-AKP4-002-MODEL-HUB.md), `akronikl/` |

Постоянные профили находятся в `.codex/agents/`. В активном Work-сеансе роль передаётся штатному подагенту явно. Загруженный профиль подтверждайте отдельным наблюдением при запуске, доступ к чату подтверждайте фактическим чтением. Рабочие области подагентов общие до явного выделения отдельного checkout.

После принятого изменения обновляйте ссылку на каноническое решение и короткую запись о существенной консультации. Снимок содержит исходный SHA, изменённые контракты, проверки и ограничения. Существующие handoff сохраняются как исторические записи. [Формат проектных профилей Codex](https://learn.chatgpt.com/docs/agent-configuration/subagents)
