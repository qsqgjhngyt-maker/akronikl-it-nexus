// Разметка/CSS присутствуют до первого paint, без ожидания JS или Account.
// Нативный summary позволяет пропустить даже при задержке/сбое JavaScript.
import {readIntroPreference,readIntroHandoff,skipAutomaticIntro} from './startup-intro-policy.js';
export const INTRO_COVER_STYLE='<style data-startup-cover-style>html{background:#02060b}#nexus-startup-cover{position:fixed;inset:0;z-index:2147483646;box-sizing:border-box;margin:0;padding:0;border:0;background:#02060b;color:#fff}#nexus-startup-cover[open]{animation:nexus-cover-release 12s steps(1,end) forwards!important}#nexus-startup-cover:not([open]){display:none}#nexus-startup-cover>summary{position:absolute;top:max(24px,env(safe-area-inset-top));right:max(18px,env(safe-area-inset-right));box-sizing:border-box;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:18px;min-width:142px;min-height:48px;padding:12px 20px;border:1px solid #c9edf32e;border-radius:99px;background:#07111f4d;color:#fff;font:13px system-ui,sans-serif;opacity:.55;cursor:pointer}#nexus-startup-cover>summary::-webkit-details-marker{display:none}#nexus-startup-cover>summary:hover,#nexus-startup-cover>summary:focus-visible{opacity:1}#nexus-startup-cover>summary:focus-visible{outline:2px solid #78e7d2;outline-offset:4px}@media(max-width:1200px) and (orientation:portrait){#nexus-startup-cover{background-image:radial-gradient(ellipse at 50% 43%,#173957 0,transparent 62%),radial-gradient(circle at 27% 31%,#83d4ed88 0 1px,transparent 2px),radial-gradient(circle at 73% 59%,#83d4ed66 0 1px,transparent 2px);}}@keyframes nexus-cover-release{from{visibility:visible}to{visibility:hidden;pointer-events:none}}</style><noscript><style>#nexus-startup-cover{display:none!important}</style></noscript>';
export const INTRO_COVER_HTML='<details id="nexus-startup-cover" data-startup-cover open aria-label="Запуск Nexus"><summary>Пропустить <span aria-hidden="true">↗</span></summary></details>';
export function withStartupCover(html){
 if(html.includes('data-startup-cover-style'))return html.replace(/<style data-startup-cover-style>[\s\S]*?<\/style>/,INTRO_COVER_STYLE.split('<noscript>')[0]);
 return html.replace('</head>',INTRO_COVER_STYLE+'</head>').replace(/<body([^>]*)>/,'<body$1>'+INTRO_COVER_HTML);
}
export function releaseIntroCover(suppressAuto=false){
 if(suppressAuto)document.documentElement.dataset.nexusIntroDismissed='true';
 document.querySelector('[data-startup-cover]')?.remove();
}
export const introCoverDismissed=()=>document.documentElement.dataset.nexusIntroDismissed==='true';
export function prepareIntroCover(){
 if(skipAutomaticIntro({hash:globalThis.location?.hash,navigationType:globalThis.performance?.getEntriesByType?.('navigation')?.[0]?.type})){releaseIntroCover(true);return false}
 const cover=document.querySelector('[data-startup-cover]');if(!cover)return !introCoverDismissed();
 let enabled=false,handoff=false;try{enabled=readIntroPreference(localStorage).value.enabled;handoff=readIntroHandoff(sessionStorage)}catch{}
 if(!cover.open||getComputedStyle(cover).visibility==='hidden'||!enabled||handoff){releaseIntroCover(true);return false}
 cover.addEventListener('toggle',()=>{if(!cover.open)releaseIntroCover(true)});
 const visibility=()=>{if(!cover.isConnected){document.removeEventListener('visibilitychange',visibility);return}cover.style.setProperty('animation-play-state',document.hidden?'paused':'running','important')};
 visibility();document.addEventListener('visibilitychange',visibility);return true;
}
