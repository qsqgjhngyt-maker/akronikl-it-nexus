"""Replays the SQL text in the Worker proof module against in-memory SQLite.
No real sessions, keys, users, network, or database changes.
"""
from pathlib import Path
import re,sqlite3,datetime,hashlib,secrets,base64
root=Path(__file__).resolve().parents[1]
src=(root/'server-access/worker/remember-device-proof.mjs').read_text()
match=re.search(r"db\.prepare\(`(SELECT s\.id session_id.*?ORDER BY slm\.login_method_id LIMIT 2)`\)",src,re.S)
assert match, 'proof must contain auditable SQL'
sql=match.group(1)
conn=sqlite3.connect(':memory:');conn.row_factory=sqlite3.Row
conn.executescript('''
CREATE TABLE account_sessions(id TEXT,subject_id TEXT,device_id TEXT,secret_hash TEXT,status TEXT,auth_strength TEXT,revoked_at TEXT,idle_expires_at TEXT,absolute_expires_at TEXT,created_at TEXT);
CREATE TABLE account_subjects(id TEXT,status TEXT);
CREATE TABLE account_devices(id TEXT,subject_id TEXT,status TEXT);
CREATE TABLE session_login_methods(session_id TEXT,account_id TEXT,login_method_id TEXT);
CREATE TABLE login_methods(id TEXT,account_id TEXT,status TEXT);
CREATE TABLE nexus_alpha_members(account_id TEXT,state TEXT);
''')
now=datetime.datetime(2026,10,23,12,0,tzinfo=datetime.timezone.utc)
def iso(d):return d.isoformat(timespec='milliseconds').replace('+00:00','Z')
token='nxs_'+base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip('=')
h=hashlib.sha256(token.encode()).hexdigest()
conn.execute('INSERT INTO account_subjects VALUES(?,?)',('a','active'))
conn.execute('INSERT INTO account_devices VALUES(?,?,?)',('d','a','active'))
conn.execute('INSERT INTO login_methods VALUES(?,?,?)',('l','a','active'))
conn.execute('INSERT INTO session_login_methods VALUES(?,?,?)',('s','a','l'))
conn.execute('INSERT INTO account_sessions VALUES(?,?,?,?,?,?,?,?,?,?)',('s','a','d',h,'active','account-method-v1',None,iso(now+datetime.timedelta(minutes=30)),iso(now+datetime.timedelta(hours=12)),iso(now-datetime.timedelta(seconds=30))))
def allowed():return conn.execute(sql,(h,iso(now),iso(now-datetime.timedelta(minutes=5)))).fetchall()
def update(table,field,value,keyfield,keyvalue):conn.execute(f'UPDATE {table} SET {field}=? WHERE {keyfield}=?',(value,keyvalue))
def check(name,mutation,restore):
 mutation();assert not allowed(),name;restore();assert len(allowed())==1,f'restore {name}';print('PASS',name)
assert len(allowed())==1;print('PASS valid strong fresh account proof')
check('account disabled',lambda:update('account_subjects','status','disabled','id','a'),lambda:update('account_subjects','status','active','id','a'))
check('device revoked',lambda:update('account_devices','status','revoked','id','d'),lambda:update('account_devices','status','active','id','d'))
check('login method disabled',lambda:update('login_methods','status','disabled','id','l'),lambda:update('login_methods','status','active','id','l'))
check('session revoked',lambda:update('account_sessions','revoked_at',iso(now),'id','s'),lambda:update('account_sessions','revoked_at',None,'id','s'))
check('weakened session',lambda:update('account_sessions','auth_strength','remembered-device-v1','id','s'),lambda:update('account_sessions','auth_strength','account-method-v1','id','s'))
check('expired idle',lambda:update('account_sessions','idle_expires_at',iso(now),'id','s'),lambda:update('account_sessions','idle_expires_at',iso(now+datetime.timedelta(minutes=30)),'id','s'))
check('stale proof',lambda:update('account_sessions','created_at',iso(now-datetime.timedelta(minutes=6)),'id','s'),lambda:update('account_sessions','created_at',iso(now-datetime.timedelta(seconds=30)),'id','s'))
conn.execute('INSERT INTO nexus_alpha_members VALUES(?,?)',('a','blocked'))
assert not allowed();print('PASS alpha blocked');conn.execute('DELETE FROM nexus_alpha_members')
conn.execute('INSERT INTO login_methods VALUES(?,?,?)',('l2','a','active'))
conn.execute('INSERT INTO session_login_methods VALUES(?,?,?)',('s','a','l2'))
assert len(allowed())==2,'ambiguous authentication mapping must be detectable';print('PASS duplicate method mapping detected for client rejection')
print('RESULT 10 SQL authorization guards PASS; zero production DB operations')
