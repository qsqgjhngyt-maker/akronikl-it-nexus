# PATCH v0.1.7-alpha.2.4.3.1 — Cloud UX & Account Routing Cleanup

## Runtime files changed
- `core/account-shell.js` — dedicated Account → Nexus Cloud settings and ownership.
- `project-studio/project-studio.js` — removes dashboard account-setup control; routes settings/import fallback to Account Center.
- `styles/app.css` — Cloud responsibility/settings styling.
- `core/app.js`, `index.html`, `service-worker.js`, `version.json`, `project.json` — version/cache metadata.

## Tests changed/added
- `tests/cloud-account-routing-cleanup-check.mjs` — new IA/routing contract.
- existing account/cloud/version tests updated to the new version/ownership contract.

## Documentation/evidence
- architecture delta, changelog, release, journal, defect log, ADR, test matrix, live protocol, upload instructions, build verification;
- discovery evidence showing the pre-fix ambiguous Projects control and successful Android cloud rev 7 import/PULL.

## Backend
No Worker/D1 patch is part of this increment.

## Routing correction after LIVE smoke

A LIVE desktop check found that the newly added `Nexus Cloud` tab fell through to the Security content because the final tab-content selector omitted the `cloud` case.

Corrected mapping:

`overview → overview`  
`cloud → cloud`  
`learning → learning`  
`devices → devices`  
`security → security`

No backend, D1 or Cloud Sync protocol change.
