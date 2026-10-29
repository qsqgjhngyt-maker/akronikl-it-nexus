-- COURSE-FINAL v1. Только новые сущности; прогресс/проекты/Identity не мигрируются.
CREATE TABLE IF NOT EXISTS nexus_assessment_usage (
 id INTEGER PRIMARY KEY CHECK(id=1), bytes INTEGER NOT NULL DEFAULT 0 CHECK(bytes BETWEEN 0 AND 134217728),
 attempts_count INTEGER NOT NULL DEFAULT 0 CHECK(attempts_count BETWEEN 0 AND 2000)
);
INSERT OR IGNORE INTO nexus_assessment_usage(id,bytes) VALUES(1,0);
-- Новый RPC replay namespace; старые nonces/индекс аварийного hotfix не трогаются.
CREATE TABLE IF NOT EXISTS nexus_assessment_nonces (
 nonce TEXT PRIMARY KEY,
 expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS nexus_assessment_nonce_expiry ON nexus_assessment_nonces(expires_at,nonce);
CREATE TABLE IF NOT EXISTS nexus_assessment_write_guards (
 request_id TEXT NOT NULL,
 phase TEXT NOT NULL CHECK(phase IN('assessment-open','assessment-track','assessment-begin','assessment-submit','assessment-checkpoint','assessment-withdraw','assessment-admin','assessment-review','assessment-put','assessment-appeal')),
 valid INTEGER NOT NULL CHECK(valid=1),
 PRIMARY KEY(request_id,phase)
);
CREATE TABLE IF NOT EXISTS nexus_assessment_audit (
 id TEXT PRIMARY KEY,
 actor_id TEXT NOT NULL,
 action TEXT NOT NULL CHECK(action IN('assessment-open','assessment-submit','assessment-checkpoint','assessment-assign','assessment-interrupt','assessment-review','assessment-appeal')),
 attempt_id TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS nexus_assessment_audit_attempt ON nexus_assessment_audit(attempt_id,created_at);
CREATE INDEX IF NOT EXISTS nexus_assessment_audit_actor ON nexus_assessment_audit(actor_id);
CREATE TABLE IF NOT EXISTS nexus_assessment_owners (
 account_id TEXT PRIMARY KEY REFERENCES account_subjects(id) ON DELETE CASCADE,
 bytes INTEGER NOT NULL DEFAULT 0 CHECK(bytes BETWEEN 0 AND 25165824),
 extra_attempts INTEGER NOT NULL DEFAULT 0 CHECK(extra_attempts BETWEEN 0 AND 8)
);
CREATE TABLE IF NOT EXISTS nexus_assessment_attempts (
 id TEXT PRIMARY KEY,
 account_id TEXT NOT NULL REFERENCES account_subjects(id) ON DELETE CASCADE,
 assessment_id TEXT NOT NULL CHECK(assessment_id='cpp.course-final.v1'),
 task_version TEXT NOT NULL CHECK(task_version='1.0.0'),
 rubric_version TEXT NOT NULL CHECK(rubric_version='1.0.0'),
 assessment_mode TEXT NOT NULL DEFAULT 'automatic' CHECK(assessment_mode IN('automatic','expert')),
 variant TEXT NOT NULL CHECK(variant IN('A','B','C')),
 track_id TEXT NOT NULL CHECK(track_id IN('taskflow','finance','logscope')),
 ordinal INTEGER NOT NULL CHECK(ordinal BETWEEN 1 AND 1000),
 parent_attempt_id TEXT,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN('draft','submitted','reviewed','assessed','interrupted')),
 reviewer_id TEXT,
 upload_id TEXT,
 snapshot_hash TEXT,
 latest_review_id TEXT,
 completeness TEXT,
 create_request_id TEXT NOT NULL UNIQUE,
 created_at TEXT NOT NULL,
 submitted_at TEXT,
 interrupt_reason TEXT,
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>=1),
 UNIQUE(account_id,ordinal)
);
CREATE UNIQUE INDEX IF NOT EXISTS nexus_assessment_one_draft ON nexus_assessment_attempts(account_id) WHERE status='draft';
CREATE INDEX IF NOT EXISTS nexus_assessment_owner_page ON nexus_assessment_attempts(account_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS nexus_assessment_reviewer_page ON nexus_assessment_attempts(reviewer_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS nexus_assessment_status_page ON nexus_assessment_attempts(status,created_at DESC,id DESC);
CREATE TRIGGER IF NOT EXISTS nexus_assessment_attempt_count_insert AFTER INSERT ON nexus_assessment_attempts BEGIN
 UPDATE nexus_assessment_usage SET attempts_count=attempts_count+1 WHERE id=1;
END;
CREATE TRIGGER IF NOT EXISTS nexus_assessment_attempt_count_delete AFTER DELETE ON nexus_assessment_attempts BEGIN
 UPDATE nexus_assessment_usage SET attempts_count=attempts_count-1 WHERE id=1;
END;
CREATE TABLE IF NOT EXISTS nexus_assessment_uploads (
 id TEXT PRIMARY KEY,
 attempt_id TEXT NOT NULL REFERENCES nexus_assessment_attempts(id) ON DELETE CASCADE,
 snapshot_hash TEXT NOT NULL CHECK(length(snapshot_hash)=64),
 total_bytes INTEGER NOT NULL CHECK(total_bytes BETWEEN 1 AND 6291456),
 chunk_count INTEGER NOT NULL CHECK(chunk_count BETWEEN 1 AND 192),
 created_at TEXT NOT NULL,
 UNIQUE(attempt_id,snapshot_hash)
);
CREATE INDEX IF NOT EXISTS nexus_assessment_upload_attempt ON nexus_assessment_uploads(attempt_id);
CREATE TABLE IF NOT EXISTS nexus_assessment_parts (
 upload_id TEXT NOT NULL REFERENCES nexus_assessment_uploads(id) ON DELETE CASCADE,
 account_id TEXT NOT NULL REFERENCES nexus_assessment_owners(account_id) ON DELETE CASCADE,
 part_index INTEGER NOT NULL CHECK(part_index BETWEEN 0 AND 191),
 bytes INTEGER NOT NULL CHECK(bytes BETWEEN 1 AND 32768),
 sha256 TEXT NOT NULL CHECK(length(sha256)=64),
 data BLOB NOT NULL CHECK(length(data)=bytes),
 PRIMARY KEY(upload_id,part_index)
);
CREATE INDEX IF NOT EXISTS nexus_assessment_parts_owner ON nexus_assessment_parts(account_id);
CREATE TRIGGER IF NOT EXISTS nexus_assessment_parts_immutable BEFORE UPDATE ON nexus_assessment_parts BEGIN
 SELECT RAISE(ABORT,'assessment_part_immutable');
END;
CREATE TRIGGER IF NOT EXISTS nexus_assessment_parts_quota BEFORE INSERT ON nexus_assessment_parts
WHEN NOT EXISTS(SELECT 1 FROM nexus_assessment_parts WHERE upload_id=NEW.upload_id AND part_index=NEW.part_index)
BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM nexus_assessment_uploads u JOIN nexus_assessment_attempts a ON a.id=u.attempt_id WHERE u.id=NEW.upload_id AND a.account_id=NEW.account_id AND a.status='draft' AND NEW.part_index<u.chunk_count AND NEW.bytes=CASE WHEN NEW.part_index=u.chunk_count-1 THEN u.total_bytes-32768*NEW.part_index ELSE 32768 END) THEN RAISE(ABORT,'assessment_part_invalid') END;
 SELECT CASE WHEN (SELECT bytes FROM nexus_assessment_usage WHERE id=1)+NEW.bytes>134217728 THEN RAISE(ABORT,'assessment_quota') END;
 SELECT CASE WHEN (SELECT bytes FROM nexus_assessment_owners WHERE account_id=NEW.account_id)+NEW.bytes>25165824 THEN RAISE(ABORT,'assessment_quota') END;
END;
CREATE TRIGGER IF NOT EXISTS nexus_assessment_parts_charge AFTER INSERT ON nexus_assessment_parts BEGIN
 UPDATE nexus_assessment_usage SET bytes=bytes+NEW.bytes WHERE id=1;
 UPDATE nexus_assessment_owners SET bytes=bytes+NEW.bytes WHERE account_id=NEW.account_id;
END;
CREATE TRIGGER IF NOT EXISTS nexus_assessment_parts_release BEFORE DELETE ON nexus_assessment_parts BEGIN
 UPDATE nexus_assessment_usage SET bytes=bytes-OLD.bytes WHERE id=1;
 UPDATE nexus_assessment_owners SET bytes=bytes-OLD.bytes WHERE account_id=OLD.account_id;
END;
CREATE TABLE IF NOT EXISTS nexus_assessment_reviews (
 id TEXT PRIMARY KEY,
 attempt_id TEXT NOT NULL REFERENCES nexus_assessment_attempts(id) ON DELETE CASCADE,
 account_id TEXT NOT NULL REFERENCES nexus_assessment_owners(account_id) ON DELETE CASCADE,
 reviewer_id TEXT NOT NULL,
 previous_review_id TEXT,
 rubric TEXT NOT NULL,
 result TEXT NOT NULL,
 created_at TEXT NOT NULL,
 bytes INTEGER NOT NULL CHECK(bytes BETWEEN 1 AND 131072),
 CHECK(account_id<>reviewer_id),
 CHECK(bytes=length(CAST(rubric AS BLOB))+length(CAST(result AS BLOB)))
);
CREATE INDEX IF NOT EXISTS nexus_assessment_review_attempt ON nexus_assessment_reviews(attempt_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS nexus_assessment_review_author ON nexus_assessment_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS nexus_assessment_review_owner ON nexus_assessment_reviews(account_id);
CREATE TRIGGER IF NOT EXISTS nexus_assessment_review_validate BEFORE INSERT ON nexus_assessment_reviews BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM nexus_assessment_attempts a WHERE a.id=NEW.attempt_id AND a.account_id=NEW.account_id AND a.assessment_mode='expert' AND a.reviewer_id=NEW.reviewer_id AND a.status IN('submitted','reviewed') AND COALESCE(a.latest_review_id,'')=COALESCE(NEW.previous_review_id,'')) THEN RAISE(ABORT,'assessment_review_conflict') END;
 SELECT CASE WHEN (SELECT count(*) FROM nexus_assessment_reviews WHERE attempt_id=NEW.attempt_id)>=16 THEN RAISE(ABORT,'assessment_review_limit') END;
 SELECT CASE WHEN (SELECT bytes FROM nexus_assessment_usage WHERE id=1)+NEW.bytes>134217728 OR (SELECT bytes FROM nexus_assessment_owners WHERE account_id=NEW.account_id)+NEW.bytes>25165824 THEN RAISE(ABORT,'assessment_quota') END;
END;
CREATE TRIGGER IF NOT EXISTS nexus_assessment_review_commit AFTER INSERT ON nexus_assessment_reviews BEGIN
 UPDATE nexus_assessment_attempts SET latest_review_id=NEW.id,status='reviewed',version=version+1 WHERE id=NEW.attempt_id;
 UPDATE nexus_assessment_usage SET bytes=bytes+NEW.bytes WHERE id=1;
 UPDATE nexus_assessment_owners SET bytes=bytes+NEW.bytes WHERE account_id=NEW.account_id;
END;
CREATE TRIGGER IF NOT EXISTS nexus_assessment_review_release BEFORE DELETE ON nexus_assessment_reviews BEGIN
 UPDATE nexus_assessment_usage SET bytes=bytes-OLD.bytes WHERE id=1;
 UPDATE nexus_assessment_owners SET bytes=bytes-OLD.bytes WHERE account_id=OLD.account_id;
END;
CREATE TRIGGER IF NOT EXISTS nexus_assessment_review_immutable BEFORE UPDATE ON nexus_assessment_reviews BEGIN
 SELECT RAISE(ABORT,'assessment_review_immutable');
END;
CREATE TABLE IF NOT EXISTS nexus_assessment_appeals (
 id TEXT PRIMARY KEY,
 attempt_id TEXT NOT NULL REFERENCES nexus_assessment_attempts(id) ON DELETE CASCADE,
 account_id TEXT NOT NULL REFERENCES nexus_assessment_owners(account_id) ON DELETE CASCADE,
 review_id TEXT NOT NULL,
 text TEXT NOT NULL CHECK(length(text) BETWEEN 1 AND 4000),
 created_at TEXT NOT NULL,
 bytes INTEGER NOT NULL CHECK(bytes BETWEEN 1 AND 16000 AND bytes=length(CAST(text AS BLOB))),
 UNIQUE(attempt_id,review_id)
);
CREATE INDEX IF NOT EXISTS nexus_assessment_appeal_owner ON nexus_assessment_appeals(account_id);
CREATE TRIGGER IF NOT EXISTS nexus_assessment_appeal_validate BEFORE INSERT ON nexus_assessment_appeals BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM nexus_assessment_attempts a JOIN nexus_assessment_reviews r ON r.attempt_id=a.id WHERE a.id=NEW.attempt_id AND a.account_id=NEW.account_id AND r.id=NEW.review_id) THEN RAISE(ABORT,'assessment_appeal_invalid') END;
 SELECT CASE WHEN (SELECT bytes FROM nexus_assessment_usage WHERE id=1)+NEW.bytes>134217728 OR (SELECT bytes FROM nexus_assessment_owners WHERE account_id=NEW.account_id)+NEW.bytes>25165824 THEN RAISE(ABORT,'assessment_quota') END;
