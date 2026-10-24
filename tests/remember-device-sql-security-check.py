"""SESSION-REMEMBER-01: SQLite simulation of proposed D1 guards. No real DB/secrets."""
import pathlib, sqlite3, datetime, uuid, hashlib, json
BASE=pathlib.Path(__file__).resolve().parents[1]
MIGRATION=BASE/'docs/ru/identity/proposals/SESSION_REMEMBER_0017_D1_DRAFT.sql.txt'
assert 'DO NOT APPLY' in MIGRATION.read_text(encoding='utf-8')
conn=sqlite3.connect(':memory:',isolation_level=None)
conn.row_factory=sqlite3.Row
conn.execute('PRAGMA foreign_keys=ON')
conn.executescript('''
CREATE TABLE account_subjects(id TEXT PRIMARY KEY,status TEXT NOT NULL);
CREATE TABLE account_devices(id TEXT PRIMARY KEY,subject_id TEXT NOT NULL,status TEXT NOT NULL);
CREATE TABLE login_methods(id TEXT PRIMARY KEY,account_id TEXT NOT NULL,status TEXT NOT NULL);
CREATE TABLE account_sessions(id TEXT PRIMARY KEY,subject_id TEXT NOT NULL,device_id TEXT NOT NULL,secret_hash TEXT UNIQUE,status TEXT NOT NULL,auth_strength TEXT NOT NULL,created_at TEXT NOT NULL,last_seen_at TEXT NOT NULL,idle_expires_at TEXT NOT NULL,absolute_expires_at TEXT NOT NULL,revoked_at TEXT,revoked_reason TEXT);
CREATE TABLE session_login_methods(session_id TEXT PRIMARY KEY,login_method_id TEXT NOT NULL,account_id TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE nexus_alpha_members(account_id TEXT PRIMARY KEY,state TEXT NOT NULL);
CREATE TABLE synthetic_private_projects(project_id TEXT PRIMARY KEY,data TEXT NOT NULL);
''')
conn.executescript(MIGRATION.read_text(encoding='utf-8'))
def check(condition,label):
 assert condition,label
 print('PASS',label)
BASE_CLOCK=datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)
def iso(delta=0):return (BASE_CLOCK+datetime.timedelta(milliseconds=delta)).strftime('%Y-%m-%dT%H:%M:%S.%f')[:23]+'Z'
account='synthetic-account';device='synthetic-device';method='synthetic-method';source='synthetic-session';now=iso()
conn.execute("INSERT INTO account_subjects VALUES (?, 'active')",(account,))
conn.execute("INSERT INTO account_devices VALUES (?,?,'active')",(device,account))
conn.execute("INSERT INTO login_methods VALUES (?,?,'active')",(method,account))
conn.execute("INSERT INTO account_sessions (id,subject_id,device_id,secret_hash,status,auth_strength,created_at,last_seen_at,idle_expires_at,absolute_expires_at) VALUES (?,?,?,?,'active','account-method-v1',?,?,?,?)",(source,account,device,'a'*64,now,now,iso(1800000),iso(43200000)))
conn.execute("INSERT INTO session_login_methods VALUES (?,?,?,?)",(source,method,account,now))
conn.execute("INSERT INTO synthetic_private_projects VALUES ('project-stay','byte-exact-preserved')")
grant=str(uuid.uuid4());first_hash='b'*64;next_hash='c'*64;session_id='remembered-session'
insertGrant='''INSERT INTO nexus_remembered_grants(id,account_id,device_id,login_method_id,source_session_id,current_hash,generation,status,created_at,expires_at,last_rotated_at)
VALUES(?,?,?,?,?,?,1,'active',?,?,?)'''
conn.execute(insertGrant,(grant,account,device,method,source,first_hash,now,iso(30*24*60*60*1000),now))
check(conn.execute('SELECT count(*) FROM nexus_remembered_grants').fetchone()[0]==1,'grant requires current fresh strong login method')

def attempt(fn,label):
 conn.execute('SAVEPOINT negative')
 try:
  fn()
 except sqlite3.IntegrityError:
  conn.execute('ROLLBACK TO negative');conn.execute('RELEASE negative')
  check(True,label);return
 conn.execute('ROLLBACK TO negative');conn.execute('RELEASE negative')
 raise AssertionError('Unexpected success: '+label)

