> **Documentation language policy:** Russian is the normative source. This English version is a secondary mirror for international users. If wording diverges, the Russian version prevails.

# Target Platform Architecture

Separate `core`, `ui`, `akronikl`, `runners`, `skill-graph`, `courses`, `practices`, `assets`, `docs`, and `tests`. A course package must not depend on the entire platform DOM; it exposes a contract containing manifest, curriculum, lessons, labs, projects, skills and localized strings. The current v7 monolith remains a reference baseline and is decomposed incrementally with regression tests.
