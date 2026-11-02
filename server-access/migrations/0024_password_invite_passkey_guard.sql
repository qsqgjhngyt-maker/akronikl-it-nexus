-- Also cover legacy registration that has no managed enrollment row.
DROP TRIGGER nexus_password_no_passkey_invite;
CREATE TRIGGER nexus_password_no_passkey_invite BEFORE INSERT ON nexus_passkey_receipts
WHEN NEW.action='register' AND (
 EXISTS(SELECT 1 FROM nexus_passkey_challenges c JOIN nexus_password_invite_emails p ON p.token_hash=c.invite_hash WHERE c.id=NEW.challenge_id)
 OR EXISTS(SELECT 1 FROM nexus_invite_enrollments e JOIN nexus_password_invite_emails p ON p.token_hash=e.token_hash WHERE e.challenge_id=NEW.challenge_id)
)
BEGIN SELECT RAISE(ABORT,'PASSWORD_EMAIL_INVITATION_ONLY'); END;
