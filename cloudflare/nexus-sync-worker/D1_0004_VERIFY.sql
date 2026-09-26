-- AKRONIKL IT NEXUS v0.1.7-alpha.2.4.2
-- Dashboard-safe single SELECT verification for D1 migration 0004.
-- This query avoids multi-statement requests and large UNION chains.

SELECT
  CASE WHEN EXISTS (
    SELECT 1 FROM sqlite_master
    WHERE type='table' AND name='account_devices'
  ) THEN 'OK' ELSE 'MISSING' END AS account_devices_table,

  CASE WHEN EXISTS (
    SELECT 1 FROM sqlite_master
    WHERE type='table' AND name='account_sessions'
  ) THEN 'OK' ELSE 'MISSING' END AS account_sessions_table,

  CASE WHEN EXISTS (
    SELECT 1 FROM sqlite_master
    WHERE type='table' AND name='identity_security_events'
  ) THEN 'OK' ELSE 'MISSING' END AS identity_security_events_table,

  CASE WHEN EXISTS (
    SELECT 1 FROM sqlite_master
    WHERE type='index' AND name='idx_account_devices_subject'
  ) THEN 'OK' ELSE 'MISSING' END AS idx_account_devices_subject,

  CASE WHEN EXISTS (
    SELECT 1 FROM sqlite_master
    WHERE type='index' AND name='idx_account_sessions_hash'
  ) THEN 'OK' ELSE 'MISSING' END AS idx_account_sessions_hash,

  CASE WHEN EXISTS (
    SELECT 1 FROM sqlite_master
    WHERE type='index' AND name='idx_account_sessions_subject'
  ) THEN 'OK' ELSE 'MISSING' END AS idx_account_sessions_subject,

  CASE WHEN EXISTS (
    SELECT 1 FROM sqlite_master
    WHERE type='index' AND name='idx_account_sessions_device'
  ) THEN 'OK' ELSE 'MISSING' END AS idx_account_sessions_device,

  CASE WHEN EXISTS (
    SELECT 1 FROM sqlite_master
    WHERE type='index' AND name='idx_identity_security_subject'
  ) THEN 'OK' ELSE 'MISSING' END AS idx_identity_security_subject,

  (SELECT COUNT(*) FROM account_devices) AS devices,
  (SELECT COUNT(*) FROM account_sessions) AS sessions,
  (SELECT COUNT(*) FROM identity_security_events) AS security_events;