END;
CREATE TRIGGER IF NOT EXISTS nexus_assessment_appeal_charge AFTER INSERT ON nexus_assessment_appeals BEGIN
 UPDATE nexus_assessment_usage SET bytes=bytes+NEW.bytes WHERE id=1;
 UPDATE nexus_assessment_owners SET bytes=bytes+NEW.bytes WHERE account_id=NEW.account_id;
END;
CREATE TRIGGER IF NOT EXISTS nexus_assessment_appeal_release BEFORE DELETE ON nexus_assessment_appeals BEGIN
 UPDATE nexus_assessment_usage SET bytes=bytes-OLD.bytes WHERE id=1;
 UPDATE nexus_assessment_owners SET bytes=bytes-OLD.bytes WHERE account_id=OLD.account_id;
END;
-- Answer key: только приватный подготовленный seed, никогда публичный frontend/репозиторий.
CREATE TABLE IF NOT EXISTS nexus_assessment_answer_keys (
 policy TEXT NOT NULL CHECK(policy='automatic-self-study-v1'),
 variant TEXT NOT NULL CHECK(variant IN('A','B','C')),
 bank_hash TEXT NOT NULL CHECK(length(bank_hash)=64),
 answers TEXT NOT NULL CHECK(length(CAST(answers AS BLOB)) BETWEEN 1 AND 4096),
 PRIMARY KEY(policy,variant)
);
CREATE TABLE IF NOT EXISTS nexus_assessment_auto_results (
 attempt_id TEXT PRIMARY KEY REFERENCES nexus_assessment_attempts(id) ON DELETE CASCADE,
 account_id TEXT NOT NULL REFERENCES nexus_assessment_owners(account_id) ON DELETE CASCADE,
 snapshot_hash TEXT NOT NULL CHECK(length(snapshot_hash)=64),
 result TEXT NOT NULL,
 created_at TEXT NOT NULL,
 bytes INTEGER NOT NULL CHECK(bytes=length(CAST(result AS BLOB)) AND bytes BETWEEN 1 AND 16384)
);
CREATE INDEX IF NOT EXISTS nexus_assessment_auto_owner ON nexus_assessment_auto_results(account_id);
CREATE TRIGGER IF NOT EXISTS nexus_assessment_auto_validate BEFORE INSERT ON nexus_assessment_auto_results BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM nexus_assessment_attempts a WHERE a.id=NEW.attempt_id AND a.account_id=NEW.account_id AND a.assessment_mode='automatic' AND a.status='assessed' AND a.snapshot_hash=NEW.snapshot_hash) THEN RAISE(ABORT,'assessment_auto_conflict') END;
 SELECT CASE WHEN (SELECT bytes FROM nexus_assessment_usage WHERE id=1)+NEW.bytes>134217728 OR (SELECT bytes FROM nexus_assessment_owners WHERE account_id=NEW.account_id)+NEW.bytes>25165824 THEN RAISE(ABORT,'assessment_quota') END;
END;
CREATE TRIGGER IF NOT EXISTS nexus_assessment_auto_charge AFTER INSERT ON nexus_assessment_auto_results BEGIN
 UPDATE nexus_assessment_usage SET bytes=bytes+NEW.bytes WHERE id=1;
 UPDATE nexus_assessment_owners SET bytes=bytes+NEW.bytes WHERE account_id=NEW.account_id;
END;
CREATE TRIGGER IF NOT EXISTS nexus_assessment_auto_release BEFORE DELETE ON nexus_assessment_auto_results BEGIN
 UPDATE nexus_assessment_usage SET bytes=bytes-OLD.bytes WHERE id=1;
 UPDATE nexus_assessment_owners SET bytes=bytes-OLD.bytes WHERE account_id=OLD.account_id;
END;
CREATE TRIGGER IF NOT EXISTS nexus_assessment_auto_immutable BEFORE UPDATE ON nexus_assessment_auto_results BEGIN
 SELECT RAISE(ABORT,'assessment_auto_immutable');
END;
