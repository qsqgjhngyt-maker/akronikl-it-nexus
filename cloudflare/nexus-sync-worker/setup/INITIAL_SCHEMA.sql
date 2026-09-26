PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('personal','team')),
  name TEXT NOT NULL,
  owner_subject_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  invited_by TEXT,
  joined_at TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, subject_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  owner_subject_id TEXT NOT NULL,
  title TEXT NOT NULL,
  language_id TEXT NOT NULL,
  current_revision INTEGER NOT NULL DEFAULT 0,
  latest_r2_key TEXT,
  latest_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  invited_by TEXT,
  joined_at TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (project_id, subject_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_access_policies (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  subject_id TEXT,
  role TEXT,
  scope TEXT NOT NULL DEFAULT '/**',
  effect TEXT NOT NULL CHECK (effect IN ('allow','deny')),
  actions_json TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_revisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  content_hash TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(project_id, revision),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_checkpoints (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  label TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_invites (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  invited_email TEXT,
  invited_subject_id TEXT,
  role TEXT NOT NULL,
  scope_json TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  accepted_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  project_id TEXT,
  actor_subject_id TEXT NOT NULL,
  action TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT '/',
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  revision_before INTEGER,
  revision_after INTEGER,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_subject ON workspace_members(subject_id, status);
CREATE INDEX IF NOT EXISTS idx_project_members_subject ON project_members(subject_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_acl_project ON project_access_policies(project_id);
CREATE INDEX IF NOT EXISTS idx_revisions_project ON project_revisions(project_id, revision DESC);
CREATE INDEX IF NOT EXISTS idx_audit_project ON audit_events(project_id, created_at DESC);
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

-- v0.1.7-alpha.2.2.1 D1-only snapshot storage
CREATE TABLE IF NOT EXISTS project_snapshots (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  content_hash TEXT,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(project_id, revision),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_snapshots_project
  ON project_snapshots(project_id, revision DESC);

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
