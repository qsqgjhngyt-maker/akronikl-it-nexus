> **Documentation language policy:** Russian is the normative source. This English version is a synchronized secondary mirror. If wording diverges, the Russian version prevails.

# ADR-0007 — Multilingual-by-design

**Status:** accepted  
**Date:** 2026-09-17

Akronikl IT Nexus is multilingual by architecture. RU and EN are the first locales, not the only supported languages. UI language, course language and Akronikl text/voice language are independent. Entities use language-neutral stable IDs; progress and Skill Graph are shared across localizations. The locale system must allow new languages, ltr/rtl direction, locale formatting, voice metadata and explicit fallback without changing business logic.
