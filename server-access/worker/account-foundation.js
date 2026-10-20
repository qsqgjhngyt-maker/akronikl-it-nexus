import {alphaAccess} from './alpha-admission.mjs';
// Только чтение. Enrollment, OAuth и управление credentials здесь не включены.
export async function readAccountFoundation(db, accountId) {
  const account = await db.prepare(`
    SELECT id, display_name, status
    FROM account_subjects WHERE id = ?1 AND status = 'active'
  `).bind(accountId).first();
  if (!account) return null;
  const {results = []} = await db.prepare(`
    SELECT id, kind, status, created_at, disabled_at
    FROM login_methods WHERE account_id = ?1 ORDER BY id
  `).bind(accountId).all();
  return {
    account: {accountId: account.id, displayName: account.display_name, status: account.status},
    loginMethods: results.map(row => ({
      id: row.id, kind: row.kind, status: row.status,
      createdAt: row.created_at, disabledAt: row.disabled_at
    })),
    enrollmentAvailable: false
  };
}

// Только новый Account path: legacy-bridge и сессии без Login Method не подходят.
export async function readEligibleAccountFoundation(db, sessionHash, stamp = new Date().toISOString(), env = {}) {
  const actor = await db.prepare(`
    SELECT s.id AS account_id
    FROM account_sessions x
    JOIN account_subjects s ON s.id = x.subject_id AND s.status = 'active'
    JOIN account_devices d ON d.id = x.device_id
      AND d.subject_id = s.id AND d.status = 'active'
    JOIN session_login_methods slm ON slm.session_id = x.id
      AND slm.account_id = s.id
    JOIN login_methods lm ON lm.id = slm.login_method_id
      AND lm.account_id = s.id AND lm.status = 'active'
    WHERE x.secret_hash = ?1 AND x.status = 'active'
      AND x.auth_strength = 'account-method-v1'
      AND x.revoked_at IS NULL
      AND x.idle_expires_at > ?2 AND x.absolute_expires_at > ?2
    LIMIT 1
  `).bind(sessionHash, stamp).first();
  if(actor&&!await alphaAccess(env,actor.account_id))return null;
  return actor ? readAccountFoundation(db, actor.account_id) : null;
}
