-- Defense in depth after review: immutable verified identity and no invitation
-- conversion via a stale/rolled-back Passkey application path.
CREATE TRIGGER nexus_password_identity_immutable BEFORE UPDATE ON nexus_password_credentials
WHEN NEW.account_id IS NOT OLD.account_id OR NEW.login_method_id IS NOT OLD.login_method_id
 OR NEW.email_hash IS NOT OLD.email_hash OR NEW.email_verified_at IS NOT OLD.email_verified_at
 OR NEW.algorithm IS NOT OLD.algorithm OR NEW.created_at IS NOT OLD.created_at
BEGIN SELECT RAISE(ABORT,'PASSWORD_IDENTITY_IMMUTABLE'); END;
CREATE TRIGGER nexus_password_version_reset_only BEFORE UPDATE OF version ON nexus_password_credentials
WHEN NEW.version<>OLD.version AND NEW.hash_b64=OLD.hash_b64 AND NEW.salt_b64=OLD.salt_b64
BEGIN SELECT RAISE(ABORT,'PASSWORD_VERSION_REQUIRES_RESET'); END;
CREATE TRIGGER nexus_password_no_passkey_invite BEFORE INSERT ON nexus_passkey_receipts
WHEN NEW.action='register' AND EXISTS(
 SELECT 1 FROM nexus_invite_enrollments e JOIN nexus_password_invite_emails p ON p.token_hash=e.token_hash
 WHERE e.challenge_id=NEW.challenge_id
)
BEGIN SELECT RAISE(ABORT,'PASSWORD_EMAIL_INVITATION_ONLY'); END;
