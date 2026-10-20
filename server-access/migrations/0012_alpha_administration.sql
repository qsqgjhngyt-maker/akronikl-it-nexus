-- SOURCE CANDIDATE ONLY. No administrator is seeded and enforcement starts OFF.
CREATE TABLE nexus_admin_grants (
 account_id TEXT PRIMARY KEY REFERENCES account_subjects(id) ON DELETE RESTRICT,
 status TEXT NOT NULL CHECK(status IN ('active','revoked')),
 created_at TEXT NOT NULL
);
CREATE TABLE nexus_alpha_settings (
 id INTEGER PRIMARY KEY CHECK(id=1),
 enforced INTEGER NOT NULL DEFAULT 0 CHECK(enforced IN (0,1)),
 registration_mode TEXT NOT NULL CHECK(registration_mode IN ('open','invite_only')),
 limit_enabled INTEGER NOT NULL DEFAULT 1 CHECK(limit_enabled IN (0,1)),
 max_testers INTEGER NOT NULL CHECK(max_testers BETWEEN 1 AND 10000),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>0)
);
INSERT INTO nexus_alpha_settings(id,enforced,registration_mode,max_testers) VALUES(1,0,'invite_only',10);
CREATE TABLE nexus_alpha_members (
 account_id TEXT PRIMARY KEY REFERENCES account_subjects(id) ON DELETE RESTRICT,
 state TEXT NOT NULL CHECK(state IN ('active','invited','blocked','removed')),
 reserved_until TEXT,
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
 reason TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 CHECK(state<>'invited' OR reserved_until IS NOT NULL)
);
CREATE TABLE nexus_account_profiles (
 account_id TEXT PRIMARY KEY REFERENCES account_subjects(id) ON DELETE RESTRICT,
 username TEXT NOT NULL UNIQUE COLLATE NOCASE
  CHECK(length(username) BETWEEN 3 AND 32 AND username=lower(username) AND substr(username,1,1) GLOB '[a-z]' AND username NOT GLOB '*[^a-z0-9._-]*'
   AND username NOT IN('admin','administrator','root','owner','system','support','nexus','api','security','login')),
 created_at TEXT NOT NULL
);
CREATE TABLE nexus_admin_invites (
 token_hash TEXT PRIMARY KEY REFERENCES nexus_passkey_invites(token_hash) ON DELETE RESTRICT,
 account_id TEXT NOT NULL UNIQUE REFERENCES account_subjects(id) ON DELETE RESTRICT,
 kind TEXT NOT NULL DEFAULT 'admin' CHECK(kind IN ('admin','public')),
 created_by TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('ready','revoked','accepted')),
 created_at TEXT NOT NULL
);
CREATE TABLE nexus_invite_enrollments (
 -- Pending profile choices expire with their unconsumed WebAuthn challenge.
 challenge_id TEXT PRIMARY KEY REFERENCES nexus_passkey_challenges(id) ON DELETE CASCADE,
 token_hash TEXT NOT NULL REFERENCES nexus_admin_invites(token_hash) ON DELETE RESTRICT,
 username TEXT NOT NULL,
 display_name TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE TABLE nexus_admin_nonces (nonce TEXT PRIMARY KEY,expires_at TEXT NOT NULL);
CREATE TABLE nexus_admin_rate_limits (
 scope TEXT NOT NULL,bucket INTEGER NOT NULL,used INTEGER NOT NULL CHECK(used BETWEEN 1 AND 120),
 PRIMARY KEY(scope,bucket)
);
CREATE TABLE nexus_admin_write_guards (
 request_id TEXT NOT NULL,phase TEXT NOT NULL CHECK(phase IN ('before','after')),
 valid INTEGER NOT NULL CHECK(valid=1),PRIMARY KEY(request_id,phase)
);
-- Audit stores opaque identifiers and fixed action names, never credentials or free-form content.
CREATE TABLE nexus_admin_audit (
 id TEXT PRIMARY KEY,actor_id TEXT NOT NULL,session_id TEXT NOT NULL,
 action TEXT NOT NULL CHECK(action IN ('settings','invite','block','remove','restore','admit','revoke-invite','purge')),
 target_id TEXT,created_at TEXT NOT NULL
);
CREATE TRIGGER nexus_admin_audit_no_update BEFORE UPDATE ON nexus_admin_audit
BEGIN SELECT RAISE(ABORT,'ADMIN_AUDIT_IMMUTABLE'); END;
CREATE TRIGGER nexus_admin_audit_no_delete BEFORE DELETE ON nexus_admin_audit
BEGIN SELECT RAISE(ABORT,'ADMIN_AUDIT_IMMUTABLE'); END;
CREATE TABLE nexus_admin_purge_approvals (
 token_hash TEXT PRIMARY KEY,actor_id TEXT NOT NULL,session_id TEXT NOT NULL,
 target_id TEXT NOT NULL,target_version INTEGER NOT NULL,scope_hash TEXT NOT NULL,
 expires_at TEXT NOT NULL,consumed_at TEXT
);
CREATE VIEW nexus_alpha_occupied AS
 SELECT m.account_id FROM nexus_alpha_members m
 WHERE (m.state='active' OR (m.state='invited' AND m.reserved_until>strftime('%Y-%m-%dT%H:%M:%fZ','now')))
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=m.account_id AND g.status='active');
CREATE TRIGGER nexus_alpha_quota_insert BEFORE INSERT ON nexus_alpha_members
WHEN (SELECT limit_enabled FROM nexus_alpha_settings WHERE id=1)=1
 AND (NEW.state='active' OR (NEW.state='invited' AND NEW.reserved_until>strftime('%Y-%m-%dT%H:%M:%fZ','now')))
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.account_id AND g.status='active')
 AND (SELECT count(*) FROM nexus_alpha_occupied WHERE account_id<>NEW.account_id)>=(SELECT max_testers FROM nexus_alpha_settings WHERE id=1)
