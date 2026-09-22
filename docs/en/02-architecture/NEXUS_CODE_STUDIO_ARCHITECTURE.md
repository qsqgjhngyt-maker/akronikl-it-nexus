# Nexus Code Studio Architecture

**Status:** Foundation / v0.1.6-alpha.1  
**Runtime baseline:** v0.1.5-alpha.2.2 LIVE PASS

## Purpose

Nexus Code Studio is the IDE layer above the unified Nexus Sandbox. It does not replace the Runtime Router or providers; it provides one professional editing, diagnostics and future multi-file experience for every language in the Programming domain.

## Invariants

1. Learner source remains the source of truth and is never silently rewritten by the compiler or UI.
2. Runtime Router remains language-neutral.
3. Modern C++ keeps using the proven Clang/WASI Worker provider.
4. Compiler errors, structural analysis and provider limits remain separate concepts.
5. Code Studio must preserve mobile input and PWA/offline behavior.

## Layers

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

## Editor in v0.1.6-alpha.1

The foundation keeps a native `textarea` as the real input surface and places a local highlighted mirror layer behind it. This preserves input, selection, touch/IME and existing progress persistence while adding syntax highlighting with no external CDN dependency.

The first highlighter targets the C++ reference course. The Code Studio contract remains language-neutral and additional language highlighters can be added independently.

## Diagnostics

Clang `line:column` diagnostics are available both in the normal detailed Sandbox output and the **Problems** panel. A diagnostic can be clicked to move the caret directly to the reported source position.

## Workspace foundation

`sandbox/code-workspace.js` introduces a virtual file model in alpha.1 even though the UI still exposes one `main.cpp`.

The model supports stable paths, active file, content updates, future add/remove/rename operations, language metadata, snapshot/serialization and change subscriptions. This allows `.cpp/.h`, tests and Project Studio to be added without replacing the editor or Runtime Router.

## Next stages

- multi-file tabs/tree;
- compile requests carrying multiple files;
- `.h/.cpp` build graph;
- tests panel;
- snapshots/version history;
- Akronikl diagnostics context;
- Project Studio integration.
