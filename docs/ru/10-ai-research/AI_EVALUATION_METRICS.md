# AI Evaluation Metrics

## Learning outcomes
- next-task success rate;
- error-correction success;
- time-to-solution;
- hints-before-solution;
- repeated-error rate;
- post-test gain;
- delayed-retention score, если дизайн это поддерживает.

## Answer rubric
- correctness;
- pedagogical appropriateness;
- personalization;
- code grounding;
- course grounding;
- clarity;
- unnecessary verbosity;
- unsupported claims.

## RAG
- precision@k / recall@k where gold evidence exists;
- context relevance;
- citation/support coverage;
- faithfulness;
- unsupported-claim rate.

## Learner Model
- next-response prediction;
- log loss;
- Brier score;
- calibration;
- AUC where appropriate.

## Recommendation
- prerequisite violation rate;
- completion;
- activity success;
- path efficiency;
- acceptance/skip rate.

## Operational
- latency p50/p95;
- context size;
- input/output tokens;
- provider failure/fallback;
- cost per useful intervention.

## Safety/privacy
- secret leakage;
- irrelevant-context inclusion;
- prompt-injection defense;
- redaction violations.