attempt(lambda:conn.execute(insertGrant,(str(uuid.uuid4()),account,device,method,source,'d'*64,now,iso(31*24*60*60*1000),now)), 'over-30-day grant rejected by trigger')
attempt(lambda:conn.execute('UPDATE nexus_remembered_grants SET device_id=? WHERE id=?',('forged-device',grant)),'grant/device ownership immutable')
attempt(lambda:conn.execute('INSERT INTO account_sessions (id,subject_id,device_id,secret_hash,status,auth_strength,created_at,last_seen_at,idle_expires_at,absolute_expires_at) VALUES (?,?,?, ?,\'active\',\'remembered-device-v1\',?,?,?,?)',('fraud',account,device,'d'*64,now,now,iso(1800000),iso(43200000))),'unrotated remembered session denied')

def rotate(hash_value=first_hash,valid_binding=True,receipt=True,issued_id=session_id,issued_hash='e'*64):
 conn.execute('BEGIN IMMEDIATE')
 try:
  conn.execute('INSERT INTO nexus_remembered_spent(token_hash,grant_id,used_at,expires_at) VALUES(?,?,?,?)',(hash_value,grant,now,iso(30*24*60*60*1000)))
  conn.execute('UPDATE nexus_remembered_grants SET current_hash=?,generation=generation+1,last_rotated_at=?,last_session_id=? WHERE id=? AND current_hash=?',(next_hash,now,issued_id,grant,hash_value))
  conn.execute("INSERT INTO account_sessions (id,subject_id,device_id,secret_hash,status,auth_strength,created_at,last_seen_at,idle_expires_at,absolute_expires_at) VALUES (?,?,?,?, 'active','remembered-device-v1',?,?,?,?)",(issued_id,account,device,issued_hash,now,now,iso(1800000),iso(43200000)))
  if valid_binding:conn.execute('INSERT INTO session_login_methods VALUES (?,?,?,?)',(issued_id,method,account,now))
  if receipt:conn.execute('INSERT INTO nexus_remembered_renewal_receipts VALUES (?,?,?,?,?)',(str(uuid.uuid4()),grant,issued_id,2,now))
  conn.execute('COMMIT')
  return True
 except sqlite3.IntegrityError:
  conn.execute('ROLLBACK')
  return False

check(not rotate(valid_binding=False),'missing login method receipt aborts full batch')
check(conn.execute('SELECT count(*) FROM nexus_remembered_spent').fetchone()[0]==0,'failed transaction does not consume remember token')
check(conn.execute('SELECT count(*) FROM account_sessions WHERE auth_strength=\'remembered-device-v1\'').fetchone()[0]==0,'failed transaction does not leave unauthorized session')
check(rotate(),'valid single rotation commits session and complete receipt')
check(conn.execute('SELECT count(*) FROM nexus_remembered_renewal_receipts').fetchone()[0]==1,'atomic receipt created')
check(conn.execute('SELECT auth_strength FROM account_sessions WHERE id=?',(session_id,)).fetchone()[0]=='remembered-device-v1','renewal session never passes as fresh passkey')
attempt(lambda:conn.execute("UPDATE account_sessions SET auth_strength='account-method-v1' WHERE id=?",(session_id,)),'remembered session cannot be upgraded to fresh passkey')
check(not rotate(issued_id='second',issued_hash='f'*64),'old token spent twice denied (CAS/replay)')
check(conn.execute('SELECT count(*) FROM nexus_remembered_renewal_receipts').fetchone()[0]==1,'failed replay does not create second session')
check(conn.execute('SELECT data FROM synthetic_private_projects WHERE project_id=\'project-stay\'').fetchone()[0]=='byte-exact-preserved','existing private data preserved')
# Account and device revocation invalidate any further spending even with valid hash.
conn.execute("UPDATE account_devices SET status='revoked' WHERE id=?",(device,))
attempt(lambda:conn.execute('INSERT INTO nexus_remembered_spent VALUES(?,?,?,?)',(next_hash,grant,iso(),iso(30*24*60*60*1000))),'revoked device cannot renew')
print(json.dumps({'status':'PASS','migration':'isolated/sqlite-only','realD1':False,'prodChanged':False}))
