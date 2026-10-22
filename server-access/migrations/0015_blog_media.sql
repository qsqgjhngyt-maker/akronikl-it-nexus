-- Только добавление отдельного хранилища изображений. Существующие записи не изменяются.
-- SOURCE ONLY: применять в production только после нового разрешения владельца.
CREATE TABLE IF NOT EXISTS nexus_content_media (
 id TEXT PRIMARY KEY CHECK(length(id)=64),
 jpeg_base64 TEXT NOT NULL CHECK(length(jpeg_base64)<=131072),
 width INTEGER NOT NULL CHECK(width BETWEEN 1 AND 1600),
 height INTEGER NOT NULL CHECK(height BETWEEN 1 AND 1600),
 bytes INTEGER NOT NULL CHECK(bytes BETWEEN 1 AND 98304),
 created_by TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS nexus_content_media_audit (
 id TEXT PRIMARY KEY,actor_id TEXT NOT NULL,session_id TEXT NOT NULL,
 target_id TEXT NOT NULL,action TEXT NOT NULL CHECK(action='upload'),created_at TEXT NOT NULL
);
CREATE TRIGGER IF NOT EXISTS nexus_content_media_audit_guard BEFORE INSERT ON nexus_content_media_audit
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
CREATE TRIGGER IF NOT EXISTS nexus_content_media_audit_no_update BEFORE UPDATE ON nexus_content_media_audit
BEGIN SELECT RAISE(ABORT,'CONTENT_MEDIA_AUDIT_IMMUTABLE'); END;
CREATE TRIGGER IF NOT EXISTS nexus_content_media_audit_no_delete BEFORE DELETE ON nexus_content_media_audit
BEGIN SELECT RAISE(ABORT,'CONTENT_MEDIA_AUDIT_IMMUTABLE'); END;
