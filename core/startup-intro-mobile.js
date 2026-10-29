// Мобильный сюжет сохранён; четыре части объединены в один нативный поток.
import {INTRO_VIDEO_BASE,introVideoURL} from './startup-intro-assets.js';
export function mobileIntroURL(format,base=INTRO_VIDEO_BASE){return introVideoURL('mobile',format,base)}
