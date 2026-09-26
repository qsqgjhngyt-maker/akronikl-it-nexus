# AKRONIKL IT NEXUS — Architecture Baseline

**Documentation stage:** `v0.1.7-alpha.2.3` WORK03  
**Runtime baseline:** `v0.1.7-alpha.2.2.1`  
**Status:** WORK03 COMPLETE  
**Normative source:** Russian version.

This baseline separates actual runtime architecture from planned/research architecture.

Current implemented layers:
1. Learning Platform.
2. Engineering Workspace.
3. Cloud Engineering Layer.

The fourth layer, Intelligent Learning, is currently only a foundation/research direction.

Core invariants:
- browser UI is not the server authorization source;
- current Cloud Sync persistence is D1-only;
- local and cloud revisions are independent;
- stale writes are rejected through `baseRevision`;
- current AI foundation must not be described as a production LLM system;
- current long-lived token-in-localStorage is alpha technical debt, not the target identity architecture.
