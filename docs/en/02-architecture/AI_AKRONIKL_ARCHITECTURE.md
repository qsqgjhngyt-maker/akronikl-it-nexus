> **Documentation language policy:** Russian is the normative source. This English version is a secondary mirror for international users. If wording diverges, the Russian version prevails.

# Akronikl Architecture

Browser/PWA sends a minimal contextual request to a secure API Gateway/Worker, which handles auth/rate limits, secret storage, provider routing and privacy-preserving logs. API keys must never appear in client code, localStorage or public GitHub. The AI gateway and code runner remain isolated. Offline heuristics, static hints and built-in explanations stay available without AI.
