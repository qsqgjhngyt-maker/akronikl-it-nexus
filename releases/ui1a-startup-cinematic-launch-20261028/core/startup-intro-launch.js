// UI запуска независим от Account, bootstrap и готовности #app.
requestAnimationFrame(()=>setTimeout(()=>{
 void import('./startup-intro.js').then(m=>m.installStartupIntro({surface:'shell'})).catch(()=>{});
},0));
