# AKRONIKL IT NEXUS — Data Baseline

**Этап:** `v0.1.7-alpha.2.3` WORK04  
**Runtime baseline:** `v0.1.7-alpha.2.2.1`  
**Дата:** 2026-09-26  
**Статус:** WORK04 COMPLETE  
**Нормативный язык:** русский

## 1. Назначение

WORK04 фиксирует:

1. фактическую production D1 schema;
2. фактические browser-local модели;
3. Data Dictionary;
4. data ownership и trust boundaries;
5. target Identity data model;
6. target Learning / Skill / AI Research data model;
7. event taxonomy;
8. migration/versioning policy;
9. privacy/data-classification baseline.

## 2. Current production stores

### Browser
- `akronikl:it-nexus:state:v1` — course/skill state;
- `akronikl:it-nexus:prefs:v1` — UI/course/mentor preferences;
- `akronikl:it-nexus:identity:v1` — local device/principal/account link;
- `akronikl:it-nexus:projects:v1` — local project database;
- sync configuration/token — current alpha Cloud Sync configuration.

### Cloudflare D1
12 production tables:
- `account_subjects`
- `account_tokens`
- `workspaces`
- `workspace_members`
- `projects`
- `project_members`
- `project_access_policies`
- `project_revisions`
- `project_snapshots`
- `project_checkpoints`
- `project_invites`
- `audit_events`

## 3. Data principles

1. **Server authorization data is server-owned.**
2. **Cloud revision is server-owned.**
3. **Local project state remains local-first.**
4. **Cloud snapshots are explicit sync data, not implicit telemetry.**
5. **Future learning/AI telemetry must be purpose-bound and privacy-controlled.**
6. **AI provider does not become a system-of-record.**
7. **Raw secrets are never part of project/course/AI datasets.**
8. **Target schema is not deployed merely because it exists in documentation.**

## 4. Current vs target

Current D1 Cloud Sync schema is stable enough for alpha synchronization, but it is not yet a complete account/learning/AI data platform.

WORK04 therefore separates:

- `CURRENT` — exact current schema;
- `TARGET-DRAFT` — future Identity/Learning/AI entities;
- `RESEARCH` — fields/algorithms whose semantics require experiments.

## 5. WORK05 gate

Before Identity v2 implementation:
- decide account/session/auth identity model;
- decide DB-level vs application-level identity FKs;
- decide session storage/revocation;
- define provider linking rules;
- define MFA/passkey recovery policy.
