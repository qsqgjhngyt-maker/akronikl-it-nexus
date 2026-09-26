# AI Research Test Strategy

Deterministic:
- context selectors;
- secret redaction;
- graph validation;
- event/eval schema;
- RAG provenance.

Offline:
- curated tasks;
- fixed context snapshots;
- retrieval/code benchmarks;
- multi-model comparison.

Security:
- prompt injection;
- data exfiltration;
- RAG poisoning;
- cross-account context;
- unsafe tool request.

Human:
- blinded rubric;
- evaluator instructions;
- inter-rater agreement when multiple judges are used.

Model/prompt/index updates require regression against accepted benchmark cases.
