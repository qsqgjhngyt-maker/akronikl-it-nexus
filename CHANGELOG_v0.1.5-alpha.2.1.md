# CHANGELOG v0.1.5-alpha.2.1

- Fixed the bundled `cpp.oop-principles` starter in RU and EN: the newline literal is now valid C++ (`"\\n"`) instead of a JSON-escaped learner-visible token (`\\"\\n\\"`).
- Fixed the matching OOP solution example in RU and EN.
- Added a regression test that prevents accidental JSON escaping from leaking into executable OOP sample source again.
- Modern C++ Compiler / Runtime Router behavior is unchanged.
- Stable IDs, legacy indices, progress migration, theory, benchmark structure, and Lesson Standard 1.0 remain unchanged.
