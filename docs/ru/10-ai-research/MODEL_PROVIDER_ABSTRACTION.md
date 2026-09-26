# Model Provider Abstraction

Target concept:

```text
ModelProvider
- id
- capabilities
- generate()
- stream()
- toolSupport
- contextLimit
- structuredOutputSupport
```

Every experiment stores:
- provider;
- model id;
- observed version/date;
- generation params;
- context limit/capabilities relevant to study.

Hosted model mutability must be documented as a reproducibility limitation.
