-- Local candidate. Requires reviewed Account migrations 0005, 0006, 0007, 0008.
-- Creates no identities, invitations, sessions or permissions.
CREATE TABLE nexus_passkey_users (
 account_id TEXT PRIMARY KEY REFERENCES account_subjects(id) ON DELETE RESTRICT,
 user_id TEXT NOT NULL UNIQUE CHECK(length(user_id)=43)
);
CREATE TABLE nexus_passkey_invites (
 token_hash TEXT PRIMARY KEY CHECK(length(token_hash)=64),
 account_id TEXT NOT NULL REFERENCES account_subjects(id) ON DELETE RESTRICT,
 purpose TEXT NOT NULL CHECK(purpose IN ('bootstrap','recovery')),
 expires_at TEXT NOT NULL,
 consumed_at TEXT,
 commit_id TEXT
);
CREATE TABLE nexus_passkey_challenges (
 id TEXT PRIMARY KEY,
 purpose TEXT NOT NULL CHECK(purpose IN ('register','authenticate')),
 challenge TEXT NOT NULL,
 flow_hash TEXT NOT NULL CHECK(length(flow_hash)=64),
 account_id TEXT REFERENCES account_subjects(id) ON DELETE RESTRICT,
 invite_hash TEXT REFERENCES nexus_passkey_invites(token_hash) ON DELETE RESTRICT,
 authorized_session_id TEXT REFERENCES account_sessions(id) ON DELETE RESTRICT,
 expires_at TEXT NOT NULL,
 consumed_at TEXT,
 commit_id TEXT,
 CHECK(purpose='authenticate' OR (account_id IS NOT NULL AND
   ((invite_hash IS NOT NULL AND authorized_session_id IS NULL) OR
    (invite_hash IS NULL AND authorized_session_id IS NOT NULL))))
);
CREATE INDEX nexus_passkey_challenge_expiry ON nexus_passkey_challenges(expires_at);
CREATE TABLE nexus_passkey_credentials (
 id TEXT PRIMARY KEY CHECK(length(id) BETWEEN 1 AND 1400),
 account_id TEXT NOT NULL REFERENCES nexus_passkey_users(account_id) ON DELETE RESTRICT,
 login_method_id TEXT NOT NULL UNIQUE REFERENCES login_methods(id) ON DELETE RESTRICT,
 public_key TEXT NOT NULL,
 counter INTEGER NOT NULL CHECK(counter>=0),
 counter_version INTEGER NOT NULL DEFAULT 0 CHECK(counter_version>=0),
 device_type TEXT NOT NULL CHECK(device_type IN ('singleDevice','multiDevice')),
 backed_up INTEGER NOT NULL CHECK(backed_up IN (0,1)),
 transports_json TEXT NOT NULL,
 last_commit_id TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE TABLE nexus_passkey_audit (
 id TEXT PRIMARY KEY,
 account_id TEXT NOT NULL REFERENCES account_subjects(id) ON DELETE RESTRICT,
 login_method_id TEXT NOT NULL REFERENCES login_methods(id) ON DELETE RESTRICT,
 session_id TEXT REFERENCES account_sessions(id) ON DELETE RESTRICT,
 action TEXT NOT NULL CHECK(action IN ('register','authenticate')),
 created_at TEXT NOT NULL,
 CHECK((action='register' AND session_id IS NULL) OR (action='authenticate' AND session_id IS NOT NULL))
);
CREATE TABLE nexus_passkey_receipts (
 id TEXT PRIMARY KEY,
 challenge_id TEXT NOT NULL UNIQUE REFERENCES nexus_passkey_challenges(id) ON DELETE RESTRICT,
 credential_id TEXT NOT NULL REFERENCES nexus_passkey_credentials(id) ON DELETE RESTRICT,
 account_id TEXT NOT NULL REFERENCES account_subjects(id) ON DELETE RESTRICT,
 login_method_id TEXT NOT NULL REFERENCES login_methods(id) ON DELETE RESTRICT,
 session_id TEXT UNIQUE REFERENCES account_sessions(id) ON DELETE RESTRICT,
 device_id TEXT REFERENCES account_devices(id) ON DELETE RESTRICT,
 action TEXT NOT NULL CHECK(action IN ('register','authenticate')),
 created_at TEXT NOT NULL,
 CHECK((action='register' AND session_id IS NULL AND device_id IS NULL) OR
       (action='authenticate' AND session_id IS NOT NULL AND device_id IS NOT NULL))
);
CREATE TABLE nexus_passkey_service_nonces (
 nonce TEXT PRIMARY KEY,
 expires_at TEXT NOT NULL
);
CREATE TABLE nexus_passkey_rate_limits (
 scope_hash TEXT NOT NULL,
 bucket INTEGER NOT NULL,
 used INTEGER NOT NULL CHECK(used BETWEEN 1 AND 40),
 PRIMARY KEY(scope_hash,bucket)
);
CREATE TRIGGER nexus_passkey_credential_owner_insert
BEFORE INSERT ON nexus_passkey_credentials
WHEN NOT EXISTS(SELECT 1 FROM login_methods lm JOIN account_subjects a ON a.id=lm.account_id
 WHERE lm.id=NEW.login_method_id AND lm.account_id=NEW.account_id
 AND lm.kind='passkey' AND lm.status='active' AND a.status='active')
BEGIN SELECT RAISE(ABORT,'PASSKEY_ACTIVE_OWNER_REQUIRED'); END;
CREATE TRIGGER nexus_passkey_credential_owner_immutable
BEFORE UPDATE OF id,account_id,login_method_id,public_key ON nexus_passkey_credentials
WHEN NEW.id IS NOT OLD.id OR NEW.account_id IS NOT OLD.account_id
 OR NEW.login_method_id IS NOT OLD.login_method_id OR NEW.public_key IS NOT OLD.public_key
BEGIN SELECT RAISE(ABORT,'PASSKEY_OWNER_IMMUTABLE'); END;
CREATE TRIGGER nexus_passkey_user_immutable
BEFORE UPDATE ON nexus_passkey_users
BEGIN SELECT RAISE(ABORT,'PASSKEY_USER_IMMUTABLE'); END;
CREATE TRIGGER nexus_passkey_audit_immutable
BEFORE UPDATE ON nexus_passkey_audit
BEGIN SELECT RAISE(ABORT,'PASSKEY_AUDIT_IMMUTABLE'); END;
CREATE TRIGGER nexus_passkey_receipt_immutable
BEFORE UPDATE ON nexus_passkey_receipts
BEGIN SELECT RAISE(ABORT,'PASSKEY_RECEIPT_IMMUTABLE'); END;
-- This final statement is part of the same atomic DB.batch as all issuance writes.
-- A stale challenge/counter/authorization aborts the WHOLE batch, including sessions.
CREATE TRIGGER nexus_passkey_receipt_commit_guard
BEFORE INSERT ON nexus_passkey_receipts
WHEN NEW.action='authenticate' AND NOT EXISTS(
 SELECT 1 FROM nexus_passkey_challenges c
 JOIN nexus_passkey_credentials k ON k.id=NEW.credential_id
 JOIN login_methods lm ON lm.id=k.login_method_id
 JOIN account_subjects a ON a.id=k.account_id
 JOIN account_sessions s ON s.id=NEW.session_id
 JOIN account_devices d ON d.id=s.device_id
 JOIN session_login_methods slm ON slm.session_id=s.id
 JOIN nexus_passkey_audit ev ON ev.id=NEW.id
 WHERE c.id=NEW.challenge_id AND c.purpose=NEW.action
 AND c.commit_id=NEW.id AND c.consumed_at IS NOT NULL AND c.expires_at>NEW.created_at
 AND k.last_commit_id=NEW.id AND k.account_id=NEW.account_id
 AND lm.id=NEW.login_method_id AND lm.account_id=a.id AND lm.kind='passkey' AND lm.status='active'
 AND a.id=NEW.account_id AND a.status='active'
 AND s.subject_id=a.id AND s.device_id=NEW.device_id AND s.status='active'
 AND s.auth_strength='account-method-v1' AND s.revoked_at IS NULL
 AND s.idle_expires_at>NEW.created_at AND s.absolute_expires_at>NEW.created_at
 AND d.subject_id=a.id AND d.status='active'
 AND slm.account_id=a.id AND slm.login_method_id=lm.id
 AND ev.account_id=a.id AND ev.login_method_id=lm.id AND ev.session_id=s.id AND ev.action=NEW.action
 AND (c.purpose='authenticate' OR (
   c.account_id=a.id AND (
    EXISTS(SELECT 1 FROM nexus_passkey_invites inv WHERE inv.token_hash=c.invite_hash
      AND inv.account_id=a.id AND inv.commit_id=NEW.id AND inv.consumed_at IS NOT NULL
      AND inv.expires_at>NEW.created_at
      AND (inv.purpose='recovery' OR
        (SELECT count(*) FROM login_methods WHERE account_id=a.id AND kind='passkey' AND status='active')=1))
    OR EXISTS(SELECT 1 FROM account_sessions prior JOIN session_login_methods pslm ON pslm.session_id=prior.id
      JOIN login_methods plm ON plm.id=pslm.login_method_id
      JOIN account_devices pd ON pd.id=prior.device_id
      WHERE prior.id=c.authorized_session_id AND prior.subject_id=a.id AND prior.status='active'
      AND prior.auth_strength='account-method-v1' AND prior.revoked_at IS NULL
      AND prior.idle_expires_at>NEW.created_at AND prior.absolute_expires_at>NEW.created_at
      AND julianday(NEW.created_at)-julianday(prior.created_at) BETWEEN 0 AND (5.0/1440)
      AND pslm.account_id=a.id AND plm.account_id=a.id AND plm.status='active'
      AND pd.subject_id=a.id AND pd.status='active')
   )
 ))
)
BEGIN SELECT RAISE(ABORT,'PASSKEY_ATOMIC_ISSUANCE_REJECTED'); END;
CREATE TRIGGER nexus_passkey_enrollment_commit_guard
BEFORE INSERT ON nexus_passkey_receipts
WHEN NEW.action='register' AND NOT EXISTS(
 SELECT 1 FROM nexus_passkey_challenges c
 JOIN nexus_passkey_credentials k ON k.id=NEW.credential_id
 JOIN login_methods lm ON lm.id=k.login_method_id
 JOIN account_subjects a ON a.id=k.account_id
 JOIN nexus_passkey_audit ev ON ev.id=NEW.id
 WHERE c.id=NEW.challenge_id AND c.purpose='register'
 AND c.commit_id=NEW.id AND c.consumed_at IS NOT NULL AND c.expires_at>NEW.created_at
 AND c.account_id=a.id AND k.account_id=NEW.account_id AND k.last_commit_id=NEW.id
 AND lm.id=NEW.login_method_id AND lm.account_id=a.id AND lm.kind='passkey' AND lm.status='active'
 AND a.id=NEW.account_id AND a.status='active'
 AND ev.account_id=a.id AND ev.login_method_id=lm.id AND ev.action='register'
 AND (EXISTS(SELECT 1 FROM nexus_passkey_invites inv WHERE inv.token_hash=c.invite_hash
      AND inv.account_id=a.id AND inv.commit_id=NEW.id AND inv.consumed_at IS NOT NULL
      AND inv.expires_at>NEW.created_at AND (inv.purpose='recovery' OR
        (SELECT count(*) FROM login_methods WHERE account_id=a.id AND kind='passkey' AND status='active')=1))
  OR EXISTS(SELECT 1 FROM account_sessions prior JOIN session_login_methods pslm ON pslm.session_id=prior.id
      JOIN login_methods plm ON plm.id=pslm.login_method_id JOIN account_devices pd ON pd.id=prior.device_id
      WHERE prior.id=c.authorized_session_id AND prior.subject_id=a.id AND prior.status='active'
      AND prior.auth_strength='account-method-v1' AND prior.revoked_at IS NULL
      AND prior.idle_expires_at>NEW.created_at AND prior.absolute_expires_at>NEW.created_at
      AND julianday(NEW.created_at)-julianday(prior.created_at) BETWEEN 0 AND (5.0/1440)
      AND pslm.account_id=a.id AND plm.account_id=a.id AND plm.status='active'
      AND pd.subject_id=a.id AND pd.status='active'))
)
BEGIN SELECT RAISE(ABORT,'PASSKEY_ATOMIC_ENROLLMENT_REJECTED'); END;
