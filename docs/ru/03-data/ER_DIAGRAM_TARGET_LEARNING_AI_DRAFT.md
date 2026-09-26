# ER Diagram — Target Learning / Skill / AI Data Draft

**Status: RESEARCH / PLANNED.**  
Entity boundaries are intentionally designed before implementation.

```mermaid
erDiagram
    COURSES {
      TEXT id PK
      TEXT version
      TEXT status
    }

    LEARNING_UNITS {
      TEXT id PK
      TEXT course_id FK
      TEXT kind
      TEXT parent_id
      TEXT title_key
      INTEGER order_index
      TEXT content_version
    }

    SKILLS {
      TEXT id PK
      TEXT code UK
      TEXT name
      TEXT domain
      TEXT status
    }

    SKILL_DEPENDENCIES {
      TEXT prerequisite_skill_id PK,FK
      TEXT target_skill_id PK,FK
      REAL weight
      TEXT relation_type
    }

    UNIT_SKILLS {
      TEXT unit_id PK,FK
      TEXT skill_id PK,FK
      REAL evidence_weight
    }

    USER_COURSE_PROGRESS {
      TEXT account_id PK
      TEXT course_id PK,FK
      TEXT status
      REAL completion
      TEXT updated_at
    }

    USER_UNIT_PROGRESS {
      TEXT account_id PK
      TEXT unit_id PK,FK
      TEXT status
      REAL score
      TEXT first_started_at
      TEXT completed_at
      TEXT updated_at
    }

    LEARNING_EVENTS {
      TEXT id PK
      TEXT account_id
      TEXT session_id
      TEXT course_id
      TEXT unit_id
      TEXT skill_id
      TEXT project_id
      TEXT event_type
      TEXT payload_json
      TEXT occurred_at
      TEXT ingested_at
    }

    USER_SKILL_STATE {
      TEXT account_id PK
      TEXT skill_id PK,FK
      REAL mastery
      REAL confidence
      INTEGER evidence_count
      TEXT model_version
      TEXT updated_at
    }

    TASK_ATTEMPTS {
      TEXT id PK
      TEXT account_id
      TEXT unit_id
      TEXT project_id
      INTEGER attempt_no
      TEXT outcome
      REAL score
      TEXT started_at
      TEXT completed_at
    }

    CODE_DIAGNOSTICS {
      TEXT id PK
      TEXT attempt_id FK
      TEXT kind
      TEXT code
      TEXT severity
      TEXT file_path
      INTEGER line
      TEXT normalized_signature
      TEXT created_at
    }

    AI_SESSIONS {
      TEXT id PK
      TEXT account_id
      TEXT mode
      TEXT started_at
      TEXT ended_at
    }

    AI_INTERACTIONS {
      TEXT id PK
      TEXT ai_session_id FK
      TEXT context_snapshot_id FK
      TEXT request_kind
      TEXT model_ref
      TEXT outcome
      TEXT created_at
    }

    AI_CONTEXT_SNAPSHOTS {
      TEXT id PK
      TEXT account_id
      TEXT purpose
      TEXT schema_version
      TEXT context_json
      TEXT redaction_json
      TEXT created_at
    }

    AI_FEEDBACK {
      TEXT id PK
      TEXT interaction_id FK
      TEXT account_id
      INTEGER helpful
      TEXT reason_code
      TEXT created_at
    }

    AI_EVALUATIONS {
      TEXT id PK
      TEXT interaction_id FK
      TEXT evaluator_type
      TEXT rubric_version
      REAL correctness
      REAL personalization
      REAL grounding
      REAL pedagogy
      TEXT result_json
      TEXT created_at
    }

    COURSES ||--o{ LEARNING_UNITS : contains
    LEARNING_UNITS ||--o{ UNIT_SKILLS : teaches
    SKILLS ||--o{ UNIT_SKILLS : mapped
    SKILLS ||--o{ SKILL_DEPENDENCIES : target
    SKILLS ||--o{ SKILL_DEPENDENCIES : prerequisite
    LEARNING_UNITS ||--o{ USER_UNIT_PROGRESS : progresses
    COURSES ||--o{ USER_COURSE_PROGRESS : progresses
    SKILLS ||--o{ USER_SKILL_STATE : estimated
    LEARNING_UNITS ||--o{ TASK_ATTEMPTS : attempts
    TASK_ATTEMPTS ||--o{ CODE_DIAGNOSTICS : produces
    AI_SESSIONS ||--o{ AI_INTERACTIONS : contains
    AI_CONTEXT_SNAPSHOTS ||--o{ AI_INTERACTIONS : grounds
    AI_INTERACTIONS ||--o{ AI_FEEDBACK : receives
    AI_INTERACTIONS ||--o{ AI_EVALUATIONS : evaluated
```

## Critical research rule

`USER_SKILL_STATE.mastery` is a derived estimate, not a ground-truth fact.

Its algorithm/version must be stored in `model_version` and evaluated experimentally.
