-- Добавочный OAuth-контракт. Не содержит адресов владельца, аккаунтов или permissions.
CREATE TABLE nexus_oauth_service_nonces (nonce TEXT PRIMARY KEY CHECK(length(nonce)=32), expires_at TEXT NOT NULL);
CREATE TABLE nexus_oauth_rate_limits (
 scope_hash TEXT NOT NULL, bucket INTEGER NOT NULL, used INTEGER NOT NULL CHECK(used BETWEEN 1 AND 200),
 PRIMARY KEY(scope_hash,bucket)
);
CREATE TABLE nexus_oauth_transactions (
 id TEXT PRIMARY KEY,
 state_hash TEXT NOT NULL UNIQUE CHECK(length(state_hash)=64),
 flow_hash TEXT NOT NULL CHECK(length(flow_hash)=64),
 provider TEXT NOT NULL CHECK(provider IN ('google','yandex','vk','mailru')),
 intent TEXT NOT NULL CHECK(intent IN ('login','link')),
 code_verifier TEXT, nonce TEXT,
 authorized_account_id TEXT REFERENCES account_subjects(id) ON DELETE RESTRICT,
 authorized_session_id TEXT REFERENCES account_sessions(id) ON DELETE RESTRICT,
 created_at TEXT NOT NULL, expires_at TEXT NOT NULL,
 claimed_at TEXT, claim_id TEXT UNIQUE, completed_at TEXT, commit_id TEXT UNIQUE,
 CHECK((intent='login' AND authorized_account_id IS NULL AND authorized_session_id IS NULL)
   OR (intent='link' AND authorized_account_id IS NOT NULL AND authorized_session_id IS NOT NULL)),
 CHECK((claimed_at IS NULL AND claim_id IS NULL) OR (claimed_at IS NOT NULL AND claim_id IS NOT NULL)),
 CHECK((completed_at IS NULL AND commit_id IS NULL) OR (completed_at IS NOT NULL AND commit_id IS NOT NULL AND claimed_at IS NOT NULL))
);
CREATE INDEX nexus_oauth_transaction_expiry ON nexus_oauth_transactions(expires_at);
CREATE TRIGGER nexus_oauth_transaction_binding_immutable
BEFORE UPDATE OF id,state_hash,flow_hash,provider,intent,authorized_account_id,authorized_session_id,created_at,expires_at ON nexus_oauth_transactions
WHEN NEW.id IS NOT OLD.id OR NEW.state_hash IS NOT OLD.state_hash OR NEW.flow_hash IS NOT OLD.flow_hash
 OR NEW.provider IS NOT OLD.provider OR NEW.intent IS NOT OLD.intent
 OR NEW.authorized_account_id IS NOT OLD.authorized_account_id OR NEW.authorized_session_id IS NOT OLD.authorized_session_id
 OR NEW.created_at IS NOT OLD.created_at OR NEW.expires_at IS NOT OLD.expires_at
BEGIN SELECT RAISE(ABORT,'OAUTH_TRANSACTION_BINDING_IMMUTABLE'); END;
CREATE TRIGGER nexus_oauth_transaction_terminal
BEFORE UPDATE ON nexus_oauth_transactions
WHEN (OLD.claimed_at IS NOT NULL AND (NEW.claimed_at IS NOT OLD.claimed_at OR NEW.claim_id IS NOT OLD.claim_id))
 OR (OLD.completed_at IS NOT NULL AND (NEW.completed_at IS NOT OLD.completed_at OR NEW.commit_id IS NOT OLD.commit_id))
BEGIN SELECT RAISE(ABORT,'OAUTH_TRANSACTION_TERMINAL'); END;

