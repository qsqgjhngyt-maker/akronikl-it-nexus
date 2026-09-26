# Browser Local Data Model — Current `v0.1.7-alpha.2.2.1`

## 1. Course/skill state

Storage key:

```text
akronikl:it-nexus:state:v1
```

Current default shape:

```json
{
  "schemaVersion": 1,
  "courses": {},
  "skills": {},
  "migrations": {},
  "updatedAt": null
}
```

Current C++ lesson helper writes:

```text
courses.cpp.lessons[lessonId]
```

Practicum helper writes:

```text
courses.cpp.practicums[practicumId]
```

This is local state, not yet a normalized cloud learning model.

## 2. Preferences

Storage key:

```text
akronikl:it-nexus:prefs:v1
```

Current fields:
- `uiLocale`
- `courseLocale`
- `mentorLocale`
- `sidebarCollapsed`
- `focusReading`
- `effectsQuality`
- `rightRailCollapsed`

## 3. Identity v1

Storage key:

```text
akronikl:it-nexus:identity:v1
```

Current fields:
- `schemaVersion`
- `deviceId`
- `localPrincipalId`
- `personalWorkspaceId`
- `accountSubjectId`
- `accountState`
- `createdAt`
- `updatedAt`

`activePrincipalId()` resolves `accountSubjectId || localPrincipalId`.

## 4. Local Project DB

Storage key:

```text
akronikl:it-nexus:projects:v1
```

Project DB schema version: `2`.

Top-level:

```json
{
  "schemaVersion": 2,
  "projects": {},
  "updatedAt": null
}
```

Project major groups:
- identity: `id`, `title`, `languageId`, `description`;
- `origin`;
- `manifest`;
- `workspace` with files/VFS;
- `progress`;
- `checkpoints`;
- `access`;
- `sync`;
- `release`;
- timestamps.

## 5. Local/Cloud distinction

Browser local project may contain:
- unsynced code;
- local checkpoints;
- local revision;
- local-only project.

Cloud snapshot is created only by explicit/authorized Cloud Sync PUSH.

Therefore local browser state and cloud project state must remain separate concepts in all target migrations.
