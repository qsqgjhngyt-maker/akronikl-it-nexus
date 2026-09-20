> **Documentation language policy:** Russian is the normative source. This English version is a synchronized secondary mirror. If wording diverges, the Russian version prevails.

# Internationalization-by-design

Russian development documentation is normative and English is a mandatory synchronized mirror. In the product, RU and EN must have functional/content parity, while additional languages use the same generic localization mechanism.

No module may hard-code the assumption that only `ru` and `en` exist. Use a locale registry, `_template` contract and language-neutral stable IDs.

UI language, course language and Akronikl text/voice language are independent. Akronikl must be able to continue the same context in another language on request. Locale metadata supports ASR/TTS, technical-term pronunciation, ltr/rtl, local formatting and explicit fallback. Switching languages never creates duplicate progress or Skill Graph nodes.

Each locale has a content status: `not-started`, `partial`, `review`, `complete`; declared complete languages must pass parity checks before a stable release.
