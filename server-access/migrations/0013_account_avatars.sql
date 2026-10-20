-- SOURCE CANDIDATE ONLY. Avatar is private account data, not a public file URL.
CREATE TABLE nexus_account_avatars (
 account_id TEXT PRIMARY KEY REFERENCES account_subjects(id) ON DELETE RESTRICT,
 -- Retain a revision-only tombstone after removal: a stale tab cannot reuse version 0.
 jpeg_base64 TEXT CHECK(jpeg_base64 IS NULL OR length(jpeg_base64) BETWEEN 4 AND 131072),
 version INTEGER NOT NULL CHECK(version>0),
 updated_at TEXT NOT NULL
);
CREATE TABLE nexus_admin_purge_links (
 request_id TEXT NOT NULL,kind TEXT NOT NULL,item_id TEXT NOT NULL,
 PRIMARY KEY(request_id,kind,item_id)
);
