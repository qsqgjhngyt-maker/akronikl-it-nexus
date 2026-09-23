# AKRONIKL IT NEXUS v0.1.7-alpha.2.2.1 — Cloud Sync LIVE PASS

Закрыт первый полный Cloud Sync цикл на реальных устройствах.

### Verified
- Nexus Account bootstrap / nexus-token auth — PASS
- Cloudflare Worker + D1 — PASS
- Desktop PUSH / PULL — PASS
- PC → iPhone — PASS
- iPhone → PC — PASS
- Audit trail — PASS
- Revision conflict / stale write rejection — PASS
- Conflict recovery through Cloud revision 6 — PASS

### Engineering evidence
В репозитории: `docs/evidence/releases/v0.1.7-alpha.2.2.1/`.
Оригинальные скриншоты и сборочные архивы приложены к GitHub Release assets.

### Security
`BOOTSTRAP_SECRET` и полный `nxk_...` token в репозиторий/Release не включены.
