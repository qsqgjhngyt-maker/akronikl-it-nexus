# Interpretable Learner Model Baseline

Кандидатная схема:

```text
evidence_i = outcome_i × source_weight_i × recency_i
mastery_raw = weighted_mean(evidence_i)
confidence = f(independent_evidence_count, recency, variance)
```

Коэффициенты не фиксируются в WORK06.

Evidence classes:
- assessment;
- practice;
- project application;
- compiler/test recovery;
- delayed re-test.

Повторные попытки одного и того же задания не должны считаться полностью независимым evidence.

Цель baseline:
- интерпретируемость;
- воспроизводимость;
- low-data behavior;
- точка сравнения для более сложных моделей.
