-- LOCAL CANDIDATE. No permission grants and no seeded articles or testimonials.
CREATE TABLE nexus_community_write_guards (
 request_id TEXT PRIMARY KEY,valid INTEGER NOT NULL CHECK(valid=1)
);
CREATE TABLE nexus_community_audit (
 id TEXT PRIMARY KEY,actor_id TEXT NOT NULL,item_id TEXT NOT NULL,
 action TEXT NOT NULL CHECK(action IN('delete-item','reply','delete-reply')),
 created_at TEXT NOT NULL
);
CREATE TRIGGER nexus_community_audit_immutable_update BEFORE UPDATE ON nexus_community_audit
BEGIN SELECT RAISE(ABORT,'COMMUNITY_AUDIT_IMMUTABLE'); END;
CREATE TRIGGER nexus_community_audit_immutable_delete BEFORE DELETE ON nexus_community_audit
BEGIN SELECT RAISE(ABORT,'COMMUNITY_AUDIT_IMMUTABLE'); END;
CREATE TABLE feedback_deleted_items (
 id TEXT PRIMARY KEY,author_id TEXT NOT NULL,request_key TEXT NOT NULL,
 deleted_at TEXT NOT NULL,UNIQUE(author_id,request_key)
);
CREATE TRIGGER feedback_deleted_request_no_recreate BEFORE INSERT ON feedback_items
WHEN EXISTS(SELECT 1 FROM feedback_deleted_items WHERE author_id=NEW.author_id AND request_key=NEW.request_key)
BEGIN SELECT RAISE(ABORT,'ITEM_DELETED'); END;
CREATE TABLE feedback_replies (
 id TEXT PRIMARY KEY,item_id TEXT NOT NULL REFERENCES feedback_items(id) ON DELETE CASCADE,
 author_id TEXT NOT NULL REFERENCES account_subjects(id) ON DELETE RESTRICT,
 body TEXT CHECK(body IS NULL OR length(body) BETWEEN 1 AND 4000),
 is_team INTEGER NOT NULL CHECK(is_team IN(0,1)),
 request_key TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL,deleted_at TEXT,
 UNIQUE(item_id,author_id,request_key),
 CHECK((body IS NULL)=(deleted_at IS NOT NULL))
);
CREATE INDEX feedback_replies_thread ON feedback_replies(item_id,created_at,id);
CREATE TABLE nexus_content_posts (
 id TEXT PRIMARY KEY,slug TEXT NOT NULL UNIQUE,draft_json TEXT NOT NULL,
 published_json TEXT,published_at TEXT,
 state TEXT NOT NULL CHECK(state IN('draft','published','archived')),
 version INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL
);
CREATE TABLE nexus_content_home (
 id INTEGER PRIMARY KEY CHECK(id=1),draft_json TEXT NOT NULL DEFAULT '{}',
 published_json TEXT NOT NULL DEFAULT '{}',version INTEGER NOT NULL DEFAULT 1,
 updated_at TEXT NOT NULL
);
INSERT INTO nexus_content_home(id,updated_at) VALUES(1,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
CREATE TABLE nexus_content_audit (
 id TEXT PRIMARY KEY,actor_id TEXT NOT NULL,session_id TEXT NOT NULL,target_id TEXT NOT NULL,
 action TEXT NOT NULL CHECK(action IN('save','publish','unpublish','delete')),created_at TEXT NOT NULL
);
CREATE TRIGGER nexus_content_audit_guard BEFORE INSERT ON nexus_content_audit
WHEN NOT EXISTS(
 SELECT 1 FROM nexus_admin_grants g JOIN account_subjects a ON a.id=g.account_id AND a.status='active'
 JOIN account_sessions s ON s.subject_id=a.id AND s.id=NEW.session_id AND s.status='active' AND s.revoked_at IS NULL
 JOIN session_login_methods slm ON slm.session_id=s.id AND slm.account_id=a.id
 JOIN login_methods lm ON lm.id=slm.login_method_id AND lm.account_id=a.id AND lm.kind='passkey' AND lm.status='active'
 JOIN nexus_passkey_credentials pk ON pk.login_method_id=lm.id AND pk.account_id=a.id
 WHERE g.account_id=NEW.actor_id AND g.status='active'
 AND s.created_at>strftime('%Y-%m-%dT%H:%M:%fZ','now','-5 minutes')
 AND s.idle_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')
 AND s.absolute_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now'))
BEGIN SELECT RAISE(ABORT,'ADMIN_FRESH_PASSKEY_REQUIRED'); END;
CREATE TRIGGER nexus_content_audit_no_update BEFORE UPDATE ON nexus_content_audit
BEGIN SELECT RAISE(ABORT,'CONTENT_AUDIT_IMMUTABLE'); END;
CREATE TRIGGER nexus_content_audit_no_delete BEFORE DELETE ON nexus_content_audit
BEGIN SELECT RAISE(ABORT,'CONTENT_AUDIT_IMMUTABLE'); END;
