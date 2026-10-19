-- Nexus Account: добавочный реестр способов входа.
-- Применение к production требует отдельного design/deployment gate.
-- Существующие аккаунты, токены, устройства и сессии не изменяются.
CREATE TABLE IF NOT EXISTS login_methods (
  id TEXT NOT NULL PRIMARY KEY,
  account_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('oauth','password','passkey')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','disabled')),
  created_at TEXT NOT NULL,
  disabled_at TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  CHECK ((status = 'disabled' AND disabled_at IS NOT NULL)
    OR (status <> 'disabled' AND disabled_at IS NULL)),
  FOREIGN KEY (account_id) REFERENCES account_subjects(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_login_methods_account
  ON login_methods(account_id, status, id);
