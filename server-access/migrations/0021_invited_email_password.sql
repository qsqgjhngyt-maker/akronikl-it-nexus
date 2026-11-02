-- 0021: isolated, additive foundation for invite-only email/password authentication.
-- Apply only after 0005, 0009, 0012 and 0020; never modifies existing credentials.
-- All public endpoints remain disabled unless separately enabled and reviewed.
CREATE TABLE nexus_password_invite_emails (
  token_hash TEXT PRIMARY KEY REFERENCES nexus_admin_invites(token_hash) ON DELETE RESTRICT,
  account_id TEXT NOT NULL UNIQUE REFERENCES account_subjects(id) ON DELETE RESTRICT,
  email_hash TEXT NOT NULL UNIQUE CHECK(length(email_hash)=64 AND email_hash NOT GLOB '*[^0-9a-f]*'),
  created_at TEXT NOT NULL
);
CREATE TABLE nexus_password_credentials (
  account_id TEXT PRIMARY KEY REFERENCES account_subjects(id) ON DELETE RESTRICT,
  login_method_id TEXT NOT NULL UNIQUE REFERENCES login_methods(id) ON DELETE RESTRICT,
  email_hash TEXT NOT NULL UNIQUE CHECK(length(email_hash)=64 AND email_hash NOT GLOB '*[^0-9a-f]*'),
  salt_b64 TEXT NOT NULL CHECK(length(salt_b64)=22),
  hash_b64 TEXT NOT NULL CHECK(length(hash_b64)=43),
  algorithm TEXT NOT NULL DEFAULT 'scrypt-N32768-r8-p3' CHECK(algorithm='scrypt-N32768-r8-p3'),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE nexus_password_service_nonces (
  nonce TEXT PRIMARY KEY CHECK(length(nonce)=32),
  expires_at TEXT NOT NULL
);
CREATE TABLE nexus_password_rate_limits (
  scope_hash TEXT NOT NULL CHECK(length(scope_hash)=64),
  bucket INTEGER NOT NULL,
  used INTEGER NOT NULL CHECK(used BETWEEN 1 AND 200),
  PRIMARY KEY(scope_hash,bucket)
);
CREATE TABLE nexus_password_challenges (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES account_subjects(id) ON DELETE RESTRICT,
  email_hash TEXT NOT NULL CHECK(length(email_hash)=64),
  network_hash TEXT NOT NULL CHECK(length(network_hash)=64),
  salt_b64 TEXT NOT NULL CHECK(length(salt_b64)=22),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  CHECK(consumed_at IS NULL OR consumed_at>=created_at)
);
CREATE INDEX nexus_password_challenges_expiry ON nexus_password_challenges(expires_at);
CREATE TABLE nexus_password_receipts (
  challenge_id TEXT PRIMARY KEY REFERENCES nexus_password_challenges(id) ON DELETE RESTRICT,
  account_id TEXT NOT NULL REFERENCES account_subjects(id) ON DELETE RESTRICT,
  login_method_id TEXT NOT NULL REFERENCES login_methods(id) ON DELETE RESTRICT,
  session_id TEXT NOT NULL UNIQUE REFERENCES account_sessions(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL
);
CREATE TABLE nexus_password_audit (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES account_subjects(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK(action IN ('enroll','login','logout','login_rejected')),
  created_at TEXT NOT NULL
);
CREATE TRIGGER nexus_password_audit_immutable_update BEFORE UPDATE ON nexus_password_audit
BEGIN SELECT RAISE(ABORT,'PASSWORD_AUDIT_IMMUTABLE'); END;
CREATE TRIGGER nexus_password_audit_immutable_delete BEFORE DELETE ON nexus_password_audit
BEGIN SELECT RAISE(ABORT,'PASSWORD_AUDIT_IMMUTABLE'); END;
-- Enrollment can only complete a matching, consumed administrator invitation.
CREATE TRIGGER nexus_password_enrollment_guard BEFORE INSERT ON nexus_password_credentials
WHEN NOT EXISTS (
  SELECT 1 FROM nexus_password_invite_emails e
  JOIN nexus_admin_invites i ON i.token_hash=e.token_hash AND i.account_id=e.account_id AND i.state='accepted' AND i.kind='admin'
  JOIN nexus_passkey_invites p ON p.token_hash=i.token_hash AND p.account_id=i.account_id AND p.consumed_at IS NOT NULL
  JOIN nexus_alpha_members m ON m.account_id=e.account_id AND m.state='active'
  JOIN login_methods lm ON lm.id=NEW.login_method_id AND lm.account_id=e.account_id AND lm.kind='password' AND lm.status='active'
  WHERE e.account_id=NEW.account_id AND e.email_hash=NEW.email_hash
)
BEGIN SELECT RAISE(ABORT,'PASSWORD_INVITATION_REQUIRED'); END;
-- The login receipt proves that exactly one challenge was consumed and one
-- eligible password session was issued. Races roll back the whole D1 batch.
CREATE TRIGGER nexus_password_receipt_guard BEFORE INSERT ON nexus_password_receipts
WHEN NOT EXISTS (
  SELECT 1 FROM nexus_password_challenges c
  JOIN nexus_password_credentials p ON p.account_id=c.account_id AND p.login_method_id=NEW.login_method_id
  JOIN account_sessions s ON s.id=NEW.session_id AND s.subject_id=p.account_id AND s.status='active' AND s.auth_strength='account-method-v1'
  JOIN session_login_methods sm ON sm.session_id=s.id AND sm.login_method_id=p.login_method_id AND sm.account_id=p.account_id
  WHERE c.id=NEW.challenge_id AND c.account_id=NEW.account_id AND c.consumed_at=NEW.created_at
  AND c.expires_at>NEW.created_at AND s.created_at=NEW.created_at
  AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=p.account_id)
)
BEGIN SELECT RAISE(ABORT,'PASSWORD_RECEIPT_REJECTED'); END;
