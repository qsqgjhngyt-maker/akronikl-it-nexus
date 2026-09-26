# Statistical Analysis Plan — Draft

Принцип: effect size + uncertainty, не только p-value.

Candidate analysis:
- binary success → logistic/mixed-effects;
- time-to-solution → robust/transformed/survival-style where justified;
- rubric → ordinal/continuous according to scale;
- repeated attempts → clustered/mixed analysis;
- mastery prediction → log loss/Brier/calibration.

Potential covariates:
baseline skill, task difficulty, crossover order, participant random effect, system condition.

Primary metric объявляется до final experiment.
