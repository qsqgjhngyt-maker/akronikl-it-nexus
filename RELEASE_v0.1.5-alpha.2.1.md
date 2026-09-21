# AKRONIKL IT NEXUS v0.1.5-alpha.2.1

## OOP Example Escape Hotfix

This hotfix corrects a content-encoding defect discovered by live Modern C++ compilation.

The `cpp.oop-principles` starter and solution had literal backslashes before the C++ string quotes after JSON decoding, producing `\"\\n\"` in the editor. Clang correctly rejected that learner-visible source with `expected expression`.

The bundled RU and EN examples now contain valid C++: `"\\n"`.

The compiler/runtime implementation is not changed. This release adds regression coverage so JSON escaping cannot silently leak into the executable OOP starter/solution again.

If an older malformed draft is already stored in browser localStorage, press **Reset example / Вернуть пример** once after updating to load the corrected bundled starter.
