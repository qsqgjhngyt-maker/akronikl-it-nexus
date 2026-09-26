# Authentication vs Authorization Boundary

Authentication answers:

> Кто является текущим Nexus account?

Authorization answers:

> Разрешено ли этому account выполнить конкретное действие над конкретным ресурсом?

## Identity layer must NOT decide project rights from UI
After session authentication, server receives `accountId/subjectId`.

Project access still resolves through:
- owner/membership;
- role;
- path scope;
- action;
- explicit DENY policies.

## Platform roles
Future platform-admin/content/support roles are separate from project roles.

A user may be:
- project owner but not platform admin;
- content admin but viewer of a private project;
- support agent with no project source access.

This separation prevents accidental privilege coupling.
