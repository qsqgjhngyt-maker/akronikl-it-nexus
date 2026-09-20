> **Documentation language policy:** Russian is the normative source. This English version is a synchronized secondary mirror. If wording diverges, the Russian version prevails.

# Functional Requirements

## FR-001 Course Library
Show disciplines, status, prerequisites, progress and resume state.

## FR-002 Lesson
Support quick explanation, deep explanation, standalone full theory, examples, practice, labs, self-check, Akronikl and related topics.

## FR-003 Sandbox
Editable code, supported runner, stdin, stdout/stderr and reset-to-source.

## FR-004 Akronikl
The mentor receives course/lesson/section/task/code/run-result/allowed-attempt context. It writes and, where voice is available, speaks in the selected supported language without losing context when switching language.

## FR-005 Progress
Progress is isolated per course and aggregated into Skill Graph; one topic has one progress object across localizations.

## FR-006 Practices
Structured brief, milestones, artifacts, diary, report, presentation, criteria and final portfolio project.

## FR-007 Internationalization
UI, course packages and Akronikl use a generic locale registry. RU/EN are first locales; adding a language must not require business-logic changes.

## FR-008 PWA
Offline shell after successful resource installation; unavailable AI/external runners provide clear fallback.

## FR-009 Portfolio
Users can assemble completed projects and competencies; full export is a later stage.

## FR-010 Free core learning
Core educational content and the basic course path remain available without a mandatory paid subscription. Cloud-cost limits must not block reading, practice or local course mechanisms.

## FR-011 Rights-aware content
Release and content systems support provenance/licensing metadata for third-party dependencies and materials.
