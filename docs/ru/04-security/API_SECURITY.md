> **Основной язык документации: русский.** Русская версия является нормативной.

# API Security

## Current rules
- HTTPS only;
- exact CORS origin allowlist;
- Worker performs server-side authentication/authorization;
- snapshot/input limits;
- no raw secret logging;
- no implicit trust in browser roles/project ownership.

## Identity v2 rules
- server-side provider broker;
- provider callbacks validated against one-time transaction;
- protected session credential is HttpOnly and revocable;
- mutating cookie-auth APIs require CSRF/origin protection;
- rate limiting for auth/recovery;
- uniform responses where enumeration is a risk;
- step-up for sensitive actions.

## AI
No AI provider secret belongs in public client.
Identity/session secrets never enter prompts or AI context.

## Runner
Code execution boundary remains separate from identity authorization. Identity grants permission to request an action; it does not make arbitrary code trusted.
