// Реальный ESM graph import. Browser entry проверяется нативными browser suites.
for(const file of ['core/shell-presentation.js','core/lesson-presentation.js','core/academy-catalog.js','core/code-hub-presentation.js','core/blog-presentation.js','core/blog-seeds.js','pwa/offline-presentation.js','pwa/offline-graphics.js','pwa/install.js']){
 const module=await import(new URL('../'+file,import.meta.url));if(!Object.keys(module).length)throw Error('Empty ESM export: '+file);console.log('PASS ESM import '+file)
}
