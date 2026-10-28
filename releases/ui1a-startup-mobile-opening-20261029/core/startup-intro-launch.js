// UI запуска независим от Account, bootstrap и готовности #app.
import {prepareIntroCover,releaseIntroCover} from '../../ui1a-startup-mobile-restore-20261029/core/startup-intro-cover.js';
prepareIntroCover();
requestAnimationFrame(()=>setTimeout(()=>{
 void import('./startup-intro.js').then(m=>m.installStartupIntro({surface:'shell'})).catch(()=>releaseIntroCover(true));
},0));
