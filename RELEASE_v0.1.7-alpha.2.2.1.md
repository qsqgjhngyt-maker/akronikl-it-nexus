# AKRONIKL IT NEXUS v0.1.7-alpha.2.2.1

**Release name:** Cloud Sync Bootstrap Transport Hotfix — D1-only  
**Final verification status:** **LIVE PASS**  
**Closed:** 2026-09-24

## Purpose
Релиз закрывает первый реальный цикл GitHub Pages → Cloudflare Worker → D1 → несколько устройств и подтверждает работу Nexus Account, push/pull, аудита, облачных ревизий и защиты от stale write.

## Implemented fixes
- Bootstrap/health `skipAuth` больше не отправляет пустой `Authorization`.
- CORS preflight Worker учитывает фактически запрошенные `Access-Control-Request-Headers`.
- Snapshot storage на текущем alpha-этапе работает в D1-only режиме.
- Добавлена воспроизводимая миграция `project_snapshots`.
- Service Worker cache/release metadata обновлены для доставки исправленного клиента.

## LIVE verification
- First-owner bootstrap: **PASS**.
- Nexus Account authentication: **PASS**.
- Token authentication/use: **PASS**.
- D1 persistence: **PASS**.
- Initial/repeated project PUSH: **PASS**.
- PC → Cloud → iPhone PULL: **PASS**.
- iPhone → Cloud → PC PULL: **PASS**.
- Audit logging: **PASS**.
- Revision conflict detection: **PASS**.
- Stale write protection / lost update prevention: **PASS**.
- Conflict recovery → Cloud revision 6: **PASS**.

## Diagnostic history
До hotfix bootstrap из GitHub Pages завершался `net::ERR_CONNECTION_RESET / Failed to fetch`. После применения совокупного transport hotfix bootstrap и дальнейшие cloud-сценарии прошли. Единственная конкретная первопричина между CORS/preflight и пустым `Authorization` отдельно не изолировалась; в документации сохраняется корректная формулировка **combined transport hotfix resolved the failure**.

## Security invariants
- `BOOTSTRAP_SECRET` не хранится в GitHub.
- Полный `nxk_...` токен не публикуется; сервер хранит SHA-256 hash.
- Bootstrap закрывается после создания первого аккаунта.
- Production dev-auth запрещён.
- Writes защищены ACL и optimistic concurrency (`baseRevision`).

## Evidence
См. [`docs/evidence/releases/v0.1.7-alpha.2.2.1/EVIDENCE_INDEX.md`](docs/evidence/releases/v0.1.7-alpha.2.2.1/EVIDENCE_INDEX.md).
