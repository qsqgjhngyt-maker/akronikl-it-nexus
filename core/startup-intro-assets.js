// Только публичные видео: отдельный стабильный каталог нашего статического сайта.
// credentials для cross-origin media не передаются (crossOrigin=anonymous).
export const INTRO_VIDEO_BASE='https://qsqgjhngyt-maker.github.io/akronikl-it-nexus/intro-media/cinematic-v6/';
export const INTRO_ASSETS=Object.freeze({desktop:{version:'cinematic-v6',mp4Codec:'avc1.4D4028',seconds:10},mobile:{version:'cinematic-v6',mp4Codec:'avc1.4D401F',seconds:8}});
export function introVideoURL(variant,format,base=INTRO_VIDEO_BASE){
 if(!['desktop','mobile'].includes(variant)||!['mp4','webm'].includes(format))throw Error('INTRO_MEDIA_INVALID');
 const url=new URL(base);if(url.username||url.password||url.search||url.hash||!url.pathname.endsWith('/intro-media/cinematic-v6/')||(url.href!==INTRO_VIDEO_BASE&&url.origin!==location.origin))throw Error('INTRO_MEDIA_ORIGIN_REJECTED');
 return new URL(variant+'.'+format,url).href;
}
