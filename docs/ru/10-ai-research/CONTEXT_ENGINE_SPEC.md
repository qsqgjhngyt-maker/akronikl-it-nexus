# Nexus AI Context Engine

Goal: собрать минимально достаточный контекст под конкретную AI-purpose.

Inputs:
- user query;
- AI mode;
- current learning unit;
- learner-model slice;
- skill-graph neighborhood;
- retrieved evidence;
- selected code/project context;
- allowed preferences.

Excluded by default:
- session/auth tokens;
- phone/email;
- recovery/MFA data;
- unrelated projects;
- entire localStorage;
- hidden admin data.

```mermaid
flowchart LR
    PURPOSE["Purpose"] --> SELECT["Selectors"]
    POLICY["Privacy Policy"] --> SELECT
    LM["Learner slice"] --> SELECT
    KG["Graph slice"] --> SELECT
    RAG["Evidence"] --> SELECT
    CODE["Code context"] --> SELECT
    SELECT --> REDACT["Redact"]
    REDACT --> BUDGET["Budget/Rank"]
    BUDGET --> SNAP["Versioned Context Snapshot"]
    SNAP --> GW["AI Gateway"]
```

Snapshot stores schema/version/provenance/redaction/context size.
