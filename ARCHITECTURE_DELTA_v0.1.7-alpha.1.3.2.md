# Architecture Delta v0.1.7-alpha.1.3.2

- The Code Studio editor shell, code stage and line-number gutter now share one runtime-computed height.
- The gutter remains an independent scroll surface only for programmatic scrollTop synchronization; it no longer participates in expanding the parent grid row beyond the editor viewport.
- No runtime provider, Project Studio schema, content, or project persistence changes.
