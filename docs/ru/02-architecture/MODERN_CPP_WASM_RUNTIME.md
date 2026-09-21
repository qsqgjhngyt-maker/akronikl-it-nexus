# Modern C++ WASM Runtime

## Цель

Дать Nexus Sandbox возможность реально компилировать и выполнять современный C++ в браузере без внешней IDE и без отправки исходного кода на удалённый compiler API.

## Pipeline

```text
source → Runtime Router → wasm-cpp → Worker → Clang/LLD → WASI module → WASI runner → stdout/stderr/exit code
```

## Toolchain

Версии закрепляются централизованно в `sandbox/runtime-assets.js`. `v0.1.5-alpha.2` использует browser build Clang/LLD и WASI Preview 1 runner. Toolchain загружается только по требованию.

## Security / resilience

- Worker isolation;
- source-size limit;
- captured-output limit;
- independent load/compile/run watchdogs;
- Worker termination on timeout;
- no secret/API key in frontend;
- no remote source-code submission in this provider;
- raw compiler diagnostics remain visible.

## Routing

`browser-jscpp` остаётся быстрым первым выбором для простого C++. `wasm-cpp` получает повышенный score для STL и Modern C++ capabilities. Это сохраняет быстрый UX начальных уроков и полноценность сложных тем.

## Offline

Compiler-assets не входят в обязательный PWA core-cache. После первого успешного получения браузер/Service Worker может использовать runtime-cache, однако offline-гарантия зависит от доступного browser storage и политики очистки кэша.

## Ограничители ресурсов

`v0.1.5-alpha.2` ограничивает размер одного исходника (512 KiB), суммарный объём виртуальных входных файлов (2 MiB), размер скомпилированного `program.wasm` (32 MiB) и захватываемый вывод (1 MiB). Компиляция и выполнение дополнительно защищены раздельными watchdog timeout. Это не является строгим лимитом памяти WebAssembly-движка, но предотвращает наиболее очевидное раздувание входов/артефактов внутри браузерного Sandbox.
