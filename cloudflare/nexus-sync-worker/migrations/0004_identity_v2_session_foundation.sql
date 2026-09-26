-- AKRONIKL IT NEXUS v0.1.7-alpha.2.4.2
-- Identity v2 server/session foundation.
-- Additive migration: legacy account_tokens remain valid during migration.

CREATE TABLE IF NOT EXISTS account_devices (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'Nexus device',
  platform TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  FOREIGN KEY (subject_id) REFERENCES account_subjects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_account_devices_subject
  ON account_devices(subject_id, status, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS account_sessions (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  device_id TEXT,
  secret_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  auth_strength TEXT NOT NULL DEFAULT 'legacy-bridge',
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  idle_expires_at TEXT NOT NULL,
  absolute_expires_at TEXT NOT NULL,
  revoked_at TEXT,
  revoked_reason TEXT,
  FOREIGN KEY (subject_id) REFERENCES account_subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (device_id) REFERENCES account_devices(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_account_sessions_hash
  ON account_sessions(secret_hash, status);

CREATE INDEX IF NOT EXISTS idx_account_sessions_subject
  ON account_sessions(subject_id, status, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_account_sessions_device
  ON account_sessions(device_id, status);

CREATE TABLE IF NOT EXISTS identity_security_events (
  id TEXT PRIMARY KEY,
  subject_id TEXT,
  session_id TEXT,
  device_id TEXT,
  action TEXT NOT NULL,
  result TEXT NOT NULL DEFAULT 'success',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (subject_id) REFERENCES account_subjects(id) ON DELETE SET NULL,
  FOREIGN KEY (session_id) REFERENCES account_sessions(id) ON DELETE SET NULL,
  FOREIGN KEY (device_id) REFERENCES account_devices(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_identity_security_subject
  ON identity_security_events(subject_id, created_at DESC);
