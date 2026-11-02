import path from'node:path';
// Реальный URL кодирует кириллицу; декодирование однократное, до namespace/containment.
export function decodeFixturePathname(pathname){const decoded=decodeURIComponent(pathname);if(!decoded.startsWith('/')||/[\\\u0000-\u001f\u007f]/.test(decoded)||decoded.split('/').some(p=>p==='.'||p==='..'))throw Error('FIXTURE_PATH_REJECTED');return decoded;}
export function resolveFixtureFile(root,file){const base=path.resolve(root),target=path.resolve(base,file);if(!target.startsWith(base+path.sep))throw Error('FIXTURE_PATH_REJECTED');return target;}
export function currentIntroFixtureFile(url,base){const u=new URL(url);if(u.username||u.password||u.search||u.hash||!u.href.startsWith(base))return null;const name=u.href.slice(base.length);return /^(?:desktop|mobile)(?:-lite)?\.(?:mp4|webm)$/.test(name)?'intro-media/cinematic-v6/'+name:null;}
