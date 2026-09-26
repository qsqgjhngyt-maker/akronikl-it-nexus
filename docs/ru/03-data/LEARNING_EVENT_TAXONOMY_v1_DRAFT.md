# Learning Event Taxonomy v1 — Draft

**Status: RESEARCH / DESIGN DRAFT.**

## Envelope

Every event should have a common envelope:

```json
{
  "id": "evt-...",
  "schemaVersion": 1,
  "eventType": "task.solved",
  "accountId": "account-...",
  "sessionId": "learning-session-...",
  "occurredAt": "ISO-8601",
  "courseId": "cpp",
  "unitId": "lesson-...",
  "skillId": null,
  "projectId": null,
  "payload": {}
}
```

Fields not relevant to an event remain null/omitted according to the final schema.

## Proposed event families

### Learning navigation
- `lesson.started`
- `lesson.completed`
- `section.opened`
- `practicum.started`
- `practicum.completed`

### Task/assessment
- `task.started`
- `task.submitted`
- `task.failed`
- `task.solved`
- `quiz.answered`

### Code/runtime
- `compile.started`
- `compile.failed`
- `compile.succeeded`
- `runtime.error`
- `test.failed`
- `test.passed`

### Project engineering
- `project.created`
- `project.changed`
- `checkpoint.created`
- `checkpoint.restored`
- `project.synced`
- `sync.conflict`

### AI
- `ai.hint.requested`
- `ai.explanation.requested`
- `ai.review.requested`
- `ai.response.shown`
- `ai.feedback.submitted`

## Event design rules

1. Event name describes what happened, not UI button text.
2. Payload is minimal and versioned.
3. Do not put raw secrets into payload.
4. Do not duplicate full source code into every event.
5. Source/code snapshots require separate, purpose-bound context records.
6. Events used for thesis research must have documented inclusion/exclusion criteria.
