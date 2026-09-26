# Code Error Taxonomy — Draft

Classes:
- syntax;
- type;
- name/scope;
- linker/build;
- memory/lifetime;
- logic;
- test assertion;
- runtime exception/trap;
- I/O mismatch;
- algorithmic complexity;
- API misuse.

Prefer normalized fields:
category, diagnostic code, normalized signature, path/line, language/runtime, resolved status.

Repeated-error analysis must not depend only on literal stderr text.
