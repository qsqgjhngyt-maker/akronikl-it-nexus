# WASI SDK33 — дополнение C++ exceptions

Data-only subset официального `wasi-sysroot-33.0+m.tar.gz`:
https://github.com/WebAssembly/wasi-sdk/releases/tag/wasi-sdk-33

SHA256 исходного архива `063bc1b56582b9923e08ac9b89e58789618d851763f01530b3ff20b9e5df0ca3`.
LLVM source `4434dabb69916856b824f68a64b029c67175e532`, wasi-libc source `161b3195fc2558d2b1ba3eb9ffae3b2b47407623`, плюс опубликованные patches сборки WASI SDK33. Сами headers/static libraries не изменены. Выбраны только wasm32-wasip1 C headers/static libraries и exception-enabled libc++/libc++abi/libunwind. Threads, shared libraries, LTO, Preview2 и остальные targets не входят в пакет.

1678 C++ headers побайтно равны закреплённому YoWASP Clang22 resources и повторно используются из `/usr/include/c++/v1`; заменяется только SDK `__config_site`. Producer проверяет это равенство и SHA256 обоих исходных архивов. Полный индекс и provenance: `cpp-exceptions.json`. Воспроизводство: `tools/pack-wasi-cpp-exceptions.py --sdk <официальный архив> --base-resources <pinned llvm-resources.tar> --out runtime-packs/wasi-sdk33/cpp-exceptions.bin`.

`.bin` — собственный контейнер: uint32 LE длина UTF-8 JSON header, header `nexus-wasi-eh-pack-v1`, затем неизменённые байты файлов по offset/bytes. Контейнер упакован детерминированным gzip. Это библиотечные данные, не новый JS compiler. Код учащегося не уходит с устройства.

Лицензии upstream находятся в `licenses/`: Apache-2.0 WITH LLVM-exception и включённые notices wasi-libc. Copyright notices сохранены в headers. Файл outside frontend build: приобретается отдельно как immutable runtime resource, не в Home/public precache.

Минимальный feature probe native EH взят из GoogleChromeLabs/wasm-feature-detect (Copyright2023 Google Inc., Apache-2.0); его лицензия также приложена. Проверяется final EH с exnref/try_table, а не одно наличие legacy `WebAssembly.Exception`.
