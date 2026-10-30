// Public visual launch runs alongside entry/auth scripts; it does not wait for them.
import {installStartupIntro} from './startup-intro.js';
const start=()=>{
 if(document.readyState==='loading'&&!document.querySelector('#app,.entry-footer')){requestAnimationFrame(start);return;}
 void installStartupIntro().catch(()=>{});
};
start();
