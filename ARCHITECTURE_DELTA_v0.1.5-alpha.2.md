# Architecture Delta — v0.1.5-alpha.2

## Modern C++ Compiler Integration

`v0.1.5-alpha.2` превращает `wasm-cpp` из архитектурной заготовки в реальный on-demand provider для C и Modern C++.

### Execution path

```text
Nexus Sandbox
  → Runtime Router
  → Nexus WASM C++ Runtime
  → dedicated Web Worker
  → pinned Clang/LLD WebAssembly toolchain
  → C/C++ source → WASI program.wasm
  → WASI Preview 1 runner
  → stdout / stderr / exit code
```

### Provider selection

- простой C++ по-прежнему остаётся на быстром `browser-jscpp`;
- `<string>`, STL, `virtual/override`, templates и smart pointers предпочитают `wasm-cpp`;
- C получает `wasm-cpp` как основной локальный provider;
- Secure Build остаётся будущим provider для тяжёлых multi-file/project workloads.

### Toolchain delivery

Compiler assets не входят в основной shell и загружаются лениво только при первом Modern C++ запуске. Версии CDN-зависимостей закреплены в `sandbox/runtime-assets.js`.

Исходный код ученика не отправляется в compiler API: компиляция выполняется локально в браузерном Worker после загрузки toolchain-assets.

### Isolation and limits

- компиляция и запуск изолированы от UI в dedicated Worker;
- отдельные watchdog limits для загрузки toolchain, компиляции и исполнения;
- превышение execution timeout завершает Worker;
- ограничен объём исходника и захватываемого stdout/stderr;
- toolchain/network failure классифицируется как provider/environment limitation;
- реальная ошибка Clang остаётся learner-code compiler diagnostic с line/column.

### Diagnostics contract

Результаты теперь различают:

1. Nexus static analysis;
2. task requirements;
3. Runtime Router/provider;
4. Clang compile diagnostics;
5. WASI execution result.

Compiler diagnostics не заменяются эвристиками Nexus: оригинальный вывод Clang доступен вторым уровнем.

### Offline model

Main PWA shell остаётся компактным. Service Worker выделяет отдельный runtime-cache для закреплённых CDN runtime-assets. Полная offline-доступность Modern C++ возможна только после успешной первоначальной загрузки соответствующих assets и зависит от browser cache/storage policy.

### Regression boundary

Lesson bodies, 40 stable C++ IDs, legacy indices `0…39`, legacy progress key и Lesson Standard 1.0 не изменяются.
