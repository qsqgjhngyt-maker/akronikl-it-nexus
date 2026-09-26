# RELEASE v0.1.7-alpha.2.4.3.1

**Name:** Cloud UX & Account Routing Cleanup  
**Date:** 2026-09-27  
**Type:** frontend information-architecture / routing cleanup

## Result
The platform now has a clear boundary between account/cloud configuration and project synchronization.

- **Account Center → Nexus Cloud** manages the device's cloud connection.
- **Projects** creates/imports projects.
- **Open project → SYNC** performs explicit PUSH/PULL and shows revisions/audit.

## LIVE discovery that motivated the change
Android `v0.1.7-alpha.2.4.3` was successfully linked to account `Akronikl` and could:
- discover remote project `Экспедиция — Sync Test1-2` at cloud rev 7;
- import/open it;
- show `mode=cloud`, provider `cloudflare`, cloud rev 7;
- record `sync.pulled`.

The old dashboard `Cloud Sync` button still launched account connection prompts, which was technically correct for that control but semantically confusing next to `↓ Из облака`.

## Candidate status
Automated validation: PASS.  
Post-deploy desktop/iPhone/Android routing smoke: PENDING.
