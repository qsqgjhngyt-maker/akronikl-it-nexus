# Data Baseline Closure

Current production:
- browser-local course/preferences/identity/project stores;
- Cloudflare D1 with 12 current tables;
- D1-only project snapshots;
- server-owned cloud revision/audit.

Target drafts:
- Identity v2 account/session/passkey/MFA entities;
- cloud learning progress;
- Skill Graph;
- Learning Events;
- Learner Model state;
- AI context/evaluation entities.

No target table is deployed merely because it is documented.

Future schema change must follow ordered migration/versioning policy.
