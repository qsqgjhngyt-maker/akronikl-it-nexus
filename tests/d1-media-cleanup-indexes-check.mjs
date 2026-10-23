// Настоящий локальный workerd/D1; только синтетические служебные записи.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {Miniflare} from '../server-access/node_modules/miniflare/dist/src/index.js';
const migration=await readFile(new URL('../server-access/migrations/0017_media_rpc_cleanup_indexes.sql',import.meta.url),'utf8');
const source=await readFile(new URL('../server-access/worker/admin-service.mjs',import.meta.url),'utf8');
const nonceSql="DELETE FROM nexus_admin_nonces WHERE nonce IN(SELECT nonce FROM nexus_admin_nonces WHERE nonce LIKE 'mp1:%' AND expires_at<?1 LIMIT 128)";
const rateSql="DELETE FROM nexus_admin_rate_limits WHERE (scope,bucket) IN(SELECT scope,bucket FROM nexus_admin_rate_limits WHERE scope GLOB '!media-public-v1:[0-9a-f]' AND bucket<?1 LIMIT 32)";
assert.ok(source.includes(nonceSql)&&source.includes(rateSql),'Проверяются точные runtime-запросы');
assert.equal(migration.replace(/--[^\n]*/g,'').split(';').filter(s=>s.trim()).length,1);
assert.ok(migration.replace(/--[^\n]*/g,'').split(';').filter(s=>s.trim()).every(s=>/^\s*CREATE INDEX IF NOT EXISTS\b/.test(s)));
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("SYNTHETIC")}}',compatibilityDate:'2026-09-23',compatibilityFlags:['nodejs_compat'],d1Databases:{BEFORE:'synthetic-before',AFTER:'synthetic-after'},outboundService:()=>{throw Error('OUTBOUND_FORBIDDEN')}});
const records=[];
const count=async(db,table,where='1')=>(await db.prepare('SELECT COUNT(*) n FROM '+table+' WHERE '+where).first()).n;
const plan=async(db,sql,arg)=>(await db.prepare('EXPLAIN QUERY PLAN '+sql).bind(arg).all()).results.map(r=>r.detail);
try{
 await mf.ready;
 const before=await mf.getD1Database('BEFORE'),after=await mf.getD1Database('AFTER');
 const schema="CREATE TABLE nexus_admin_nonces(nonce TEXT PRIMARY KEY,expires_at TEXT NOT NULL); CREATE TABLE nexus_admin_rate_limits(scope TEXT NOT NULL,bucket INTEGER NOT NULL,used INTEGER NOT NULL CHECK(used BETWEEN 1 AND 120),PRIMARY KEY(scope,bucket));";
 for(const db of [before,after]){
  await db.exec(schema);
  await db.exec("WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<10000) INSERT INTO nexus_admin_nonces SELECT printf('legacy-%05d',i),'2000-01-01T00:00:00.000Z' FROM n");
  await db.exec("WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<40) INSERT INTO nexus_admin_nonces SELECT printf('mp1:expired-%05d',i),'2000-01-01T00:00:00.000Z' FROM n");
  await db.exec("INSERT INTO nexus_admin_nonces VALUES('mp1:live','2099-01-01T00:00:00.000Z')");
  await db.exec("WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<10000) INSERT INTO nexus_admin_rate_limits SELECT printf('synthetic-admin-%05d',i),1,1 FROM n");
  await db.exec("WITH RECURSIVE n(i) AS (SELECT 0 UNION ALL SELECT i+1 FROM n WHERE i<15) INSERT INTO nexus_admin_rate_limits SELECT '!media-public-v1:'||printf('%x',i),1,1 FROM n");
  await db.exec("INSERT INTO nexus_admin_rate_limits VALUES('!media-public-v1:0',999999999,1)");
 }
 const prePlans={nonce:await plan(before,nonceSql,'2026-10-24T00:00:00.000Z'),rate:await plan(before,rateSql,100)};
 const sql=migration.split(/\r?\n/).filter(l=>!l.trimStart().startsWith('--')).join(' ');
 await after.exec(sql);await after.exec(sql);
 assert.equal(await count(after,'nexus_admin_nonces'),10041,'Индексы не меняют строки');
 assert.equal(await count(after,'nexus_admin_rate_limits'),10017);
 const postPlans={nonce:await plan(after,nonceSql,'2026-10-24T00:00:00.000Z'),rate:await plan(after,rateSql,100)};
 assert.ok(postPlans.nonce.some(p=>p.includes('idx_nexus_admin_media_nonce_expiry')&&p.includes('SEARCH')));
 assert.deepEqual(postPlans.rate,prePlans.rate,'План запроса rate limits не меняется');
 for(const [name,query,arg,expected] of [['nonce',nonceSql,'2026-10-24T00:00:00.000Z',40],['rate',rateSql,100,16]]){
  const a=await before.prepare(query).bind(arg).run(),b=await after.prepare(query).bind(arg).run();
  assert.equal(a.meta.changes,expected);assert.equal(b.meta.changes,expected);
  if(name==='nonce'){assert.ok(a.meta.rows_read>=10000);assert.ok(b.meta.rows_read<a.meta.rows_read/20);}else assert.equal(b.meta.rows_read,a.meta.rows_read);
  records.push({name,before:{rowsRead:a.meta.rows_read,rowsWritten:a.meta.rows_written},after:{rowsRead:b.meta.rows_read,rowsWritten:b.meta.rows_written},reduction:Math.round(a.meta.rows_read/b.meta.rows_read),beforePlan:prePlans[name],afterPlan:postPlans[name]});
 }
 let emptyBefore=0,emptyAfter=0;
 for(let i=0;i<20;i++){
  const a=await before.prepare(nonceSql).bind('2026-10-24T00:00:00.000Z').run(),b=await after.prepare(nonceSql).bind('2026-10-24T00:00:00.000Z').run();
  assert.equal(a.meta.changes,0);assert.equal(b.meta.changes,0);emptyBefore+=a.meta.rows_read;emptyAfter+=b.meta.rows_read;
 }
 assert.ok(emptyBefore>=200000);assert.ok(emptyAfter<emptyBefore/100,JSON.stringify({emptyBefore,emptyAfter}));
 records.push({name:'20 повторов без истёкших media nonce',before:{rowsRead:emptyBefore},after:{rowsRead:emptyAfter}});
 for(const db of [before,after]){
  assert.equal(await count(db,'nexus_admin_nonces',"nonce NOT LIKE 'mp1:%'"),10000);
  assert.equal(await count(db,'nexus_admin_nonces',"nonce='mp1:live'"),1);
  const duplicate=await db.prepare('INSERT OR IGNORE INTO nexus_admin_nonces VALUES(?1,?2)').bind('mp1:live','2099-01-01T00:00:00.000Z').run();assert.equal(duplicate.meta.changes,0,'Повторный nonce отклонён');
  assert.equal(await count(db,'nexus_admin_rate_limits',"scope NOT GLOB '!media-public-v1:[0-9a-f]'"),10000);
  assert.equal(await count(db,'nexus_admin_rate_limits','bucket=999999999'),1);
  await db.exec("WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<300) INSERT INTO nexus_admin_nonces SELECT printf('mp1:bounded-%05d',i),'2000-01-01T00:00:00.000Z' FROM n");
  assert.equal((await db.prepare(nonceSql).bind('2026-10-24T00:00:00.000Z').run()).meta.changes,128,'Сохраняется лимит очистки');
  assert.equal(await count(db,'nexus_admin_nonces',"nonce LIKE 'mp1:bounded-%'"),172);
 }
 const result={status:'PASS',engine:'local workerd/D1',productionExecution:false,synthetic:true,records,checks:['migration additive and idempotent','exact runtime nonce SQL uses partial index','at least 20x fewer nonce rows read','rate cleanup plan and cost unchanged','legacy and unexpired rows retained','nonce replay still rejected','cleanup remains bounded to 128']};
 if(process.env.NEXUS_D1_INDEX_EVIDENCE)await writeFile(process.env.NEXUS_D1_INDEX_EVIDENCE,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result,null,2));
}finally{await mf.dispose()}
