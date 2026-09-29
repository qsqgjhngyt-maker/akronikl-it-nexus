# PROJECT JOURNAL — v0.1.7-alpha.2.4.3.2

Date: 2026-09-29

The controlled Identity v2 UI lifecycle test reached FULL server-side success:
- disposable device/session created;
- bridge returned to false;
- Account Center authenticated with server session;
- current session revoked through product UI;
- live block fell back to legacy credential;
- D1 moved active 1→0 and revoked 1→2;
- security audit recorded `auth.session.revoked success`.

The test also exposed a narrow frontend defect: summary cards were rendered once and did not react to credential removal until F5.

Decision: fix state projection only; do not touch the proven Worker/session lifecycle.
