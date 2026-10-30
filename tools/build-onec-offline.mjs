import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath}from'node:url';import {createHash}from'node:crypto';
export async function buildOnecOffline(output){
 const root=fileURLToPath(new URL('../',import.meta.url)),base=path.join(root,'courses/onec-education'),out=path.resolve(output);
 try{await fs.access(out);throw Error('OUTPUT_EXISTS')}catch(error){if(error.code!=='ENOENT')throw error;}
 await fs.mkdir(out,{recursive:true});
 const data={};for(const course of ['onec','1c-enterprise']){const c=JSON.parse(await fs.readFile(path.join(root,`courses/${course}/curriculum.json`),'utf8'));data[`../${course}/curriculum.json`]=c;for(const t of c.modules[0].topics)for(const locale of ['ru','en']){const f=t.content[locale];data[`../${course}/${f}`]=JSON.parse(await fs.readFile(path.join(root,`courses/${course}/${f}`),'utf8'));}}
 for(const f of ['shared.v1.json','supplement.v1.json','service-desk.v1.json','sources.v1.json'])data[f]=JSON.parse(await fs.readFile(path.join(base,f),'utf8'));
 data['native/service-desk/Ext/ManagedApplicationModule.bsl']=await fs.readFile(path.join(base,'native/service-desk/Ext/ManagedApplicationModule.bsl'),'utf8');
 data['native/README_RU.md']=await fs.readFile(path.join(base,'native/README_RU.md'),'utf8');
 const model=(await fs.readFile(path.join(base,'model.mjs'),'utf8')).replace(/^export /gm,''),app=(await fs.readFile(path.join(base,'candidate.mjs'),'utf8')).replace(/^import .*?;\r?\n/,'');
 const script=`globalThis.__ONEC_OFFLINE__=${JSON.stringify(data).replace(/</g,'\\u003c')};\n${model}\n${app}`;
 const hash=createHash('sha256').update(script).digest('base64'),css=await fs.readFile(path.join(base,'candidate.css'),'utf8');
 let html=await fs.readFile(path.join(base,'index.html'),'utf8');
 html=html.replace('<link rel="stylesheet" href="./candidate.css">',`<style>${css}</style>`).replace('<script type="module" src="./candidate.mjs"></script>',`<script type="module">${script}</script>`).replace('<meta charset="utf-8">',`<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'">`);
 await fs.writeFile(path.join(out,'onec-offline.html'),html);
 await fs.cp(path.join(base,'native'),path.join(out,'native'),{recursive:true});
 await fs.mkdir(path.join(out,'tools'));await fs.copyFile(path.join(root,'tools/check-onec-native.ps1'),path.join(out,'tools/check-onec-native.ps1'));
 await fs.writeFile(path.join(out,'README_RU.txt'),'Откройте onec-offline.html в браузере. Теория, вопросы и модели работают без сети. Локальный самоотчёт этого файла отделён от online-происхождения. Платформа 1С не входит в пакет. native/ содержит оригинальные метаданные и модуль; tools/check-onec-native.ps1 поддерживает этот переносимый набор. Сначала прочитайте native/README_RU.md.\n');
 const bytes=Buffer.byteLength(html);if(bytes>650000)throw Error('OFFLINE_PACKAGE_BUDGET_EXCEEDED');
 const result={status:'IMPLEMENTED',htmlBytes:bytes,sha256:createHash('sha256').update(html).digest('hex'),networkRequiredForTheory:false,platformIncluded:false,accountProgressIntegrated:false};
 await fs.writeFile(path.join(out,'MANIFEST.json'),JSON.stringify(result,null,2)+'\n');return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await buildOnecOffline(process.argv[2]||'onec-offline-package')));
