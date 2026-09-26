# Data Retention Draft

**Status: PLANNED. Final policy requires legal/privacy review before public production.**

## Current
No new automatic retention policy is introduced by WORK04.

## Target categories

### Authentication/security
- active sessions: until expiry/revoke;
- recovery artifacts: until use/revoke;
- security/audit events: bounded retention chosen for security/support need.

### Learning progress
Retained while account exists unless user requests deletion/reset according to future product policy.

### Learning events
Should not be kept forever by default merely because storage is cheap.
A retention window or aggregation strategy must be selected before production collection.

### AI context/prompts
Default target should be minimized retention.
Exact storage of prompts/responses remains a separate decision.

### Thesis datasets
Create separate frozen, pseudonymized research datasets with:
- dataset version;
- inclusion rules;
- consent/source note;
- anonymization procedure;
- deletion handling.
