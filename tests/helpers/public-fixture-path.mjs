import path from'node:path';
// Реальный URL кодирует кириллицу; декодирование однократное, до namespace/containment.
export function decodeFixturePathname(pathname){const decoded=decodeURIComponent(pathname);if(!decoded.startsWith('/')||/[\\\u0000-\u001f\u007f]/.test(decoded)||decoded.split('/').some(p=>p==='.'||p==='..'))throw Error('FIXTURE_PATH_REJECTED');return decoded;}
export function resolveFixtureFile(root,file){const base=path.resolve(root),target=path.resolve(base,file);if(!target.startsWith(base+path.sep))throw Error('FIXTURE_PATH_REJECTED');return target;}
