# Third-party runtime components

## v0.1.5-alpha.2

Modern C++ Runtime загружает закреплённые внешние runtime-компоненты по CDN:

- `@yowasp/clang@22.0.0-git20542-10` — browser Clang/LLVM/LLD toolchain;
- `@runno/wasi@0.10.0` — WASI Preview 1 runner.

Эти компоненты не переводятся под будущую лицензию Nexus автоматически и сохраняют собственные upstream-лицензии. Перед публичным license activation Nexus требуется отдельная фиксация notices и provenance для используемых бинарных/runtime артефактов.

В `v0.1.5-alpha.2` зависимости загружаются как внешние закреплённые assets; исходный код учащегося компилируется локально в браузере и не отправляется в удалённый compiler API.
