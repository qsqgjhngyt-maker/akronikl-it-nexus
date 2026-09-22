# CHANGELOG v0.1.7-alpha.1.3.2

## Fixed
- The line-number gutter can no longer determine the outer Code Studio row height.
- The gutter receives the exact dynamic editor viewport height and scrolls in lockstep with the textarea/highlight layer.
- Large trailing blank tails no longer create a large empty black area below meaningful code.
- Shrinking/clearing a file keeps editor, highlight and gutter bounded to one shared viewport.

## Preserved
- Project VFS nested paths and Clang/WASM project builds.
- Multi-file Code Studio, Problems diagnostics, checkpoints, session-only positional resume.
- C++ course content and stable IDs.
