# Locale containers

`ru` and `en` are the first active locales. `_template` is the empty language container used when a new locale is requested.

Core rules:
- no core module may hardcode that only RU/EN exist;
- UI language, course language, and Akronikl language are stored independently;
- content entities keep language-neutral IDs;
- missing translations use an explicit fallback and must never silently change progress identity.
