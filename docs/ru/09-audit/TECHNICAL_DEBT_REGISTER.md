# Technical Debt Register — старт v0.1.7-alpha.2.3

| ID | Приоритет | Область | Состояние | План |
|---|---|---|---|---|
| TD-001 | P0 | Docs | Sync doc всё ещё R2-centric | переписать под D1-only + deferred object storage |
| TD-002 | P0 | Release metadata | `version.json.notes` говорит LIVE retest pending | исправить при закрытии alpha.2.3 |
| TD-003 | P0 | Security | Nexus token хранится в localStorage | Identity v2 session architecture |
| TD-004 | P0 | Data | нет полного ERD/Data Dictionary production D1 | создать current ERD + dictionary |
| TD-005 | P0 | AI | target docs опережают runtime | ввести IMPLEMENTED/RESEARCH status |
| TD-006 | P1 | Identity | один ручной nexus-token вместо normal login | OAuth/passkey/MFA architecture |
| TD-007 | P1 | Sync | manual PUSH/PULL | позже offline queue/background sync |
| TD-008 | P1 | Conflict UX | conflict обнаруживается, auto-merge нет | three-way merge research |
| TD-009 | P1 | Schema | subject ids не везде SQL FK | ADR: logical vs physical integrity |
| TD-010 | P1 | Team | DB/ACL foundation есть, UX неполный | invitations/member management |
| TD-011 | P2 | Operations | нет полноценного admin observability center | Control Center |
| TD-012 | P2 | AI Data | нет normalized learning-event stream | design before AI implementation |
