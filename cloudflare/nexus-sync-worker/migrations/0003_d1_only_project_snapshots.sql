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