BEGIN SELECT RAISE(ABORT,'ALPHA_CAPACITY_REACHED'); END;
CREATE TRIGGER nexus_alpha_quota_update BEFORE UPDATE ON nexus_alpha_members
WHEN (SELECT limit_enabled FROM nexus_alpha_settings WHERE id=1)=1
 AND (NEW.state='active' OR (NEW.state='invited' AND NEW.reserved_until>strftime('%Y-%m-%dT%H:%M:%fZ','now')))
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.account_id AND g.status='active')
 AND (SELECT count(*) FROM nexus_alpha_occupied WHERE account_id<>NEW.account_id)>=(SELECT max_testers FROM nexus_alpha_settings WHERE id=1)
BEGIN SELECT RAISE(ABORT,'ALPHA_CAPACITY_REACHED'); END;
CREATE TRIGGER nexus_alpha_limit_floor BEFORE UPDATE ON nexus_alpha_settings
WHEN NEW.limit_enabled=1 AND NEW.max_testers<(SELECT count(*) FROM nexus_alpha_occupied)
BEGIN SELECT RAISE(ABORT,'ALPHA_LIMIT_BELOW_OCCUPIED'); END;
CREATE TRIGGER nexus_alpha_admin_protection BEFORE UPDATE ON nexus_alpha_members
WHEN NEW.state<>'active' AND EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.account_id AND g.status='active')
BEGIN SELECT RAISE(ABORT,'ADMIN_ACCOUNT_PROTECTED'); END;
-- A blocked/removed participant keeps keys and data, but all session/token access is revoked atomically.
CREATE TRIGGER nexus_alpha_member_revoke AFTER UPDATE ON nexus_alpha_members
WHEN NEW.state IN ('blocked','removed')
BEGIN
 UPDATE account_sessions SET status='revoked',revoked_at=COALESCE(revoked_at,NEW.updated_at),revoked_reason='alpha-access-closed'
 WHERE subject_id=NEW.account_id AND status='active';
 UPDATE account_tokens SET status='revoked' WHERE subject_id=NEW.account_id AND status='active';
 UPDATE nexus_admin_invites SET state='revoked' WHERE account_id=NEW.account_id AND state='ready';
