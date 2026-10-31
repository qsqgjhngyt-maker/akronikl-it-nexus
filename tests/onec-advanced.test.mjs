import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import path from'node:path';import{createHash}from'node:crypto';
import{fileURLToPath}from'node:url';
const native=new URL('../courses/onec-education/native/',import.meta.url),spec=JSON.parse(fs.readFileSync(new URL('advanced-spec.v1.json',native))),digest=b=>createHash('sha256').update(b).digest('hex');
test('Расширенный native QA связан с 18 собственными исходниками и точными 76/6 case ID',()=>{
 assert.equal(spec.files.length,18);assert.equal(digest(JSON.stringify(spec.files)),spec.sourceSnapshotSha256);
 const source=path.resolve(fileURLToPath(new URL('service-desk-advanced/',native)));
 for(const f of spec.files){assert.ok(!f.path.split('/').includes('..'));const file=path.resolve(source,f.path);assert.ok(file.startsWith(source+path.sep));const b=fs.readFileSync(file);assert.equal(b.length,f.bytes);assert.equal(digest(b),f.sha256);}
 assert.equal(new Set(spec.advancedCaseIds).size,76);assert.equal(new Set(spec.readerCaseIds).size,6);
 const old=JSON.parse(fs.readFileSync(new URL('full-spec.v1.json',native)));for(const id of old.caseIds)assert.ok(spec.advancedCaseIds.includes(id));
});
test('Учебный читатель: нет административных и записывающих прав; RLS имеет явную границу',()=>{
 const rights=fs.readFileSync(new URL('service-desk-advanced/Roles/УчебныйЧитатель/Ext/Rights.xml',native),'utf8');
 assert.match(rights,/<name>Configuration\.NexusTrainingServiceDeskFull<\/name>/);assert.match(rights,/<name>MainWindowModeNormal<\/name><value>true<\/value>/);assert.match(rights,/<condition>ГДЕ Минуты &lt;= 30<\/condition>/);
 for(const denied of ['Administration','DataAdministration','Insert','Update','Delete','Posting','UndoPosting','InteractiveInsert','Edit'])assert.doesNotMatch(rights,new RegExp('<name>'+denied+'</name>'));
 assert.match(rights,/<setForNewObjects>false<\/setForNewObjects>/);
});
