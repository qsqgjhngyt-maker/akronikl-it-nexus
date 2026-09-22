# Architecture Delta — v0.1.7-alpha.1.3.1

## Editor Viewport Recovery
- Outer Code Studio height is derived from the last meaningful (non-whitespace-tail) source line, not raw newline count.
- The source value is never trimmed or rewritten; trailing blank lines remain part of the user's file.
- Empty files collapse to the baseline viewport and reset horizontal/vertical editor scroll.
- Large files stop growing at a bounded viewport and continue with native inner scrolling.
- Highlight and gutter layers follow the textarea scroll after every recovery/shrink.

## Compatibility
- Project VFS path mapping, Project Studio manifest/schema, Runtime Router and session-only resume are unchanged.
