# AKRONIKL IT NEXUS v0.1.7-alpha.1.3.1

**Editor Viewport Recovery Hotfix**

This hotfix is based on `v0.1.7-alpha.1.3` and addresses the remaining live-test UX issue in Code Studio / Project Studio editor sizing.

## Fixed
- Trailing blank lines no longer make the outer editor stage grow indefinitely.
- Clearing a large source returns the editor to its compact baseline height automatically.
- Desktop growth is capped around 540 px (mobile uses a smaller cap); larger sources use internal scrolling.
- Shrinking/clearing clamps or resets editor scroll and re-synchronizes highlight/gutter layers.

## Preserved
- Project Studio nested VFS mapping and `src/include/tests` build behavior.
- Session-only page/caret/editor resume.
- Multi-file Code Studio, Runtime Router, Clang/WASI, project checkpoints and course progress.
