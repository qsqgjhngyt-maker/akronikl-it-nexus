# RAG Research Plan

Sources:
- normative course lessons;
- approved practicums/tasks;
- official Nexus docs;
- curated examples;
- optionally separately labeled authoritative external corpus.

```mermaid
flowchart LR
    SRC["Versioned Sources"] --> CHUNK["Chunking"]
    CHUNK --> IDX["Lexical/Vector Index"]
    Q["Query + Context"] --> RET["Retriever"]
    IDX --> RET
    RET --> RR["Optional Re-ranker"]
    RR --> PACK["Evidence Pack"]
    PACK --> LLM["LLM"]
    LLM --> OUT["Answer + provenance"]
```

Experiments:
- lexical vs vector vs hybrid;
- chunk size/overlap;
- top-k;
- reranking;
- query expansion;
- course-only vs mixed corpus.

Metrics:
retrieval precision/recall, faithfulness, unsupported claims, task success, latency, context size.
