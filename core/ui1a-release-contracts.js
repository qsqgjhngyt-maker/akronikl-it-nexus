import {isServerAccountOrigin} from './server-account-origin.js';
// Alpha2: серверные вход и отзывы включаются только на фиксированном origin Gateway.
// На GitHub Pages нет credential/API transport; вход открывается на серверном origin.
export const RELEASE_CONTRACTS=Object.freeze({pwa:true,serverPasskeyAccess:isServerAccountOrigin(),serverFeedback:isServerAccountOrigin()});
