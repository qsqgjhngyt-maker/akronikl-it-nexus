-- SOURCE ONLY. Аддитивная схема, не применять без отдельного разрешения.
-- Удаление допускается только для истёкших временных uploads и их parts.
CREATE TABLE IF NOT EXISTS nexus_content_media_uploads (
 upload_id TEXT PRIMARY KEY CHECK(length(upload_id)=36),
 account_id TEXT NOT NULL,session_id TEXT NOT NULL,
 request_id TEXT NOT NULL UNIQUE CHECK(length(request_id)=36),
 external_id TEXT NOT NULL CHECK(length(external_id)=36),
 media_id TEXT NOT NULL CHECK(length(media_id)=64),
 encoded_length INTEGER NOT NULL CHECK(encoded_length BETWEEN 4 AND 131072 AND encoded_length%4=0),
 bytes INTEGER NOT NULL CHECK(bytes BETWEEN 4 AND 98304),
 width INTEGER NOT NULL CHECK(width BETWEEN 1 AND 1600),
 height INTEGER NOT NULL CHECK(height BETWEEN 1 AND 1600),
 total_parts INTEGER NOT NULL CHECK(total_parts BETWEEN 1 AND 16),
 state TEXT NOT NULL CHECK(state IN('pending','committed','aborted')),
 created_at TEXT NOT NULL,expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS nexus_content_media_upload_expiry ON nexus_content_media_uploads(expires_at);
CREATE INDEX IF NOT EXISTS nexus_content_media_upload_account ON nexus_content_media_uploads(account_id,state);
CREATE TABLE IF NOT EXISTS nexus_content_media_parts (
 upload_id TEXT NOT NULL REFERENCES nexus_content_media_uploads(upload_id) ON DELETE CASCADE,
 part_index INTEGER NOT NULL CHECK(part_index BETWEEN 0 AND 15),
 data TEXT NOT NULL CHECK(length(data) BETWEEN 4 AND 8192 AND length(data)%4=0),
 part_sha256 TEXT NOT NULL CHECK(length(part_sha256)=64),
 PRIMARY KEY(upload_id,part_index)
);
