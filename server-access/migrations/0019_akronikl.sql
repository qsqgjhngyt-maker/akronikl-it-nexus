-- Additive assistant storage. No existing account/session/credential rows change.
CREATE TABLE nexus_akronikl_nonces (nonce TEXT PRIMARY KEY,expires_at INTEGER NOT NULL);
CREATE INDEX nexus_akronikl_nonce_expiry ON nexus_akronikl_nonces(expires_at);
CREATE TABLE nexus_akronikl_state (
 account_id TEXT NOT NULL REFERENCES account_subjects(id) ON DELETE CASCADE,
 slot TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>0),
 ciphertext TEXT NOT NULL CHECK(length(ciphertext) BETWEEN 40 AND 1900000),
 PRIMARY KEY(account_id,slot)
);
CREATE TABLE nexus_akronikl_connections (
 token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES account_subjects(id) ON DELETE CASCADE,
 session_hash TEXT NOT NULL, provider_id TEXT NOT NULL, version TEXT NOT NULL,
 expires_at INTEGER NOT NULL, busy_until INTEGER NOT NULL DEFAULT 0, lock_id TEXT,
 ciphertext TEXT NOT NULL CHECK(length(ciphertext) BETWEEN 40 AND 20000)
);
CREATE INDEX nexus_akronikl_connections_account ON nexus_akronikl_connections(account_id,session_hash);
CREATE INDEX nexus_akronikl_connections_expiry ON nexus_akronikl_connections(expires_at);
-- A disconnect must not erase the lock of an upstream request still running.
CREATE TABLE nexus_akronikl_locks (
 account_id TEXT PRIMARY KEY REFERENCES account_subjects(id) ON DELETE CASCADE,
 token_hash TEXT NOT NULL, session_hash TEXT NOT NULL, version TEXT NOT NULL,
 busy_until INTEGER NOT NULL, lock_id TEXT NOT NULL
);
CREATE TABLE nexus_akronikl_limits (
 account_id TEXT NOT NULL REFERENCES account_subjects(id) ON DELETE CASCADE,
 bucket TEXT NOT NULL, count INTEGER NOT NULL CHECK(count>0), expires_at INTEGER NOT NULL,
 PRIMARY KEY(account_id,bucket)
);
CREATE INDEX nexus_akronikl_limits_expiry ON nexus_akronikl_limits(expires_at);
