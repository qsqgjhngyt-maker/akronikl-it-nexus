// UI запуска независим от Account, bootstrap и готовности #app.
import {prepareIntroCover,releaseIntroCover} from './startup-intro-cover.js';
prepareIntroCover();
requestAnimationFrame(()=>setTimeout(()=>{
 void import('./startup-intro.js').then(m=>m.installStartupIntro({surface:'shell'})).catch(()=>releaseIntroCover(true));
},0));
