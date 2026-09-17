> **Documentation language policy:** Russian is the normative source. This English version is a secondary mirror for international users. If wording diverges, the Russian version prevails.

# Secret Management

Secrets must not be stored in Git, course ZIPs, PWA caches, localStorage, IndexedDB or source maps. Use managed server/Worker secrets or local non-committed `.env` files. Every secret has an owner, purpose, environment, rotation policy and revocation procedure. Suspected leaks require rotation, not another commit hiding the value.