CREATE TABLE nexus_oauth_account_policies (
 account_id TEXT PRIMARY KEY REFERENCES account_subjects(id) ON DELETE RESTRICT,
 status TEXT NOT NULL CHECK(status IN ('pending','enforced')),
 created_at TEXT NOT NULL, activated_at TEXT,
 CHECK((status='pending' AND activated_at IS NULL) OR (status='enforced' AND activated_at IS NOT NULL))
);
CREATE TABLE nexus_oauth_allowed_emails (
 account_id TEXT NOT NULL REFERENCES nexus_oauth_account_policies(account_id) ON DELETE RESTRICT,
 email_hash TEXT NOT NULL CHECK(length(email_hash)=64), created_at TEXT NOT NULL,
 PRIMARY KEY(account_id,email_hash)
);
CREATE TABLE nexus_oauth_receipts (
 id TEXT PRIMARY KEY,
 tx_id TEXT NOT NULL UNIQUE REFERENCES nexus_oauth_transactions(id) ON DELETE RESTRICT,
 flow_hash TEXT NOT NULL CHECK(length(flow_hash)=64),
 account_id TEXT NOT NULL REFERENCES account_subjects(id) ON DELETE RESTRICT,
 login_method_id TEXT NOT NULL REFERENCES login_methods(id) ON DELETE RESTRICT,
 session_id TEXT NOT NULL UNIQUE REFERENCES account_sessions(id) ON DELETE RESTRICT,
 device_id TEXT NOT NULL REFERENCES account_devices(id) ON DELETE RESTRICT,
 provider TEXT NOT NULL, issuer TEXT NOT NULL, provider_subject TEXT NOT NULL,
 email_hash TEXT CHECK(email_hash IS NULL OR length(email_hash)=64),
 email_verified INTEGER NOT NULL CHECK(email_verified IN (0,1)),
 new_account INTEGER NOT NULL CHECK(new_account IN (0,1)), created_at TEXT NOT NULL,
 CHECK(email_verified=0 OR email_hash IS NOT NULL)
);
CREATE TABLE nexus_oauth_verified_emails (
 account_id TEXT NOT NULL REFERENCES account_subjects(id) ON DELETE RESTRICT,
 email_hash TEXT NOT NULL CHECK(length(email_hash)=64),
 provider TEXT NOT NULL, issuer TEXT NOT NULL, provider_subject TEXT NOT NULL,
 receipt_id TEXT NOT NULL REFERENCES nexus_oauth_receipts(id) ON DELETE RESTRICT,
 verified_at TEXT NOT NULL,
 PRIMARY KEY(account_id,email_hash,provider,issuer,provider_subject)
);
CREATE TRIGGER nexus_oauth_receipt_immutable BEFORE UPDATE ON nexus_oauth_receipts
BEGIN SELECT RAISE(ABORT,'OAUTH_RECEIPT_IMMUTABLE'); END;
CREATE TRIGGER nexus_oauth_receipt_commit_guard
BEFORE INSERT ON nexus_oauth_receipts WHEN NOT EXISTS(
 SELECT 1 FROM nexus_oauth_transactions t
 JOIN oauth_identities oi ON oi.provider=NEW.provider AND oi.issuer=NEW.issuer AND oi.provider_subject=NEW.provider_subject
 JOIN login_methods lm ON lm.id=oi.login_method_id AND lm.account_id=oi.account_id AND lm.kind='oauth' AND lm.status='active'
 JOIN account_subjects a ON a.id=oi.account_id AND a.status='active'
 JOIN account_sessions s ON s.id=NEW.session_id AND s.subject_id=a.id
 JOIN account_devices d ON d.id=s.device_id AND d.subject_id=a.id AND d.status='active'
 JOIN session_login_methods slm ON slm.session_id=s.id AND slm.account_id=a.id AND slm.login_method_id=lm.id
 WHERE t.id=NEW.tx_id AND t.provider=NEW.provider AND t.flow_hash=NEW.flow_hash
 AND NEW.issuer=CASE NEW.provider WHEN 'google' THEN 'https://accounts.google.com'
  WHEN 'yandex' THEN 'https://login.yandex.ru' WHEN 'vk' THEN 'https://id.vk.ru'
  WHEN 'mailru' THEN 'https://oauth.mail.ru' ELSE '' END
 AND t.claimed_at IS NOT NULL AND t.completed_at=NEW.created_at AND t.commit_id=NEW.id AND t.expires_at>NEW.created_at
 AND t.code_verifier IS NULL AND t.nonce IS NULL
 AND a.id=NEW.account_id AND lm.id=NEW.login_method_id AND d.id=NEW.device_id
 AND s.status='active' AND s.auth_strength='account-method-v1' AND s.revoked_at IS NULL
 AND s.created_at=NEW.created_at AND d.first_seen_at=NEW.created_at
 AND s.idle_expires_at>NEW.created_at AND s.absolute_expires_at>NEW.created_at
 AND (t.intent='login' OR (t.authorized_account_id=a.id AND EXISTS(
  SELECT 1 FROM account_sessions prior
  JOIN account_devices pd ON pd.id=prior.device_id AND pd.subject_id=a.id AND pd.status='active'
  JOIN session_login_methods pslm ON pslm.session_id=prior.id AND pslm.account_id=a.id
  JOIN login_methods plm ON plm.id=pslm.login_method_id AND plm.account_id=a.id AND plm.kind='passkey' AND plm.status='active'
  JOIN nexus_passkey_credentials pk ON pk.login_method_id=plm.id AND pk.account_id=a.id
  WHERE prior.id=t.authorized_session_id AND prior.subject_id=a.id AND prior.status='active'
  AND prior.auth_strength='account-method-v1' AND prior.revoked_at IS NULL
  AND prior.idle_expires_at>NEW.created_at AND prior.absolute_expires_at>NEW.created_at
  AND julianday(NEW.created_at)-julianday(prior.created_at) BETWEEN 0 AND (5.0/1440)
 )))
 AND (NOT EXISTS(SELECT 1 FROM nexus_oauth_account_policies policy WHERE policy.account_id=a.id)
  OR (NEW.email_verified=1 AND EXISTS(SELECT 1 FROM nexus_oauth_allowed_emails allowed
    WHERE allowed.account_id=a.id AND allowed.email_hash=NEW.email_hash)))
 AND (NEW.new_account=0 OR (t.intent='login' AND NOT EXISTS(
  SELECT 1 FROM nexus_oauth_allowed_emails protected WHERE protected.email_hash=NEW.email_hash
 )))
)
BEGIN SELECT RAISE(ABORT,'OAUTH_ATOMIC_ISSUANCE_REJECTED'); END;
CREATE TRIGGER nexus_oauth_verified_email_insert_guard BEFORE INSERT ON nexus_oauth_verified_emails
WHEN NOT EXISTS(SELECT 1 FROM nexus_oauth_receipts r WHERE r.id=NEW.receipt_id
 AND r.account_id=NEW.account_id AND r.email_hash=NEW.email_hash AND r.email_verified=1
 AND r.provider=NEW.provider AND r.issuer=NEW.issuer AND r.provider_subject=NEW.provider_subject
 AND r.created_at=NEW.verified_at)
