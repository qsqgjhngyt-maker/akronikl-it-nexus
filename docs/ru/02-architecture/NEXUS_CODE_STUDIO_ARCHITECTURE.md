# Nexus Code Studio Architecture

**Статус:** Foundation / v0.1.6-alpha.1  
**Runtime baseline:** v0.1.5-alpha.2.2 LIVE PASS

## Назначение

Nexus Code Studio — IDE-слой над единым Nexus Sandbox. Он не заменяет Runtime Router и providers, а предоставляет единый профессиональный интерфейс редактирования, диагностики и будущей multi-file работы для всех языков блока «Программирование».

## Инварианты

1. Код ученика остаётся source of truth и не переписывается компилятором или UI незаметно.
2. Runtime Router остаётся language-neutral.
3. Modern C++ по-прежнему выполняется через проверенный Clang/WASI Worker provider.
4. Ошибки компилятора, статический анализ и ограничения provider не смешиваются.
5. Code Studio не должен ухудшать mobile input и PWA/offline-поведение.

## Слои

```text
Nexus Code Studio
  ├─ Editor UI
  │   ├─ syntax highlighting
  │   ├─ line numbers
  │   ├─ bracket matching
  │   ├─ auto-indent / Tab
  │   ├─ find
  │   └─ undo / redo
  ├─ Problems
  │   ├─ static diagnostics
  │   ├─ compiler diagnostics
  │   └─ provider limits
  ├─ Code Workspace
  │   ├─ languageId
  │   ├─ entry file
  │   ├─ active file
  │   └─ virtual files
  └─ Nexus Sandbox
      └─ Runtime Router → providers
```

## Редактор v0.1.6-alpha.1

Foundation использует нативный `textarea` как реальное поле ввода и локальный подсвеченный mirror-layer. Это сохраняет нормальный ввод, selection, touch/IME и существующее хранение прогресса, но добавляет синтаксическую подсветку без внешней CDN-зависимости.

Первая реализация подсветки ориентирована на C++ reference-course. Контракт Code Studio остаётся language-neutral; highlighter/provider для новых языков добавляется отдельно.

## Диагностика

`line:column` от Clang отображается в двух местах:

- в обычном подробном выводе Nexus Sandbox;
- в панели **Problems**.

Строка диагностики кликабельна и переводит caret непосредственно в указанную позицию исходника.

## Workspace foundation

`sandbox/code-workspace.js` вводит виртуальную файловую модель уже в alpha.1, хотя UI пока показывает один `main.cpp`.

Модель поддерживает:

- stable path;
- active file;
- content updates;
- add/remove/rename для будущего multi-file UI;
- language metadata;
- snapshot/serialization;
- подписку на изменения.

Это позволяет добавить `.cpp/.h`, tests и Project Studio без замены редактора или Runtime Router.

## Следующие этапы

- multi-file tabs/tree;
- compile request с массивом файлов;
- `.h/.cpp` build graph;
- tests panel;
- snapshots/version history;
- Akronikl diagnostics context;
- Project Studio integration.
