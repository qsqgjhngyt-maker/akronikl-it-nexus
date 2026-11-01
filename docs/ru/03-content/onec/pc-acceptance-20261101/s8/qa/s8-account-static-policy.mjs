// Операторский online QA: локальны только явно перечисленные публичные файлы.
// /api и /account всегда идут настоящему HTTPS серверу; DTO/cookies не подменяются.
export const ACCOUNT_ORIGIN='https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net';
export const PREFIX='/__nexus_pr63_87944bb__/';
const roots=new Set(['core','styles','locales','courses','project-studio','sandbox','pwa','akronikl','effects','sync','course-final','feedback','collaboration','assets','content','scripts','vendor']);
export function publicCandidateFile(p){return typeof p==='string'&&roots.has(p.split('/')[0])&&!p.split('/').some(s=>!s||s==='.'||s==='..')&&!/[\\\x00-\x1f]/.test(p)&&/\.(?:js|mjs|json|css|html|svg|png|webp|jpe?g|ico|woff2?|ttf|wasm|bsl|os|xml|md|txt)$/i.test(p);}
// Браузер кодирует кириллицу в URL. Alias ссылается на те же проверенные байты;
// неизвестные пути и Account/API не получают нового допуска.
export function addEncodedPublicAliases(manifest){let added=0;for(const[p,value]of [...manifest]){if(!publicCandidateFile(p))continue;const encoded=encodeURI(p);if(encoded!==p&&!manifest.has(encoded)){manifest.set(encoded,value);added++;}}return added;}
export function staticKey(raw,manifest){const u=new URL(raw);if(u.origin!==ACCOUNT_ORIGIN)return null;if(u.pathname==='/nexus-shell.html'&&!u.search)return'nexus-shell.html';if(!u.pathname.startsWith(PREFIX)||u.search&&!/^\?v=[A-Za-z0-9._-]+$/.test(u.search))return null;const p=u.pathname.slice(PREFIX.length);if(!publicCandidateFile(p)||!manifest.has(p))return null;return p;}
export function allowedAuthWrite(raw,method){const u=new URL(raw);return u.origin===ACCOUNT_ORIGIN&&method==='POST'&&!u.search&&new Set(['/api/v2/account/passkey/authenticate/options','/api/v2/account/passkey/authenticate/verify','/api/v2/account/passkey/logout','/api/v2/account/oauth/google/start','/api/v2/account/oauth/yandex/start']).has(u.pathname);}