END;
CREATE TRIGGER nexus_alpha_enforcement_requires_admin BEFORE UPDATE OF enforced ON nexus_alpha_settings
WHEN NEW.enforced=1 AND NOT EXISTS(
 SELECT 1 FROM nexus_admin_grants g JOIN account_subjects a ON a.id=g.account_id AND a.status='active'
 JOIN login_methods lm ON lm.account_id=a.id AND lm.kind='passkey' AND lm.status='active'
 JOIN nexus_passkey_credentials pk ON pk.login_method_id=lm.id WHERE g.status='active')
BEGIN SELECT RAISE(ABORT,'VERIFIED_ADMIN_PASSKEY_REQUIRED'); END;
CREATE TRIGGER nexus_alpha_enforce_revoke AFTER UPDATE OF enforced ON nexus_alpha_settings
WHEN NEW.enforced=1
BEGIN
 UPDATE account_sessions SET status='revoked',revoked_at=COALESCE(revoked_at,strftime('%Y-%m-%dT%H:%M:%fZ','now')),revoked_reason='alpha-admission-required'
 WHERE status='active' AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=account_sessions.subject_id AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=account_sessions.subject_id AND m.state='active');
 UPDATE account_tokens SET status='revoked' WHERE status='active'
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=account_tokens.subject_id AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=account_tokens.subject_id AND m.state='active');
END;
CREATE TRIGGER nexus_alpha_session_admission BEFORE INSERT ON account_sessions
WHEN NEW.status='active' AND (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.subject_id AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.subject_id AND m.state='active')
BEGIN SELECT RAISE(ABORT,'ALPHA_ACCESS_REQUIRED'); END;
CREATE TRIGGER nexus_alpha_token_admission BEFORE INSERT ON account_tokens
WHEN NEW.status='active' AND (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.subject_id AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.subject_id AND m.state='active')
BEGIN SELECT RAISE(ABORT,'ALPHA_ACCESS_REQUIRED'); END;
CREATE TRIGGER nexus_alpha_token_update_admission BEFORE UPDATE OF status ON account_tokens
WHEN NEW.status='active' AND (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.subject_id AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.subject_id AND m.state='active')
BEGIN SELECT RAISE(ABORT,'ALPHA_ACCESS_REQUIRED'); END;
CREATE TRIGGER nexus_alpha_session_update_admission BEFORE UPDATE OF status ON account_sessions
WHEN NEW.status='active' AND (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.subject_id AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.subject_id AND m.state='active')
BEGIN SELECT RAISE(ABORT,'ALPHA_ACCESS_REQUIRED'); END;
CREATE TRIGGER nexus_admin_audit_authorization BEFORE INSERT ON nexus_admin_audit
WHEN NOT EXISTS(
 SELECT 1 FROM nexus_admin_grants g
 JOIN account_subjects a ON a.id=g.account_id AND a.status='active'
 JOIN account_sessions s ON s.subject_id=a.id AND s.id=NEW.session_id AND s.status='active' AND s.revoked_at IS NULL
 JOIN account_devices d ON d.id=s.device_id AND d.subject_id=a.id AND d.status='active'
 JOIN session_login_methods slm ON slm.session_id=s.id AND slm.account_id=a.id
 JOIN login_methods lm ON lm.id=slm.login_method_id AND lm.account_id=a.id AND lm.kind='passkey' AND lm.status='active'
 JOIN nexus_passkey_credentials pk ON pk.login_method_id=lm.id AND pk.account_id=a.id
 WHERE g.account_id=NEW.actor_id AND g.status='active' AND s.auth_strength='account-method-v1'
 AND s.idle_expires_at>NEW.created_at AND s.absolute_expires_at>NEW.created_at
 AND julianday(NEW.created_at)-julianday(s.created_at) BETWEEN 0 AND (5.0/1440)
)
BEGIN SELECT RAISE(ABORT,'ADMIN_FRESH_PASSKEY_REQUIRED'); END;
CREATE TRIGGER nexus_alpha_member_owner_immutable BEFORE UPDATE OF account_id ON nexus_alpha_members
WHEN NEW.account_id IS NOT OLD.account_id
BEGIN SELECT RAISE(ABORT,'ALPHA_MEMBER_BINDING_IMMUTABLE'); END;
CREATE TRIGGER nexus_alpha_enrollment_admission BEFORE INSERT ON nexus_passkey_receipts
WHEN NEW.action='register' AND (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.account_id AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.account_id AND m.state='active')
BEGIN SELECT RAISE(ABORT,'ALPHA_ACCESS_REQUIRED'); END;
CREATE TRIGGER nexus_alpha_managed_enrollment BEFORE INSERT ON nexus_passkey_receipts
WHEN NEW.action='register' AND EXISTS(SELECT 1 FROM nexus_invite_enrollments e WHERE e.challenge_id=NEW.challenge_id)
 AND NOT EXISTS(
 SELECT 1 FROM nexus_invite_enrollments e
 JOIN nexus_admin_invites i ON i.token_hash=e.token_hash AND i.state='accepted' AND i.account_id=NEW.account_id
 JOIN nexus_passkey_invites p ON p.token_hash=i.token_hash AND p.account_id=i.account_id AND p.commit_id=NEW.id AND p.consumed_at=NEW.created_at AND p.expires_at>NEW.created_at
 JOIN nexus_account_profiles profile ON profile.account_id=i.account_id AND profile.username=e.username
 JOIN account_subjects a ON a.id=i.account_id AND a.display_name=e.display_name
 JOIN nexus_alpha_members m ON m.account_id=a.id AND m.state='active'
 WHERE e.challenge_id=NEW.challenge_id)
