-- Additive hardening after 0021. Local/staging verification before production.
ALTER TABLE nexus_password_credentials ADD COLUMN version INTEGER NOT NULL DEFAULT 1 CHECK(version>=1);
ALTER TABLE nexus_password_credentials ADD COLUMN email_verified_at TEXT;
ALTER TABLE nexus_password_challenges ADD COLUMN credential_version INTEGER NOT NULL DEFAULT 0;
CREATE TABLE nexus_password_mail_tokens (
 token_hash TEXT PRIMARY KEY CHECK(length(token_hash)=64),
 purpose TEXT NOT NULL CHECK(purpose IN('enroll','recover')),
 account_id TEXT NOT NULL REFERENCES account_subjects(id) ON DELETE RESTRICT,
 invite_hash TEXT,
 email_hash TEXT NOT NULL CHECK(length(email_hash)=64),
 credential_version INTEGER,
 created_at TEXT NOT NULL,
 expires_at TEXT NOT NULL,
 consumed_at TEXT,
 commit_id TEXT,
 UNIQUE(account_id,purpose),
 CHECK((purpose='enroll' AND invite_hash IS NOT NULL AND credential_version IS NULL) OR
       (purpose='recover' AND invite_hash IS NULL AND credential_version>=1)),
 CHECK((consumed_at IS NULL AND commit_id IS NULL) OR (consumed_at IS NOT NULL AND commit_id IS NOT NULL))
);
CREATE INDEX nexus_password_mail_expiry ON nexus_password_mail_tokens(expires_at);
CREATE TABLE nexus_password_write_guards (
 id TEXT PRIMARY KEY,
 valid INTEGER NOT NULL CHECK(valid=1)
);
-- Audit is append-only and contains no email, proof, token, password or verifier.
CREATE TABLE nexus_password_security_audit (
 id TEXT PRIMARY KEY,
 account_id TEXT REFERENCES account_subjects(id) ON DELETE RESTRICT,
 action TEXT NOT NULL CHECK(action IN('mail_enroll','mail_recover','reset','rejected')),
 created_at TEXT NOT NULL
);
CREATE TRIGGER nexus_password_security_audit_update BEFORE UPDATE ON nexus_password_security_audit
BEGIN SELECT RAISE(ABORT,'PASSWORD_AUDIT_IMMUTABLE'); END;
CREATE TRIGGER nexus_password_security_audit_delete BEFORE DELETE ON nexus_password_security_audit
BEGIN SELECT RAISE(ABORT,'PASSWORD_AUDIT_IMMUTABLE'); END;
DROP TRIGGER nexus_password_enrollment_guard;
CREATE TRIGGER nexus_password_enrollment_guard BEFORE INSERT ON nexus_password_credentials
WHEN NOT EXISTS (
 SELECT 1 FROM nexus_password_invite_emails e
 JOIN nexus_admin_invites i ON i.token_hash=e.token_hash AND i.account_id=e.account_id AND i.state='accepted' AND i.kind='admin'
 JOIN nexus_passkey_invites p ON p.token_hash=i.token_hash AND p.account_id=i.account_id AND p.consumed_at=NEW.created_at AND p.expires_at>NEW.created_at
 JOIN nexus_password_mail_tokens t ON t.invite_hash=i.token_hash AND t.account_id=i.account_id AND t.purpose='enroll'
   AND t.email_hash=NEW.email_hash AND t.consumed_at=NEW.created_at AND t.expires_at>NEW.created_at AND t.commit_id=p.commit_id
 JOIN nexus_alpha_members m ON m.account_id=e.account_id AND m.state='active'
 JOIN account_subjects a ON a.id=e.account_id AND a.status='active'
 JOIN login_methods lm ON lm.id=NEW.login_method_id AND lm.account_id=e.account_id AND lm.kind='password' AND lm.status='active'
 WHERE e.account_id=NEW.account_id AND e.email_hash=NEW.email_hash AND NEW.email_verified_at=NEW.created_at
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=e.account_id)
)
BEGIN SELECT RAISE(ABORT,'PASSWORD_EMAIL_PROOF_REQUIRED'); END;
-- Defense in depth: a reset/session cannot race owner revocation, method disable,
-- expiry or another password reset. Application guards also check inside batch().
DROP TRIGGER nexus_password_receipt_guard;
CREATE TRIGGER nexus_password_receipt_guard BEFORE INSERT ON nexus_password_receipts
WHEN NOT EXISTS (
 SELECT 1 FROM nexus_password_challenges c
 JOIN nexus_password_credentials p ON p.account_id=c.account_id AND p.login_method_id=NEW.login_method_id
   AND p.version=c.credential_version AND p.email_verified_at IS NOT NULL
 JOIN login_methods lm ON lm.id=p.login_method_id AND lm.account_id=p.account_id AND lm.kind='password' AND lm.status='active'
 JOIN account_subjects a ON a.id=p.account_id AND a.status='active'
 JOIN nexus_alpha_members m ON m.account_id=a.id AND m.state='active' AND (m.access_expires_at IS NULL OR m.access_expires_at>NEW.created_at)
 JOIN account_sessions s ON s.id=NEW.session_id AND s.subject_id=p.account_id AND s.status='active' AND s.auth_strength='account-method-v1'
 JOIN session_login_methods sm ON sm.session_id=s.id AND sm.login_method_id=p.login_method_id AND sm.account_id=p.account_id
 WHERE c.id=NEW.challenge_id AND c.account_id=NEW.account_id AND c.consumed_at=NEW.created_at
 AND c.expires_at>NEW.created_at AND s.created_at=NEW.created_at AND s.revoked_at IS NULL
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=p.account_id)
)
BEGIN SELECT RAISE(ABORT,'PASSWORD_RECEIPT_REJECTED'); END;
CREATE TRIGGER nexus_password_reset_guard BEFORE UPDATE OF hash_b64,salt_b64 ON nexus_password_credentials
WHEN NEW.version<>OLD.version+1 OR NOT EXISTS (
 SELECT 1 FROM nexus_password_mail_tokens t
 JOIN account_subjects a ON a.id=t.account_id AND a.status='active'
 JOIN nexus_alpha_members m ON m.account_id=a.id AND m.state='active' AND (m.access_expires_at IS NULL OR m.access_expires_at>NEW.updated_at)
 JOIN login_methods lm ON lm.id=NEW.login_method_id AND lm.account_id=a.id AND lm.kind='password' AND lm.status='active'
 WHERE t.account_id=NEW.account_id AND t.email_hash=NEW.email_hash AND t.purpose='recover'
 AND t.credential_version=OLD.version AND t.consumed_at=NEW.updated_at AND t.expires_at>NEW.updated_at
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=a.id)
)
BEGIN SELECT RAISE(ABORT,'PASSWORD_RESET_PROOF_REQUIRED'); END;
-- Any password change invalidates every server session/token and pending login.
CREATE TRIGGER nexus_password_reset_revoke AFTER UPDATE OF hash_b64,salt_b64 ON nexus_password_credentials
BEGIN
 UPDATE account_sessions SET status='revoked',revoked_at=COALESCE(revoked_at,NEW.updated_at),revoked_reason='password-reset' WHERE subject_id=NEW.account_id AND status='active';
 UPDATE account_tokens SET status='revoked' WHERE subject_id=NEW.account_id AND status='active';
 UPDATE nexus_password_challenges SET consumed_at=COALESCE(consumed_at,NEW.updated_at) WHERE account_id=NEW.account_id;
END;
-- Disabling the login method is terminal for sessions already issued by it.
CREATE TRIGGER nexus_password_method_disabled AFTER UPDATE OF status ON login_methods
WHEN NEW.kind='password' AND NEW.status='disabled'
BEGIN
 UPDATE account_sessions SET status='revoked',revoked_at=COALESCE(revoked_at,NEW.disabled_at),revoked_reason='password-disabled'
 WHERE id IN(SELECT session_id FROM session_login_methods WHERE login_method_id=NEW.id) AND status='active';
END;
