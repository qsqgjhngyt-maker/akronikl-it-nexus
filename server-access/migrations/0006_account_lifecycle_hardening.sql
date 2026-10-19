-- Nexus Account: provider-independent identity and lifecycle hardening.
-- Additive-only: legacy tokens and existing sessions are not converted.

CREATE TABLE IF NOT EXISTS oauth_identities (
  login_method_id TEXT NOT NULL PRIMARY KEY,
  account_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (length(provider) BETWEEN 1 AND 64),
  issuer TEXT NOT NULL CHECK (length(issuer) BETWEEN 1 AND 512),
  provider_subject TEXT NOT NULL CHECK (length(provider_subject) BETWEEN 1 AND 512),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  UNIQUE (provider, issuer, provider_subject),
  FOREIGN KEY (login_method_id) REFERENCES login_methods(id) ON DELETE RESTRICT,
  FOREIGN KEY (account_id) REFERENCES account_subjects(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_oauth_identities_account
  ON oauth_identities(account_id, provider, login_method_id);

CREATE TABLE IF NOT EXISTS session_login_methods (
  session_id TEXT NOT NULL PRIMARY KEY,
  login_method_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES account_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (login_method_id) REFERENCES login_methods(id) ON DELETE RESTRICT,
  FOREIGN KEY (account_id) REFERENCES account_subjects(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_session_login_methods_method
  ON session_login_methods(login_method_id, session_id);

CREATE TRIGGER IF NOT EXISTS trg_oauth_identity_insert_owner
BEFORE INSERT ON oauth_identities
WHEN NOT EXISTS (
  SELECT 1 FROM login_methods lm
  WHERE lm.id = NEW.login_method_id
    AND lm.account_id = NEW.account_id
    AND lm.kind = 'oauth'
    AND lm.status IN ('pending', 'active')
)
BEGIN
  SELECT RAISE(ABORT, 'OAUTH_IDENTITY_LOGIN_METHOD_MISMATCH');
END;

CREATE TRIGGER IF NOT EXISTS trg_oauth_identity_update_owner
BEFORE UPDATE OF login_method_id, account_id ON oauth_identities
WHEN NOT EXISTS (
  SELECT 1 FROM login_methods lm
  WHERE lm.id = NEW.login_method_id
    AND lm.account_id = NEW.account_id
    AND lm.kind = 'oauth'
)
BEGIN
  SELECT RAISE(ABORT, 'OAUTH_IDENTITY_LOGIN_METHOD_MISMATCH');
END;

CREATE TRIGGER IF NOT EXISTS trg_active_session_insert_device_owner
BEFORE INSERT ON account_sessions
WHEN NEW.status = 'active' AND (
  NEW.device_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM account_devices d
    WHERE d.id = NEW.device_id
      AND d.subject_id = NEW.subject_id
      AND d.status = 'active'
  )
)
BEGIN
  SELECT RAISE(ABORT, 'ACTIVE_SESSION_DEVICE_OWNER_REQUIRED');
END;

CREATE TRIGGER IF NOT EXISTS trg_active_session_update_device_owner
BEFORE UPDATE OF subject_id, device_id, status ON account_sessions
WHEN NEW.status = 'active' AND (
  NEW.device_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM account_devices d
    WHERE d.id = NEW.device_id
      AND d.subject_id = NEW.subject_id
      AND d.status = 'active'
  )
)
BEGIN
  SELECT RAISE(ABORT, 'ACTIVE_SESSION_DEVICE_OWNER_REQUIRED');
END;

CREATE TRIGGER IF NOT EXISTS trg_session_no_reactivation
BEFORE UPDATE OF status ON account_sessions
WHEN OLD.status = 'revoked' AND NEW.status = 'active'
BEGIN
  SELECT RAISE(ABORT, 'REVOKED_SESSION_IS_TERMINAL');
END;

CREATE TRIGGER IF NOT EXISTS trg_device_no_reactivation
BEFORE UPDATE OF status ON account_devices
WHEN OLD.status = 'revoked' AND NEW.status = 'active'
BEGIN
  SELECT RAISE(ABORT, 'REVOKED_DEVICE_IS_TERMINAL');
END;

CREATE TRIGGER IF NOT EXISTS trg_session_login_method_insert_owner
BEFORE INSERT ON session_login_methods
WHEN NOT EXISTS (
  SELECT 1
  FROM account_sessions s
  JOIN login_methods lm ON lm.id = NEW.login_method_id
  WHERE s.id = NEW.session_id
    AND s.subject_id = NEW.account_id
    AND s.status = 'active'
    AND lm.account_id = NEW.account_id
    AND lm.status = 'active'
)
BEGIN
  SELECT RAISE(ABORT, 'SESSION_LOGIN_METHOD_OWNER_MISMATCH');
END;

CREATE TRIGGER IF NOT EXISTS trg_session_login_method_update_owner
BEFORE UPDATE OF session_id, login_method_id, account_id ON session_login_methods
WHEN NOT EXISTS (
  SELECT 1
  FROM account_sessions s
  JOIN login_methods lm ON lm.id = NEW.login_method_id
  WHERE s.id = NEW.session_id
    AND s.subject_id = NEW.account_id
    AND s.status = 'active'
    AND lm.account_id = NEW.account_id
    AND lm.status = 'active'
)
BEGIN
  SELECT RAISE(ABORT, 'SESSION_LOGIN_METHOD_OWNER_MISMATCH');
END;

CREATE TRIGGER IF NOT EXISTS trg_device_revoke_sessions
AFTER UPDATE OF status ON account_devices
WHEN OLD.status = 'active' AND NEW.status = 'revoked'
BEGIN
  UPDATE account_sessions
  SET status = 'revoked',
      revoked_at = COALESCE(revoked_at, NEW.last_seen_at),
      revoked_reason = 'device-revoked'
  WHERE device_id = NEW.id AND status = 'active';
END;

CREATE TRIGGER IF NOT EXISTS trg_login_method_disable_sessions
AFTER UPDATE OF status ON login_methods
WHEN OLD.status <> 'disabled' AND NEW.status = 'disabled'
BEGIN
  UPDATE account_sessions
  SET status = 'revoked',
      revoked_at = COALESCE(revoked_at, NEW.disabled_at),
      revoked_reason = 'login-method-disabled'
  WHERE status = 'active'
    AND id IN (
      SELECT slm.session_id
      FROM session_login_methods slm
      WHERE slm.login_method_id = NEW.id
    );
END;

CREATE TRIGGER IF NOT EXISTS trg_account_disable_credentials
AFTER UPDATE OF status ON account_subjects
WHEN OLD.status = 'active' AND NEW.status = 'disabled'
BEGIN
  UPDATE account_sessions
  SET status = 'revoked',
      revoked_at = COALESCE(revoked_at, NEW.updated_at),
      revoked_reason = 'account-disabled'
  WHERE subject_id = NEW.id AND status = 'active';

  UPDATE account_tokens
  SET status = 'revoked'
  WHERE subject_id = NEW.id AND status = 'active';

  UPDATE login_methods
  SET status = 'disabled',
      disabled_at = COALESCE(disabled_at, NEW.updated_at),
      version = version + 1
  WHERE account_id = NEW.id AND status <> 'disabled';
END;
