import {isServerAccountOrigin} from './server-account-origin.js';
// Подготовленный access-кандидат. Публикация и backend activation пока не выполнены.
// На GitHub Pages нет credential/API transport; вход открывается на серверном origin.
export const RELEASE_CONTRACTS=Object.freeze({pwa:false,serverPasskeyAccess:isServerAccountOrigin(),serverFeedback:isServerAccountOrigin()});
