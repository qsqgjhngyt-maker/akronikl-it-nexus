-- Защита стабильных владельцев и выдачи credentials отключённому account.
-- Только новые triggers; существующие строки не изменяются и не удаляются.
-- OAuth flow и автоматическая привязка legacy tokens не включаются.

CREATE TRIGGER IF NOT EXISTS trg_account_id_immutable
BEFORE UPDATE OF id ON account_subjects
WHEN NEW.id IS NOT OLD.id
BEGIN
  SELECT RAISE(ABORT, 'ACCOUNT_ID_IMMUTABLE');
END;

CREATE TRIGGER IF NOT EXISTS trg_device_owner_immutable
BEFORE UPDATE OF id, subject_id ON account_devices
WHEN NEW.id IS NOT OLD.id OR NEW.subject_id IS NOT OLD.subject_id
BEGIN
  SELECT RAISE(ABORT, 'DEVICE_OWNER_IMMUTABLE');
END;

CREATE TRIGGER IF NOT EXISTS trg_session_owner_immutable
BEFORE UPDATE OF id, subject_id, device_id ON account_sessions
WHEN NEW.id IS NOT OLD.id OR NEW.subject_id IS NOT OLD.subject_id
  OR (NEW.device_id IS NOT OLD.device_id
    AND NOT (OLD.status = 'revoked' AND NEW.device_id IS NULL))
BEGIN
  -- Сохраняется прежний ON DELETE SET NULL для уже отозванной session.
  SELECT RAISE(ABORT, 'SESSION_OWNER_IMMUTABLE');
END;

CREATE TRIGGER IF NOT EXISTS trg_login_method_owner_immutable
BEFORE UPDATE OF id, account_id, kind ON login_methods
WHEN NEW.id IS NOT OLD.id OR NEW.account_id IS NOT OLD.account_id
  OR NEW.kind IS NOT OLD.kind
BEGIN
  SELECT RAISE(ABORT, 'LOGIN_METHOD_OWNER_IMMUTABLE');
END;

CREATE TRIGGER IF NOT EXISTS trg_oauth_identity_key_immutable
BEFORE UPDATE OF login_method_id, account_id, provider, issuer, provider_subject ON oauth_identities
WHEN NEW.login_method_id IS NOT OLD.login_method_id
  OR NEW.account_id IS NOT OLD.account_id
  OR NEW.provider IS NOT OLD.provider OR NEW.issuer IS NOT OLD.issuer
  OR NEW.provider_subject IS NOT OLD.provider_subject
BEGIN
  SELECT RAISE(ABORT, 'OAUTH_IDENTITY_KEY_IMMUTABLE');
END;

CREATE TRIGGER IF NOT EXISTS trg_session_method_binding_immutable
BEFORE UPDATE OF session_id, login_method_id, account_id ON session_login_methods
WHEN NEW.session_id IS NOT OLD.session_id
  OR NEW.login_method_id IS NOT OLD.login_method_id
  OR NEW.account_id IS NOT OLD.account_id
BEGIN
  SELECT RAISE(ABORT, 'SESSION_METHOD_BINDING_IMMUTABLE');
END;

CREATE TRIGGER IF NOT EXISTS trg_active_session_insert_account
BEFORE INSERT ON account_sessions
WHEN NEW.status = 'active' AND NOT EXISTS (
  SELECT 1 FROM account_subjects a WHERE a.id = NEW.subject_id AND a.status = 'active'
)
BEGIN
  SELECT RAISE(ABORT, 'ACTIVE_SESSION_ACCOUNT_REQUIRED');
END;

CREATE TRIGGER IF NOT EXISTS trg_active_session_update_account
BEFORE UPDATE OF status, subject_id ON account_sessions
WHEN NEW.status = 'active' AND NOT EXISTS (
  SELECT 1 FROM account_subjects a WHERE a.id = NEW.subject_id AND a.status = 'active'
)
BEGIN
  SELECT RAISE(ABORT, 'ACTIVE_SESSION_ACCOUNT_REQUIRED');
END;

CREATE TRIGGER IF NOT EXISTS trg_login_method_insert_account
BEFORE INSERT ON login_methods
WHEN NEW.status <> 'disabled' AND NOT EXISTS (
  SELECT 1 FROM account_subjects a WHERE a.id = NEW.account_id AND a.status = 'active'
)
BEGIN
  SELECT RAISE(ABORT, 'LOGIN_METHOD_ACTIVE_ACCOUNT_REQUIRED');
END;

CREATE TRIGGER IF NOT EXISTS trg_login_method_update_account
BEFORE UPDATE OF status, account_id ON login_methods
WHEN NEW.status <> 'disabled' AND NOT EXISTS (
  SELECT 1 FROM account_subjects a WHERE a.id = NEW.account_id AND a.status = 'active'
)
BEGIN
  SELECT RAISE(ABORT, 'LOGIN_METHOD_ACTIVE_ACCOUNT_REQUIRED');
END;

CREATE TRIGGER IF NOT EXISTS trg_active_token_insert_account
BEFORE INSERT ON account_tokens
WHEN NEW.status = 'active' AND NOT EXISTS (
  SELECT 1 FROM account_subjects a WHERE a.id = NEW.subject_id AND a.status = 'active'
)
BEGIN
  SELECT RAISE(ABORT, 'ACTIVE_TOKEN_ACCOUNT_REQUIRED');
END;

CREATE TRIGGER IF NOT EXISTS trg_active_token_update_account
BEFORE UPDATE OF status, subject_id ON account_tokens
WHEN NEW.status = 'active' AND NOT EXISTS (
  SELECT 1 FROM account_subjects a WHERE a.id = NEW.subject_id AND a.status = 'active'
)
BEGIN
  SELECT RAISE(ABORT, 'ACTIVE_TOKEN_ACCOUNT_REQUIRED');
END;
