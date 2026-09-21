# CHANGELOG v0.1.4-alpha.2.2

- Fixed live classification for valid C++ programs that require a standard header missing from the lightweight Browser Runtime, reproduced with `#include <string>`.
- Nexus now recognises a missing **known standard C++ header/library** as an environment/provider limitation when structural analysis is clean.
- The learner source line is not marked as erroneous for this provider limitation.
- Misspelled or non-standard headers such as `<strng>` are deliberately **not** reclassified and remain normal errors.
- Added `line:column` parsing for provider messages such as `2:1 cannot find library: string`.
- Added regression tests for both the provider-limit and typo-header paths.
- No benchmark content, stable IDs, legacy indices, or progress keys changed.
