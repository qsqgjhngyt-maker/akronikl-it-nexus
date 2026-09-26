# Target AI Research Data Dictionary Draft

## ai_sessions
Logical user interaction session with Nexus AI.

Candidate modes:
- tutor
- engineer
- navigator
- reviewer
- nexus-guide

Mode is product context, not a separate human identity.

## ai_context_snapshots
Versioned, purpose-bound context actually assembled for an AI request.

Why this entity matters:
- reproducibility;
- auditability;
- experimental comparison;
- privacy inspection.

Candidate fields:
- `purpose`
- `schema_version`
- minimized structured `context_json`
- `redaction_json`
- timestamp

Never include:
- raw account/session token;
- OAuth client secret;
- bootstrap secret;
- unrelated localStorage dump.

## ai_interactions
One model/tool interaction record.

Candidate metadata:
- request kind;
- model/provider reference;
- result status;
- latency/token/cost fields later if operationally needed.

Model prompt/response storage policy is **not** decided in WORK04 and must be defined with privacy/retention policy.

## ai_feedback
Explicit user feedback on a specific interaction.

Prefer structured reason codes plus optional short comment rather than relying only on free text.

## ai_evaluations
Evaluation record independent from production feedback.

Candidate evaluator types:
- deterministic metric
- rubric model
- human expert
- paired comparison

Evaluation dimensions:
- correctness
- personalization
- grounding
- pedagogical appropriateness

## Experimental reproducibility

Any thesis experiment should record:
- experiment version;
- dataset/sample definition;
- model/config reference;
- context schema version;
- rubric version;
- seed where applicable;
- anonymization method;
- result aggregation method.
