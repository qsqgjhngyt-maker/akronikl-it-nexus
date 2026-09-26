# Data Classification & Privacy Baseline

## Classification

### PUBLIC
- public course metadata/content intended for publication;
- public release notes.

### INTERNAL
- architecture metadata;
- non-secret operational configuration;
- aggregated non-personal diagnostics.

### USER
- profile;
- course progress;
- project metadata/source;
- learning events;
- AI feedback.

### SENSITIVE AUTH
- session credentials;
- raw login tokens;
- MFA secrets;
- recovery codes;
- bootstrap secret;
- provider client secrets.

### RESEARCH
- experiment samples;
- AI context snapshots;
- evaluation results;
- derived learner states.

## Rules

1. `SENSITIVE AUTH` must never enter prompts, logs, screenshots, Git history or thesis appendices.
2. Research exports should use pseudonymous subject ids.
3. Project source is user content and should not become training/research data by default.
4. Learning events require purpose and retention definitions.
5. AI context must be minimized to task purpose.
6. Derived mastery/profile values need deletion/recompute strategy if underlying events are deleted.
7. External AI provider retention/training terms must be reviewed before production use.

## Diploma/research rule

Thesis evidence should prefer:
- synthetic data;
- developer-owned test account data;
- explicitly consented/pseudonymized participant data.

No hidden collection for thesis research.
