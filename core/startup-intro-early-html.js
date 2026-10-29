// Pure build/server transform. Only public, immutable, same-origin resources.
export function withEarlyIntro(html,generation){
 if(!/^ui1a-[a-z0-9-]+$/.test(generation))throw Error('INTRO_GENERATION_INVALID');
 html=html.replace(/<script\b[^>]*\bdata-startup-intro-early\b[^>]*><\/script>/g,'').replace(/<link\b(?=[^>]*\brel=["'](?:modulepreload|preload)["'])(?=[^>]*\bhref=["']\/releases\/ui1a-[a-z0-9-]+\/(?:core\/startup-intro\.js|styles\/startup-intro\.css)["'])[^>]*>/g,'');
 const base='/releases/'+generation+'/';
 const tags='<link rel="modulepreload" fetchpriority="high" href="'+base+'core/startup-intro.js"><link rel="preload" as="style" href="'+base+'styles/startup-intro.css"><script type="module" async fetchpriority="high" data-startup-intro-early src="'+base+'core/startup-intro-early.js"></script>';
 return html.replace(/<script\b[^>]*\bsrc=["'](?:\.\/|\/)?releases\/ui1a-[a-z0-9-]+\/core\/startup-intro-launch\.js["'][^>]*><\/script>/g,'').replace('</head>',tags+'</head>');
}
