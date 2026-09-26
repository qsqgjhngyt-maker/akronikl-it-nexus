# Learner Model — Data Contract Draft

**Status: RESEARCH.**

The Learner Model is a derived model over observed evidence.

## Inputs
- task outcomes;
- attempt count;
- time-to-solution;
- normalized diagnostics;
- hint usage;
- prerequisite skill state;
- recency;
- project evidence;
- assessment results.

## Output per skill

```json
{
  "skillId": "cpp.pointers",
  "mastery": 0.46,
  "confidence": 0.71,
  "evidenceCount": 12,
  "modelVersion": "learner-model-exp-001",
  "updatedAt": "..."
}
```

## Important semantics

`mastery = 0.46` must never be described as objective truth.

It means: estimate produced by a named model version using a defined evidence set.

## Thesis requirement

At least one simple interpretable baseline should be compared with a more context-aware model.

Possible baseline families to investigate later:
- weighted rule model;
- exponentially-decayed evidence score;
- Bayesian Knowledge Tracing;
- Item Response / mastery-style models;
- learned model if dataset size becomes sufficient.

No algorithm is selected in WORK04.