BEGIN SELECT RAISE(ABORT,'INVITATION_PROFILE_COMMIT_REJECTED'); END;
-- A public reservation is an internal, short-lived bootstrap invitation. It is
-- never returned to the browser. Switching back to testing also closes pending
-- public ceremonies, including a mode change racing their final transaction.
CREATE TRIGGER nexus_public_invite_policy BEFORE INSERT ON nexus_admin_invites
WHEN NEW.kind='public' AND NOT EXISTS(
 SELECT 1 FROM nexus_alpha_settings WHERE id=1 AND enforced=1 AND registration_mode='open')
BEGIN SELECT RAISE(ABORT,'REGISTRATION_CLOSED'); END;
CREATE TRIGGER nexus_public_invite_pending_limit BEFORE INSERT ON nexus_admin_invites
WHEN NEW.kind='public' AND (SELECT count(*) FROM nexus_admin_invites i JOIN nexus_passkey_invites p ON p.token_hash=i.token_hash
 WHERE i.kind='public' AND i.state='ready' AND p.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now'))>=200
BEGIN SELECT RAISE(ABORT,'PUBLIC_REGISTRATION_RATE_LIMITED'); END;
CREATE TRIGGER nexus_public_enrollment_policy BEFORE INSERT ON nexus_passkey_receipts
WHEN NEW.action='register' AND EXISTS(
 SELECT 1 FROM nexus_invite_enrollments e JOIN nexus_admin_invites i ON i.token_hash=e.token_hash
 WHERE e.challenge_id=NEW.challenge_id AND i.kind='public')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_settings WHERE id=1 AND enforced=1 AND registration_mode='open')
BEGIN SELECT RAISE(ABORT,'REGISTRATION_CLOSED'); END;
CREATE TRIGGER nexus_admin_invite_binding_immutable BEFORE UPDATE ON nexus_admin_invites
WHEN NEW.token_hash IS NOT OLD.token_hash OR NEW.account_id IS NOT OLD.account_id OR NEW.created_by IS NOT OLD.created_by OR NEW.kind IS NOT OLD.kind
 OR (OLD.state<>'ready' AND NEW.state<>OLD.state)
BEGIN SELECT RAISE(ABORT,'INVITATION_BINDING_IMMUTABLE'); END;
CREATE TRIGGER nexus_invite_profile_immutable BEFORE UPDATE ON nexus_invite_enrollments
BEGIN SELECT RAISE(ABORT,'INVITATION_PROFILE_IMMUTABLE'); END;

