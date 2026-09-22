# Nexus Code Studio Architecture

**Статус:** Multi-file / v0.1.6-alpha.2.1  
**Runtime baseline:** v0.1.5-alpha.2.2 LIVE PASS  
**Single-file Code Studio baseline:** v0.1.6-alpha.1 LIVE PASS

## Назначение

Nexus Code Studio — IDE-слой над единым Nexus Sandbox. Runtime Router остаётся language-neutral, а workspace теперь является реальной многофайловой моделью, а не только foundation API.

## Инварианты

1. Код ученика остаётся source of truth и не переписывается незаметно.
2. Один и тот же Code Studio работает и для одного файла, и для проекта.
3. Browser Runtime остаётся быстрым one-file provider; multi-file направляется в WASM/расширенный provider.
4. Headers, translation units и diagnostics не смешиваются: `.h/.hpp` — вход VFS, `.cpp/.cc/.cxx` — единицы компиляции.
5. Диагностика хранит `file:line:column` и открывает правильный файл.
6. Workspace snapshot сохраняется в том же lesson state без смены legacy progress key.

## Слои

```text
Nexus Code Studio
  ├─ File Tree / Tabs
  │   ├─ add
  │   ├─ rename
  │   └─ delete
  ├─ Editor
  │   ├─ syntax highlighting
  │   ├─ line numbers
  │   ├─ bracket matching
  │   ├─ auto-indent
  │   ├─ find
  │   └─ per-file undo / redo
  ├─ Problems
  │   └─ file : line : column → jump
  ├─ Code Workspace
  │   ├─ entryFile
  │   ├─ activeFile
  │   └─ virtual files
  └─ Nexus Sandbox
      └─ Runtime Router
          └─ Nexus WASM C++ Runtime
              └─ Clang: main.cpp + *.cpp → program.wasm
```

## Multi-file build

Runtime request содержит `source`, `entryFile` и `files`. Browser Runtime объявляет multi-file unsupported, после чего Router выбирает WASM provider. Worker помещает все файлы в виртуальную файловую систему Clang, выбирает C/C++ translation units по расширению и передаёт их одной compile/link-команде. Header-файлы доступны через обычные `#include "..."`.

## Диагностика

Clang diagnostic вида `Printer.cpp:4:12: error: ...` превращается в Problem с именем файла. Клик переключает active file на `Printer.cpp`, выставляет caret на строку 4, столбец 12 и сохраняет workspace active state.

## Граница alpha.2

Пока отсутствуют CMake/custom flags, package manager, полноценное дерево папок, отдельный test runner и snapshot history. Это следующие слои Project Studio.
## Resume state

- Удаление активного файла сначала фиксирует его собственный buffer, затем удаляет файл и загружает fallback-файл без повторной синхронизации старого текста.
- Workspace snapshot хранит `viewState` по файлам: selection/caret и scrollTop/scrollLeft.
- Позиция длинной страницы хранится отдельно в sessionStorage по hash-route и восстанавливается после render/reload.

