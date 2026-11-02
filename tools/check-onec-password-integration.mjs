// Интеграционный review PR64: только неизменённые bytes проверенного identity source.
// Этот допуск не разрешает миграцию, включение флагов, deployment или выпуск.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export const PASSWORD_SOURCE="b5f5400c7a0a63533fe57ee64c9bfdd33d3f6a96";
export const PASSWORD_SOURCE_BASE="0eb4bdcbc05c73ae4f8a312e7bcc0f4279d91b13";
export const PASSWORD_SOURCE_PATHS=Object.freeze([
  ".github/workflows/invited-password-preflight.yml",
  "core/account-control.js",
  "server-access/INVITED_PASSWORD_RUNBOOK_RU.md",
  "server-access/PASSWORD_SECURITY_REVIEW_RU.md",
  "server-access/bff/invited-password.mjs",
  "server-access/bff/password-mail.mjs",
  "server-access/bff/server.mjs",
  "server-access/build-bff.mjs",
  "server-access/build-network-bootstrap.mjs",
  "server-access/check-invited-password-browser.mjs",
  "server-access/check-invited-password-security.mjs",
  "server-access/check-invited-password-workerd.mjs",
  "server-access/check-invited-password.mjs",
  "server-access/migrations/0021_invited_email_password.sql",
  "server-access/migrations/0022_password_mail_recovery.sql",
  "server-access/migrations/0023_password_security_review.sql",
  "server-access/migrations/0024_password_invite_passkey_guard.sql",
  "server-access/package-lock.json",
  "server-access/package.json",
  "server-access/public/entry.html",
  "server-access/public/password.html",
  "server-access/public/password.js",
  "server-access/staging/README_RU.md",
  "server-access/staging/build.mjs",
  "server-access/staging/cloud.mjs",
  "server-access/staging/configure-mailru.ps1",
  "server-access/staging/contract.mjs",
  "server-access/staging/runtime.mjs",
  "server-access/staging/security.test.mjs",
  "server-access/staging/send-test.mjs",
  "server-access/staging/smoke.mjs",
  "server-access/staging/start.mjs",
  "server-access/worker/admin-purge.mjs",
  "server-access/worker/admin-service.mjs",
  "server-access/worker/alpha-admission.mjs",
  "server-access/worker/entry.mjs",
  "server-access/worker/invited-password-service.mjs",
  "tests/invited-password-ci-scope.test.mjs",
  "tools/invited-password-ci-scope.mjs"
]);
const git=(...args)=>execFileSync('git',args,{maxBuffer:5000000});
export function verifyPasswordSource({read=p=>({bytes:fs.readFileSync(p),mode:fs.lstatSync(p).isFile()&&!fs.lstatSync(p).isSymbolicLink()?'100644':'INVALID'})}={}){
 git('merge-base','--is-ancestor',PASSWORD_SOURCE,'HEAD');
 const rows=PASSWORD_SOURCE_PATHS.map(p=>{
  const actual=read(p),expected=git('show',PASSWORD_SOURCE+':'+p);
  assert.equal(git('ls-tree',PASSWORD_SOURCE,'--',p).toString().split(' ')[0],'100644',p+' source mode');
  assert.equal(actual.mode,'100644',p+' mode');
  assert.ok(Buffer.isBuffer(actual.bytes)&&actual.bytes.equals(expected),p+' approved identity source bytes');
  return{path:p,mode:actual.mode,sha256:createHash('sha256').update(expected).digest('hex')};
 });
 return{status:'AUTOMATED PASS',source:PASSWORD_SOURCE,sourceBase:PASSWORD_SOURCE_BASE,files:rows,releaseEligible:false,deploymentApproved:false,productionChanged:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(verifyPasswordSource(),null,2));
