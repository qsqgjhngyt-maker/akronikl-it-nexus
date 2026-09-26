# Security & Privacy Requirements — v0.1.7-alpha.2.3

| ID | Priority | Status | Domain | Normative requirement |
| --- | --- | --- | --- | --- |
| SEC-SECRET-001 | P0 | IMPLEMENTED | Provider secrets | Секреты провайдеров не должны попадать в публичный клиент, Git, course ZIP или PWA cache. |
| SEC-SECRET-002 | P0 | IMPLEMENTED | Server secret store | Серверные секреты должны храниться в управляемом secret store/Cloudflare Secret или эквиваленте. |
| SEC-AUTH-001 | P0 | IMPLEMENTED | Token hashing | Backend не должен хранить raw Nexus account token; хранится криптографический hash. |
| SEC-AUTH-002 | P0 | IMPLEMENTED | Bootstrap closure | Первичная bootstrap-операция должна закрываться после создания первого account subject. |
| SEC-AUTH-003 | P0 | PLANNED | Production sessions | Долгоживущий account token не должен быть конечной пользовательской session model. |
| SEC-SESSION-001 | P0 | PLANNED | Secure session storage | Production web session должна использовать защищённый механизм, исключающий хранение reusable bearer secret в localStorage. |
| SEC-SESSION-002 | P0 | PLANNED | Revocation | Активная сессия/устройство должны отзываться без смены всех учётных данных. |
| SEC-MFA-001 | P0 | PLANNED | MFA | Критические account actions должны поддерживать step-up/MFA. |
| SEC-ACL-001 | P0 | FOUNDATION | Default deny | Неизвестный/нечлен проекта не должен получать project actions. |
| SEC-ACL-002 | P0 | FOUNDATION | DENY precedence | Explicit DENY должен иметь приоритет над role/policy ALLOW. |
| SEC-DATA-001 | P0 | IMPLEMENTED | Revision integrity | PUT проекта должен проверять baseRevision и отвергать stale write. |
| SEC-DATA-002 | P1 | PLANNED | DB integrity | Для logical identity references должен быть принят ADR: SQL FK либо application-enforced integrity с тестами. |
| SEC-PRIV-001 | P0 | PLANNED | Learning event consent | Перед облачным сбором learning events должны быть определены purpose, retention, consent/control и privacy policy. |
| SEC-AI-001 | P0 | PLANNED | AI context isolation | AI не должен автоматически читать все данные аккаунта; доступ проходит через минимальный permission/context layer. |
| SEC-AI-002 | P0 | PLANNED | Prompt/data exfiltration protection | AI gateway должен ограничивать передачу секретов, токенов и неразрешённых project/account data. |
| SEC-API-001 | P0 | IMPLEMENTED | CORS | Production API должен отражать только разрешённый Origin и необходимые методы/headers. |
| SEC-API-002 | P1 | PLANNED | Abuse protection | Identity, support и AI endpoints должны иметь rate limiting и abuse controls. |
