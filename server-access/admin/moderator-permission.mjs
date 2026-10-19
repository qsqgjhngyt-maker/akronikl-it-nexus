// Prepared SQL for trusted server administration only. No endpoint, credentials,
// connection, default account or automatic moderator is provided by this module.
export const grantModeratorSQL=`INSERT INTO feedback_permissions(account_id,can_moderate)
SELECT a.id,1 FROM account_subjects a
WHERE a.id=?1 AND a.status='active'
AND EXISTS(SELECT 1 FROM login_methods lm
 JOIN nexus_passkey_credentials k ON k.login_method_id=lm.id AND k.account_id=a.id
 WHERE lm.account_id=a.id AND lm.kind='passkey' AND lm.status='active')
ON CONFLICT(account_id) DO UPDATE SET can_moderate=1`;
export const revokeModeratorSQL='UPDATE feedback_permissions SET can_moderate=0 WHERE account_id=?1';
export const inspectModeratorSQL=`SELECT a.id,a.status,COALESCE(p.can_moderate,0) AS can_moderate
FROM account_subjects a LEFT JOIN feedback_permissions p ON p.account_id=a.id WHERE a.id=?1`;
