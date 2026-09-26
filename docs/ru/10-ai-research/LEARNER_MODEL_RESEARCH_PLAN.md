# Learner Model Research Plan

## Goal
Оценивать состояние компетенций пользователя и передавать uncertainty-aware context в Tutor/Planner.

## Candidate baselines
- LM-B0: интерпретируемая weighted evidence heuristic.
- LM-B1: recency-decayed evidence.
- LM-B2: Bayesian/knowledge-tracing family.
- LM-B3: learned sequential model — только если данных достаточно.

## Compare
- predictive performance;
- calibration;
- interpretability;
- cold-start behavior;
- data requirement;
- complexity.

## Output
```json
{
  "skillId": "cpp.pointers",
  "mastery": 0.46,
  "confidence": 0.71,
  "evidenceCount": 12,
  "modelVersion": "lm-exp-...",
  "updatedAt": "..."
}
```

`mastery` — оценка модели, а не объективный факт о человеке.
