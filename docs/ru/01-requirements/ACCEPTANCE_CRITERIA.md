# Acceptance Criteria — v0.1.7-alpha.2.3

Acceptance criteria ниже фиксируют первую проверяемую выборку критических сценариев. WORK03/WORK04 расширят критерии на API/data-level contracts.

| ID | Requirement | Given / When / Then |
| --- | --- | --- |
| AC-SYNC-001 | FR-SYNC-002 | Given cloud account connected; When user PUSHes a valid project; Then server returns new revision and client stores it as serverRevision. |
| AC-SYNC-002 | FR-SYNC-003 | Given project exists in cloud; When same account PULLs on another device; Then project snapshot and cloud revision are restored. |
| AC-SYNC-003 | FR-SYNC-004 | Given client baseRevision is older than server revision; When client PUSHes; Then server rejects with conflict and client marks sync.status=conflict. |
| AC-SYNC-004 | FR-SYNC-005 | Given conflict exists; When user PULLs latest and then intentionally reapplies edits and PUSHes; Then a new revision is created without silent overwrite. |
| AC-ID-001 | FR-ID-002 | Given a valid authenticated session; When user opens Nexus on a new device; Then account profile is identified without copying a raw long-lived token manually. |
| AC-ID-002 | FR-ID-003 | Given user explicitly links two providers; When either provider is used later; Then both resolve to the same Nexus account subject. |
| AC-ID-003 | FR-ID-005 | Given multiple active sessions; When user revokes one device; Then that session can no longer access protected APIs while other sessions remain valid. |
| AC-AI-001 | FR-AI-001 | Given a lesson task and runtime result; When AI help is requested; Then context contains only approved course/task/code/runtime fields required by policy. |
| AC-AI-002 | FR-AI-004 | Given an approved course corpus; When answer requires course facts; Then retrieved evidence is versioned and evaluable for grounding. |
| AC-AI-003 | FR-AI-008 | Given fixed evaluation dataset; When Generic LLM and Nexus AI are evaluated; Then both use documented configurations and identical task set, with metrics persisted. |
| AC-SEC-001 | SEC-SESSION-001 | Given production Identity v2; When session is established; Then reusable session secret is not stored in localStorage. |
| AC-SEC-002 | SEC-AI-001 | Given AI request; When Context Gateway builds prompt context; Then data outside the approved permission scope is excluded. |
