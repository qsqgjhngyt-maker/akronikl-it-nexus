# AI Safety Threat Model

| ID | Threat | Control |
|---|---|---|
| AI-T-001 | prompt injection | retrieved/project text treated as data |
| AI-T-002 | secret exfiltration | context allowlist/redaction |
| AI-T-003 | RAG poisoning | approved/versioned sources |
| AI-T-004 | hallucination | grounding + abstention |
| AI-T-005 | over-helping | tutoring mode policy |
| AI-T-006 | unsafe tool action | explicit authorization boundary |
| AI-T-007 | cross-user leakage | server ownership checks |
| AI-T-008 | misleading mastery | confidence/model version semantics |
| AI-T-009 | evaluation contamination | dataset split governance |
| AI-T-010 | PII leakage | minimization |
| AI-T-011 | private code leakage | bounded context/provider policy |
| AI-T-012 | bad recommendation loop | metrics + user override |
