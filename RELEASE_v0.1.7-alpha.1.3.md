# AKRONIKL IT NEXUS v0.1.7-alpha.1.3

**Project VFS Paths + Editor Resize + Session Resume Hotfix**

This hotfix is based on `v0.1.7-alpha.1.2` and addresses three live-test findings.

## Fixed
- Project Studio nested paths now mount correctly in the browser Clang virtual filesystem.
- `src/*.cpp` production sources are compiled for **Run** while `tests/*.cpp` are excluded from the normal application build.
- `include/` roots are passed to Clang.
- Code Studio grows and shrinks automatically with the source; clearing a large file restores the compact baseline height.
- Exact caret/editor scroll state is session-only instead of long-lived project/course state.

## Preserved
- Project files, progress, milestones and checkpoints remain persistent.
- Multi-file Code Studio, Runtime Router, Modern C++ ABI alignment and file-aware diagnostics remain compatible.
- C++ course content/stable IDs are unchanged.