CREATE TRIGGER nexus_alpha_workspace_write_insert BEFORE INSERT ON workspaces
WHEN (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.owner_subject_id AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.owner_subject_id AND m.state='active')
BEGIN SELECT RAISE(ABORT,'ALPHA_WRITE_ACCESS_REQUIRED'); END;



CREATE TRIGGER nexus_alpha_project_write_insert BEFORE INSERT ON projects
WHEN (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.owner_subject_id AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.owner_subject_id AND m.state='active')
BEGIN SELECT RAISE(ABORT,'ALPHA_WRITE_ACCESS_REQUIRED'); END;



CREATE TRIGGER nexus_alpha_snapshot_write_insert BEFORE INSERT ON project_snapshots
WHEN (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NEW.created_by<>'deleted-account'
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.created_by AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.created_by AND m.state='active')
BEGIN SELECT RAISE(ABORT,'ALPHA_WRITE_ACCESS_REQUIRED'); END;

CREATE TRIGGER nexus_alpha_snapshot_write_update BEFORE UPDATE ON project_snapshots
WHEN (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NEW.created_by<>'deleted-account'
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.created_by AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.created_by AND m.state='active')
BEGIN SELECT RAISE(ABORT,'ALPHA_WRITE_ACCESS_REQUIRED'); END;

CREATE TRIGGER nexus_alpha_revision_write_insert BEFORE INSERT ON project_revisions
WHEN (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NEW.created_by<>'deleted-account'
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.created_by AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.created_by AND m.state='active')
BEGIN SELECT RAISE(ABORT,'ALPHA_WRITE_ACCESS_REQUIRED'); END;

CREATE TRIGGER nexus_alpha_revision_write_update BEFORE UPDATE ON project_revisions
WHEN (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NEW.created_by<>'deleted-account'
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.created_by AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.created_by AND m.state='active')
BEGIN SELECT RAISE(ABORT,'ALPHA_WRITE_ACCESS_REQUIRED'); END;

CREATE TRIGGER nexus_alpha_checkpoint_write_insert BEFORE INSERT ON project_checkpoints
WHEN (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NEW.created_by<>'deleted-account'
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.created_by AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.created_by AND m.state='active')
BEGIN SELECT RAISE(ABORT,'ALPHA_WRITE_ACCESS_REQUIRED'); END;

CREATE TRIGGER nexus_alpha_checkpoint_write_update BEFORE UPDATE ON project_checkpoints
WHEN (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NEW.created_by<>'deleted-account'
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.created_by AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.created_by AND m.state='active')
BEGIN SELECT RAISE(ABORT,'ALPHA_WRITE_ACCESS_REQUIRED'); END;

CREATE TRIGGER nexus_alpha_project_audit_write_insert BEFORE INSERT ON audit_events
WHEN (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.actor_subject_id AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.actor_subject_id AND m.state='active')
BEGIN SELECT RAISE(ABORT,'ALPHA_WRITE_ACCESS_REQUIRED'); END;

CREATE TRIGGER nexus_alpha_project_audit_write_update BEFORE UPDATE ON audit_events
WHEN (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.actor_subject_id AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.actor_subject_id AND m.state='active')
BEGIN SELECT RAISE(ABORT,'ALPHA_WRITE_ACCESS_REQUIRED'); END;

CREATE TRIGGER nexus_alpha_feedback_write_insert BEFORE INSERT ON feedback_items
WHEN (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.author_id AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.author_id AND m.state='active')
BEGIN SELECT RAISE(ABORT,'ALPHA_WRITE_ACCESS_REQUIRED'); END;

CREATE TRIGGER nexus_alpha_feedback_write_update BEFORE UPDATE ON feedback_items
WHEN (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.author_id AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.author_id AND m.state='active')
BEGIN SELECT RAISE(ABORT,'ALPHA_WRITE_ACCESS_REQUIRED'); END;
