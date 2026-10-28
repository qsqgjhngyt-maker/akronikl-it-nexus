// Восстановленный мобильный путь принятого PR49: тот же origin, исходные
// Full HD части без нового перекодирования. Desktop остаётся на cinematic-v4.
export function mobileIntroURL(format,moduleURL=import.meta.url){
 if(!['mp4','webm'].includes(format))throw Error('INTRO_MOBILE_FORMAT_INVALID');
 const prefix=new URL(moduleURL).pathname.includes('/releases/')?'../../':'../releases/';
 return new URL(prefix+'ui1a-startup-first-paint-20261028/intro-media/cinematic-v3/mobile.'+format,moduleURL).href;
}
