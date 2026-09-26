# Minimum AI Telemetry Schema

Operational telemetry candidate:
- interaction id;
- pseudonymous account ref;
- purpose/mode;
- model ref;
- context schema version;
- latency;
- result/failure;
- safety/redaction counters;
- explicit helpful/not-helpful feedback.

Не логировать full prompt/response по умолчанию только ради аналитики.

Research retention, если понадобится, оформляется отдельно.
