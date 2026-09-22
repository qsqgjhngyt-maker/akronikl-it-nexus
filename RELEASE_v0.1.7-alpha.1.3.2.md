# RELEASE v0.1.7-alpha.1.3.2

**Editor Gutter & Layout Sync Hotfix**

This release fixes the remaining Code Studio layout defect where the line-number gutter could keep the CSS grid row taller than the bounded editor stage, producing a large empty dark area and line numbers visually detached from code scrolling.

Acceptance: large source -> bounded viewport/internal scroll -> gutter moves with code; remove/clear source -> the whole editor shell shrinks together with no residual black area.
