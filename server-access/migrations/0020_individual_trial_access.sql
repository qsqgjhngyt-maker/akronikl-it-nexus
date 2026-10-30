ALTER TABLE nexus_alpha_settings ADD COLUMN default_trial_minutes INTEGER DEFAULT 10080 CHECK(default_trial_minutes IS NULL OR default_trial_minutes BETWEEN 60 AND 525600);
ALTER TABLE nexus_alpha_settings ADD COLUMN default_invitation_minutes INTEGER NOT NULL DEFAULT 1440 CHECK(default_invitation_minutes BETWEEN 10 AND 10080);

-- Existing accounts keep their current unlimited access. New trials are opt-in.
ALTER TABLE nexus_alpha_members ADD COLUMN trial_minutes INTEGER CHECK(trial_minutes IS NULL OR trial_minutes BETWEEN 60 AND 525600);
ALTER TABLE nexus_alpha_members ADD COLUMN first_login_at TEXT;
ALTER TABLE nexus_alpha_members ADD COLUMN access_expires_at TEXT;

DROP VIEW nexus_alpha_occupied;
CREATE VIEW nexus_alpha_occupied AS
 SELECT m.account_id FROM nexus_alpha_members m
 WHERE (m.state='active' AND (m.access_expires_at IS NULL OR m.access_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')) OR (m.state='invited' AND m.reserved_until>strftime('%Y-%m-%dT%H:%M:%fZ','now')))
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=m.account_id AND g.status='active');

DROP TRIGGER nexus_alpha_quota_insert;
CREATE TRIGGER nexus_alpha_quota_insert BEFORE INSERT ON nexus_alpha_members
WHEN (SELECT limit_enabled FROM nexus_alpha_settings WHERE id=1)=1
 AND (NEW.state='active' AND (NEW.access_expires_at IS NULL OR NEW.access_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')) OR (NEW.state='invited' AND NEW.reserved_until>strftime('%Y-%m-%dT%H:%M:%fZ','now')))
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.account_id AND g.status='active')
 AND (SELECT count(*) FROM nexus_alpha_occupied WHERE account_id<>NEW.account_id)>=(SELECT max_testers FROM nexus_alpha_settings WHERE id=1)
BEGIN SELECT RAISE(ABORT,'ALPHA_CAPACITY_REACHED'); END;

DROP TRIGGER nexus_alpha_quota_update;
CREATE TRIGGER nexus_alpha_quota_update BEFORE UPDATE ON nexus_alpha_members
WHEN (SELECT limit_enabled FROM nexus_alpha_settings WHERE id=1)=1
 AND (NEW.state='active' AND (NEW.access_expires_at IS NULL OR NEW.access_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')) OR (NEW.state='invited' AND NEW.reserved_until>strftime('%Y-%m-%dT%H:%M:%fZ','now')))
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.account_id AND g.status='active')
 AND (SELECT count(*) FROM nexus_alpha_occupied WHERE account_id<>NEW.account_id)>=(SELECT max_testers FROM nexus_alpha_settings WHERE id=1)
BEGIN SELECT RAISE(ABORT,'ALPHA_CAPACITY_REACHED'); END;

DROP TRIGGER nexus_alpha_enforce_revoke;
CREATE TRIGGER nexus_alpha_enforce_revoke AFTER UPDATE OF enforced ON nexus_alpha_settings
WHEN NEW.enforced=1
BEGIN
 UPDATE account_sessions SET status='revoked',revoked_at=COALESCE(revoked_at,strftime('%Y-%m-%dT%H:%M:%fZ','now')),revoked_reason='alpha-admission-required'
 WHERE status='active' AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=account_sessions.subject_id AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=account_sessions.subject_id AND m.state='active' AND (m.access_expires_at IS NULL OR m.access_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')));
 UPDATE account_tokens SET status='revoked' WHERE status='active'
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=account_tokens.subject_id AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=account_tokens.subject_id AND m.state='active' AND (m.access_expires_at IS NULL OR m.access_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')));
END;

DROP TRIGGER nexus_alpha_session_admission;
CREATE TRIGGER nexus_alpha_session_admission BEFORE INSERT ON account_sessions
WHEN NEW.status='active' AND (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.subject_id AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.subject_id AND m.state='active' AND (m.access_expires_at IS NULL OR m.access_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')))
BEGIN SELECT RAISE(ABORT,'ALPHA_ACCESS_REQUIRED'); END;

DROP TRIGGER nexus_alpha_token_admission;
CREATE TRIGGER nexus_alpha_token_admission BEFORE INSERT ON account_tokens
WHEN NEW.status='active' AND (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.subject_id AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.subject_id AND m.state='active' AND (m.access_expires_at IS NULL OR m.access_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')))
BEGIN SELECT RAISE(ABORT,'ALPHA_ACCESS_REQUIRED'); END;

DROP TRIGGER nexus_alpha_token_update_admission;
CREATE TRIGGER nexus_alpha_token_update_admission BEFORE UPDATE OF status ON account_tokens
WHEN NEW.status='active' AND (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.subject_id AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.subject_id AND m.state='active' AND (m.access_expires_at IS NULL OR m.access_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')))
BEGIN SELECT RAISE(ABORT,'ALPHA_ACCESS_REQUIRED'); END;

DROP TRIGGER nexus_alpha_session_update_admission;
CREATE TRIGGER nexus_alpha_session_update_admission BEFORE UPDATE OF status ON account_sessions
WHEN NEW.status='active' AND (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.subject_id AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.subject_id AND m.state='active' AND (m.access_expires_at IS NULL OR m.access_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')))
BEGIN SELECT RAISE(ABORT,'ALPHA_ACCESS_REQUIRED'); END;

DROP TRIGGER nexus_alpha_enrollment_admission;
CREATE TRIGGER nexus_alpha_enrollment_admission BEFORE INSERT ON nexus_passkey_receipts
WHEN NEW.action='register' AND (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.account_id AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.account_id AND m.state='active' AND (m.access_expires_at IS NULL OR m.access_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')))
BEGIN SELECT RAISE(ABORT,'ALPHA_ACCESS_REQUIRED'); END;

DROP TRIGGER nexus_alpha_managed_enrollment;
CREATE TRIGGER nexus_alpha_managed_enrollment BEFORE INSERT ON nexus_passkey_receipts
WHEN NEW.action='register' AND EXISTS(SELECT 1 FROM nexus_invite_enrollments e WHERE e.challenge_id=NEW.challenge_id)
 AND NOT EXISTS(
 SELECT 1 FROM nexus_invite_enrollments e
 JOIN nexus_admin_invites i ON i.token_hash=e.token_hash AND i.state='accepted' AND i.account_id=NEW.account_id
 JOIN nexus_passkey_invites p ON p.token_hash=i.token_hash AND p.account_id=i.account_id AND p.commit_id=NEW.id AND p.consumed_at=NEW.created_at AND p.expires_at>NEW.created_at
 JOIN nexus_account_profiles profile ON profile.account_id=i.account_id AND profile.username=e.username
 JOIN account_subjects a ON a.id=i.account_id AND a.display_name=e.display_name
 JOIN nexus_alpha_members m ON m.account_id=a.id AND m.state='active' AND (m.access_expires_at IS NULL OR m.access_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now'))
 WHERE e.challenge_id=NEW.challenge_id)
BEGIN SELECT RAISE(ABORT,'INVITATION_PROFILE_COMMIT_REJECTED'); END;

DROP TRIGGER nexus_alpha_workspace_write_insert;
CREATE TRIGGER nexus_alpha_workspace_write_insert BEFORE INSERT ON workspaces
WHEN (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.owner_subject_id AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.owner_subject_id AND m.state='active' AND (m.access_expires_at IS NULL OR m.access_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')))
BEGIN SELECT RAISE(ABORT,'ALPHA_WRITE_ACCESS_REQUIRED'); END;

DROP TRIGGER nexus_alpha_project_write_insert;
CREATE TRIGGER nexus_alpha_project_write_insert BEFORE INSERT ON projects
WHEN (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.owner_subject_id AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.owner_subject_id AND m.state='active' AND (m.access_expires_at IS NULL OR m.access_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')))
BEGIN SELECT RAISE(ABORT,'ALPHA_WRITE_ACCESS_REQUIRED'); END;

DROP TRIGGER nexus_alpha_snapshot_write_insert;
CREATE TRIGGER nexus_alpha_snapshot_write_insert BEFORE INSERT ON project_snapshots
WHEN (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NEW.created_by<>'deleted-account'
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.created_by AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.created_by AND m.state='active' AND (m.access_expires_at IS NULL OR m.access_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')))
BEGIN SELECT RAISE(ABORT,'ALPHA_WRITE_ACCESS_REQUIRED'); END;

DROP TRIGGER nexus_alpha_snapshot_write_update;
CREATE TRIGGER nexus_alpha_snapshot_write_update BEFORE UPDATE ON project_snapshots
WHEN (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NEW.created_by<>'deleted-account'
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.created_by AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.created_by AND m.state='active' AND (m.access_expires_at IS NULL OR m.access_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')))
BEGIN SELECT RAISE(ABORT,'ALPHA_WRITE_ACCESS_REQUIRED'); END;

DROP TRIGGER nexus_alpha_revision_write_insert;
CREATE TRIGGER nexus_alpha_revision_write_insert BEFORE INSERT ON project_revisions
WHEN (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NEW.created_by<>'deleted-account'
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.created_by AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.created_by AND m.state='active' AND (m.access_expires_at IS NULL OR m.access_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')))
BEGIN SELECT RAISE(ABORT,'ALPHA_WRITE_ACCESS_REQUIRED'); END;

DROP TRIGGER nexus_alpha_revision_write_update;
CREATE TRIGGER nexus_alpha_revision_write_update BEFORE UPDATE ON project_revisions
WHEN (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NEW.created_by<>'deleted-account'
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.created_by AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.created_by AND m.state='active' AND (m.access_expires_at IS NULL OR m.access_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')))
BEGIN SELECT RAISE(ABORT,'ALPHA_WRITE_ACCESS_REQUIRED'); END;

DROP TRIGGER nexus_alpha_checkpoint_write_insert;
CREATE TRIGGER nexus_alpha_checkpoint_write_insert BEFORE INSERT ON project_checkpoints
WHEN (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NEW.created_by<>'deleted-account'
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.created_by AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.created_by AND m.state='active' AND (m.access_expires_at IS NULL OR m.access_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')))
BEGIN SELECT RAISE(ABORT,'ALPHA_WRITE_ACCESS_REQUIRED'); END;

DROP TRIGGER nexus_alpha_checkpoint_write_update;
CREATE TRIGGER nexus_alpha_checkpoint_write_update BEFORE UPDATE ON project_checkpoints
WHEN (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NEW.created_by<>'deleted-account'
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.created_by AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.created_by AND m.state='active' AND (m.access_expires_at IS NULL OR m.access_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')))
BEGIN SELECT RAISE(ABORT,'ALPHA_WRITE_ACCESS_REQUIRED'); END;

DROP TRIGGER nexus_alpha_project_audit_write_insert;
CREATE TRIGGER nexus_alpha_project_audit_write_insert BEFORE INSERT ON audit_events
WHEN (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.actor_subject_id AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.actor_subject_id AND m.state='active' AND (m.access_expires_at IS NULL OR m.access_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')))
BEGIN SELECT RAISE(ABORT,'ALPHA_WRITE_ACCESS_REQUIRED'); END;

DROP TRIGGER nexus_alpha_project_audit_write_update;
CREATE TRIGGER nexus_alpha_project_audit_write_update BEFORE UPDATE ON audit_events
WHEN (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.actor_subject_id AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.actor_subject_id AND m.state='active' AND (m.access_expires_at IS NULL OR m.access_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')))
BEGIN SELECT RAISE(ABORT,'ALPHA_WRITE_ACCESS_REQUIRED'); END;

DROP TRIGGER nexus_alpha_feedback_write_insert;
CREATE TRIGGER nexus_alpha_feedback_write_insert BEFORE INSERT ON feedback_items
WHEN (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.author_id AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.author_id AND m.state='active' AND (m.access_expires_at IS NULL OR m.access_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')))
BEGIN SELECT RAISE(ABORT,'ALPHA_WRITE_ACCESS_REQUIRED'); END;

DROP TRIGGER nexus_alpha_feedback_write_update;
CREATE TRIGGER nexus_alpha_feedback_write_update BEFORE UPDATE ON feedback_items
WHEN (SELECT enforced FROM nexus_alpha_settings WHERE id=1)=1
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=NEW.author_id AND g.status='active')
 AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m WHERE m.account_id=NEW.author_id AND m.state='active' AND (m.access_expires_at IS NULL OR m.access_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')))
BEGIN SELECT RAISE(ABORT,'ALPHA_WRITE_ACCESS_REQUIRED'); END;

-- A completed, verified login binding starts the clock in the SAME issuance transaction.
-- Registering a key, fetching options or a failed/rolled-back login cannot start it.
CREATE TRIGGER nexus_alpha_trial_first_login AFTER INSERT ON session_login_methods
WHEN EXISTS(SELECT 1 FROM account_sessions s JOIN login_methods l ON l.id=NEW.login_method_id AND l.account_id=NEW.account_id AND l.status='active' WHERE s.id=NEW.session_id AND s.subject_id=NEW.account_id AND s.status='active' AND s.auth_strength='account-method-v1' AND s.revoked_at IS NULL)
BEGIN
 UPDATE nexus_alpha_members SET first_login_at=(SELECT created_at FROM account_sessions WHERE id=NEW.session_id),
 access_expires_at=strftime('%Y-%m-%dT%H:%M:%fZ',julianday((SELECT created_at FROM account_sessions WHERE id=NEW.session_id))+trial_minutes/1440.0),version=version+1,updated_at=(SELECT created_at FROM account_sessions WHERE id=NEW.session_id)
 WHERE account_id=NEW.account_id AND state='active' AND trial_minutes IS NOT NULL AND first_login_at IS NULL;
END;
