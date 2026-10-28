// Прежний мобильный декодер и Full HD части PR49; доставка с уже
// разрешённого собственного статического адреса, без проксирования Gateway.
import {INTRO_VIDEO_BASE,introVideoURL} from './startup-intro-assets.js';
export function mobileIntroURL(format,base=INTRO_VIDEO_BASE){
 return introVideoURL('mobile',format,base).replace('/cinematic-v4/','/cinematic-v3/');
}