BEGIN SELECT RAISE(ABORT,'OAUTH_EMAIL_PROOF_REQUIRED'); END;
CREATE TRIGGER nexus_oauth_verified_email_update_guard BEFORE UPDATE ON nexus_oauth_verified_emails
WHEN NEW.account_id IS NOT OLD.account_id OR NEW.email_hash IS NOT OLD.email_hash OR NEW.provider IS NOT OLD.provider
 OR NEW.issuer IS NOT OLD.issuer OR NEW.provider_subject IS NOT OLD.provider_subject
 OR NOT EXISTS(SELECT 1 FROM nexus_oauth_receipts r WHERE r.id=NEW.receipt_id
  AND r.account_id=NEW.account_id AND r.email_hash=NEW.email_hash AND r.email_verified=1
  AND r.provider=NEW.provider AND r.issuer=NEW.issuer AND r.provider_subject=NEW.provider_subject
  AND r.created_at=NEW.verified_at)
BEGIN SELECT RAISE(ABORT,'OAUTH_EMAIL_PROOF_REQUIRED'); END;
CREATE TRIGGER nexus_oauth_policy_enforce_insert BEFORE INSERT ON nexus_oauth_account_policies
WHEN NEW.status='enforced' AND NOT EXISTS(
 SELECT 1 FROM nexus_oauth_verified_emails v JOIN nexus_oauth_allowed_emails e
 ON e.account_id=v.account_id AND e.email_hash=v.email_hash
 WHERE v.account_id=NEW.account_id)
BEGIN SELECT RAISE(ABORT,'OAUTH_VERIFIED_OWNER_EMAIL_REQUIRED'); END;
CREATE TRIGGER nexus_oauth_policy_enforce_update BEFORE UPDATE ON nexus_oauth_account_policies
WHEN NEW.account_id IS NOT OLD.account_id OR (NEW.status='enforced' AND NOT EXISTS(
 SELECT 1 FROM nexus_oauth_verified_emails v JOIN nexus_oauth_allowed_emails e
 ON e.account_id=v.account_id AND e.email_hash=v.email_hash
 JOIN oauth_identities oi ON oi.account_id=v.account_id AND oi.provider=v.provider AND oi.issuer=v.issuer AND oi.provider_subject=v.provider_subject
 JOIN login_methods lm ON lm.id=oi.login_method_id AND lm.status='active' AND lm.account_id=v.account_id
 WHERE v.account_id=NEW.account_id))
BEGIN SELECT RAISE(ABORT,'OAUTH_VERIFIED_OWNER_EMAIL_REQUIRED'); END;
