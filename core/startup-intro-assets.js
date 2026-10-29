// Необязательные публичные видео. Не читают Account и не входят в SW install.
// Старые cinematic-v3/v4 остаются побайтно неизменными для отката.
export const INTRO_VIDEO_BASE='https://storage.yandexcloud.net/akronikl-p4q-public-intro-20261029-5c91ede9/intro-media/cinematic-v6/';
export const INTRO_ASSETS=Object.freeze({desktop:{version:'cinematic-v6',mp4Codec:'avc1.4D4028',seconds:10},mobile:{version:'cinematic-v6',mp4Codec:'avc1.4D4028',seconds:8}});
export function introMediaQuality({deviceMemory,hardwareConcurrency,connection}={},variant='desktop'){
 const positive=value=>typeof value==='number'&&Number.isFinite(value)&&value>0;
 // На телефоне единый поток 720p: отсутствие browser hints не означает быстрый decoder.
 if(variant==='mobile')return 'lite';
 const constrained=(positive(deviceMemory)&&deviceMemory<=4)||(positive(hardwareConcurrency)&&hardwareConcurrency<=4);
 const slow=positive(connection?.downlink)&&connection.downlink<3;
 return constrained||slow?'lite':'full';
}
export function introVideoURL(variant,format,base=INTRO_VIDEO_BASE,quality='full'){
 if(!['desktop','mobile'].includes(variant)||!['mp4','webm'].includes(format)||!['full','lite'].includes(quality))throw Error('INTRO_MEDIA_INVALID');
 const url=new URL(base);if(url.username||url.password||url.search||url.hash||!url.pathname.endsWith('/intro-media/cinematic-v6/')||(url.href!==INTRO_VIDEO_BASE&&url.origin!==globalThis.location?.origin))throw Error('INTRO_MEDIA_ORIGIN_REJECTED');
 return new URL(variant+(quality==='lite'?'-lite':'')+'.'+format,url).href;
}
