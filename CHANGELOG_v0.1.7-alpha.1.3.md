# CHANGELOG v0.1.7-alpha.1.3

- fix(Project Studio): recursively mount nested project files into YoWASP VFS.
- fix(Project Studio): exclude `tests/` translation units from normal Run builds.
- fix(Project Studio): forward configured include roots to Clang.
- fix(Code Studio): bidirectional editor auto-resize with capped growth/internal scrolling.
- fix(Resume): keep page/editor positional state in the current browser session only.
- test: add nested VFS, editor resize and session-only resume regression gates.
