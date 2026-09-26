# Target Learning Data Dictionary Draft

## courses / learning_units
The content identity layer.

Goal: stable machine identifiers independent from rendered text and locale.

`learning_units.kind` candidate values:
- lesson
- section
- practicum
- task
- quiz
- project
- checkpoint

## skills
Stable competency concept.

Examples:
- `cpp.variables`
- `cpp.references`
- `cpp.pointers`
- `algo.search`
- `engineering.git.conflict`

A skill should not be created solely because one lesson exists. It represents a reusable competency.

## skill_dependencies
Directed graph edge.

Candidate semantics:
- prerequisite
- reinforces
- related

`weight` is research/design metadata and must not be interpreted as mastery probability without a defined model.

## unit_skills
Maps content/task evidence to skills.

`evidence_weight` is model input metadata, not final mastery.

## user_course_progress
Product-facing aggregate.

It may be recomputed from unit progress; avoid making it the only source of truth.

## user_unit_progress
Materialized progress view for product UX.

Must remain explainable from user events/attempts where possible.

## learning_events
Append-style event stream for research/product state.

This must have:
- versioned event schemas;
- minimization;
- retention rules;
- consent/feature-purpose policy.

## user_skill_state
Derived learner model state.

Fields:
- `mastery` — current estimate;
- `confidence` — confidence/uncertainty indicator;
- `evidence_count`;
- `model_version`.

## task_attempts
Structured unit of student problem-solving behavior.

Useful for:
- baseline metrics;
- time-to-solution;
- hint-before-success analysis;
- repeated-error measurement.

## code_diagnostics
Normalized compiler/runtime/test diagnostics.

Store normalized signatures where possible instead of treating raw stderr text as the only analytical field.
