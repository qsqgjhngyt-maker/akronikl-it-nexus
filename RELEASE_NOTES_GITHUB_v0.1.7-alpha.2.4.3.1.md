Cloud account configuration is now owned by **Account Center**, while Project Studio keeps only project-level cloud actions.

## Changed
- added dedicated **Account → Nexus Cloud** settings;
- removed the ambiguous **Cloud Sync** account-setup button from the Projects dashboard;
- kept **↓ Из облака** for cloud project discovery/import;
- unconfigured cloud import now explains the state and routes to Account Center;
- open-project SYNC settings now route to Account Center;
- PUSH/PULL, revisions and audit remain unchanged.

## Why
Android LIVE testing confirmed the backend was healthy (`cloud rev 7`, successful `sync.pulled`) but the previous placement of account setup next to cloud project import created unnecessary ambiguity.

## Backend
No Cloudflare changes are required. Worker/D1 remain on the LIVE-verified `2.4.2` backend foundation and migration bridge remains disabled.

**Candidate status:** automated PASS; post-deploy cross-device routing smoke pending.
