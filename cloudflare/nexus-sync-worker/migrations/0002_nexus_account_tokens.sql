CREATE TABLE IF NOT EXISTS account_subjects (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS account_tokens (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT 'device token',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  created_at TEXT NOT NULL,
  last_used_at TEXT,
  FOREIGN KEY (subject_id) REFERENCES account_subjects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_account_tokens_subject ON account_tokens(subject_id,status);
CREATE INDEX IF NOT EXISTS idx_account_tokens_hash ON account_tokens(token_hash,status);
