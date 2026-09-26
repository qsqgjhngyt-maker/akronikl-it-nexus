# Nexus Control Center — Security Target

The future Control Center has stronger security requirements than ordinary learning UI.

## Roles
Candidate platform roles:
- `platform_owner`
- `platform_admin`
- `content_admin`
- `support`

Project/workspace roles remain a separate authorization domain.

## Rules
- platform role is server-owned;
- no role comes from provider claims/email string alone;
- critical actions require step-up auth;
- destructive/bulk actions need confirmation;
- all admin mutations are audited;
- support cannot retrieve user auth secrets;
- admin session timeout may be stricter than normal user session.

## Critical actions
- platform role changes;
- identity/recovery override if ever introduced;
- feature/security configuration;
- content publication rollback/delete;
- user account disable;
- data export/delete operations.

## Initial recommendation
Do not implement user impersonation in the first Control Center.
