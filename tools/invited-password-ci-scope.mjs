// Route a strictly bounded identity-only diff away from frozen course releases.
// Unknown paths, missing history and malformed diffs never bypass legacy gates.
import {execFileSync} from 'node:child_process';
import {appendFile,readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export const AUTH_PATHS=new Set([
 '.github/workflows/invited-password-preflight.yml',
 '.github/workflows/academy-gold-cpp-module-2-preflight.yml',
 '.github/workflows/academy-gold-cpp-module-3-publication.yml',
 'core/account-control.js','tools/invited-password-ci-scope.mjs','tests/invited-password-ci-scope.test.mjs',
 'server-access/INVITED_PASSWORD_RUNBOOK_RU.md','server-access/PASSWORD_SECURITY_REVIEW_RU.md',
 'server-access/bff/invited-password.mjs','server-access/bff/password-mail.mjs','server-access/bff/server.mjs',
 'server-access/build-bff.mjs','server-access/build-network-bootstrap.mjs',
 'server-access/check-invited-password.mjs','server-access/check-invited-password-security.mjs',
 'server-access/check-invited-password-browser.mjs','server-access/check-invited-password-workerd.mjs',
 'server-access/migrations/0021_invited_email_password.sql','server-access/migrations/0022_password_mail_recovery.sql',
 'server-access/migrations/0023_password_security_review.sql',
 'server-access/migrations/0024_password_invite_passkey_guard.sql',
 'server-access/package.json','server-access/package-lock.json','server-access/public/entry.html',
 'server-access/public/password.html','server-access/public/password.js',
 'server-access/worker/admin-purge.mjs','server-access/worker/admin-service.mjs',
 'server-access/worker/alpha-admission.mjs','server-access/worker/entry.mjs','server-access/worker/invited-password-service.mjs'
]);
export function isInvitedPasswordOnly(paths){
 return Array.isArray(paths)&&paths.length>0&&paths.includes('server-access/worker/invited-password-service.mjs')&&
  paths.every(p=>typeof p==='string'&&!p.includes('..')&&!p.includes('\\')&&
   (AUTH_PATHS.has(p)||/^server-access\/staging\/[a-zA-Z0-9_./-]+$/.test(p)));
}
export function changedPaths(base,head){
 if(!/^[a-f0-9]{40}$/.test(base)||!/^([a-f0-9]{40}|HEAD)$/.test(head)||/^0+$/.test(base))throw Error('EXACT_CI_REFS_REQUIRED');
 const git=(...args)=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:4*1024*1024});
 git('merge-base','--is-ancestor',base,head);
 // No rename detection: a rename out of scope retains both deleted/added paths.
 return git('diff','--no-renames','--name-only','-z',base,head).split('\0').filter(Boolean);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const event=JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH,'utf8'));
 const base=event.pull_request?.base?.sha||event.before,head=process.env.GITHUB_SHA;
 const paths=changedPaths(base,head),authOnly=isInvitedPasswordOnly(paths);
 if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,'auth_only='+authOnly+'\n');
 console.log(JSON.stringify({authOnly,changedPaths:paths.length,legacyGates:authOnly?'not applicable: bounded identity diff':'required'}));
}
