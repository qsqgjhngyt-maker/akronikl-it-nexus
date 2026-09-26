# CHANGELOG v0.1.7-alpha.2.4.3.1

## Cloud UX & Account Routing Cleanup

### Changed
- moved Nexus Cloud connection/configuration ownership into Account Center;
- added dedicated `Nexus Cloud` Account tab;
- removed ambiguous `Cloud Sync` setup button from Projects dashboard;
- kept `+ Новый проект` and `↓ Из облака` as project dashboard actions;
- unconfigured cloud import now explains the missing connection and routes to Account Center;
- project-level SYNC settings button now routes to Account Center instead of reopening bootstrap prompts;
- centralized connect/change/disconnect UI around the account/device scope.

### Preserved
- explicit project PUSH/PULL;
- remote project import;
- revision/conflict model;
- audit history;
- legacy Nexus Cloud compatibility;
- Identity v2 Devices & Sessions UI;
- production bridge disabled.

### Backend
No Worker or D1 deployment is required.

### Cloud tab routing correction
- fixed `Account Center → Nexus Cloud` rendering the Security panel;
- `Nexus Cloud` now renders its own connection-management block;
- added automated regression coverage for local-only and cloud-linked action labels.
