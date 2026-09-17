> **Documentation language policy:** Russian is the normative source. This English version is a secondary mirror for international users. If wording diverges, the Russian version prevails.

# Release Process

Freeze the previous baseline, work locally, make a focused change, run regression gates, build a preview, smoke-test, create a patch against the exact published base, verify patch application on a clean copy, generate changelog/manifest/SHA/restore point, publish only then, and verify the deployed Pages/PWA version afterwards.
