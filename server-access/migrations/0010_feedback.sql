-- Candidate only. Apply after the existing Account Foundation migrations.
-- No account or moderator is created by this schema.
CREATE TABLE IF NOT EXISTS feedback_permissions (
 account_id TEXT PRIMARY KEY REFERENCES account_subjects(id) ON DELETE CASCADE,
 can_moderate INTEGER NOT NULL DEFAULT 0 CHECK(can_moderate IN (0,1))
);
CREATE TABLE IF NOT EXISTS feedback_items (
 id TEXT PRIMARY KEY,
 author_id TEXT NOT NULL REFERENCES account_subjects(id) ON DELETE RESTRICT,
 kind TEXT NOT NULL CHECK(kind IN ('message','review')),
 type TEXT NOT NULL CHECK(type IN ('bug','material','idea','impression','review')),
 current_revision INTEGER NOT NULL DEFAULT 1,
 version INTEGER NOT NULL DEFAULT 1,
 status TEXT NOT NULL CHECK(status IN ('submitted','triaged','in-progress','resolved','pending','approved','rejected','withdrawn')),
 featured INTEGER NOT NULL DEFAULT 0 CHECK(featured IN (0,1)),
 request_key TEXT NOT NULL,
 request_hash TEXT NOT NULL,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 UNIQUE(author_id,request_key)
);
CREATE TABLE IF NOT EXISTS feedback_revisions (
 item_id TEXT NOT NULL REFERENCES feedback_items(id) ON DELETE CASCADE,
 revision INTEGER NOT NULL,
 body TEXT NOT NULL CHECK(length(body) BETWEEN 10 AND 4000),
 search_text TEXT NOT NULL DEFAULT '',
 public_name TEXT NOT NULL DEFAULT '' CHECK(length(public_name)<=80),
 rating INTEGER CHECK(rating BETWEEN 1 AND 5),
 course_id TEXT NOT NULL DEFAULT '' CHECK(length(course_id)<=80),
 consent INTEGER NOT NULL DEFAULT 0 CHECK(consent IN (0,1)),
 context_json TEXT NOT NULL DEFAULT '{}',
 created_at TEXT NOT NULL,
 PRIMARY KEY(item_id,revision)
);
CREATE TABLE IF NOT EXISTS feedback_events (
 id TEXT PRIMARY KEY,
 item_id TEXT NOT NULL REFERENCES feedback_items(id) ON DELETE CASCADE,
 revision INTEGER NOT NULL,
 actor_id TEXT NOT NULL REFERENCES account_subjects(id) ON DELETE RESTRICT,
 action TEXT NOT NULL,
 reason TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS feedback_author ON feedback_items(author_id,created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_queue ON feedback_items(status,created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_events_item ON feedback_events(item_id,created_at);
CREATE TABLE IF NOT EXISTS feedback_rate_limits (
 account_id TEXT NOT NULL REFERENCES account_subjects(id) ON DELETE CASCADE,
 bucket INTEGER NOT NULL,
 used INTEGER NOT NULL DEFAULT 1,
 PRIMARY KEY(account_id,bucket)
);
CREATE TABLE IF NOT EXISTS feedback_service_nonces (
 nonce TEXT PRIMARY KEY,
 expires_at TEXT NOT NULL
);
