// Проверщик интерфейса определяет поколение по своему immutable URL.
// Его mount и участники сохранения должны использовать один модуль поколения.
import assert from'node:assert/strict';import{createHash}from'node:crypto';
export const GENERATION_OWNED_FILES=Object.freeze(['pwa/interface-update.js']);
export const UPDATE_PARTICIPANT_IMPORTERS=Object.freeze(['core/app.js','pwa/offline-entry.js','core/content-editor.js','project-studio/project-studio.js','course-final/view.js']);
export async function assertGenerationOwnedUpdateGraph(manifest,read){
 assert.match(manifest.generation,/^ui1a-[a-z0-9-]+$/);const prefix='/releases/'+manifest.generation+'/',rows=new Map(manifest.files.map(r=>[r.path,r])),modulePath=prefix+GENERATION_OWNED_FILES[0],origin='https://publication.invalid';
 async function body(url){const r=rows.get(url);assert.ok(r?.immutable,'GENERATION_OWNED_MODULE_REQUIRED: '+url);const b=await read(url);assert.equal(b.length,r.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),r.sha256);return b.toString('utf8');}
 await body(modulePath);for(const file of UPDATE_PARTICIPANT_IMPORTERS){const url=prefix+file,s=await body(url),imports=[...s.matchAll(/\bfrom\s*['"]([^'"]*interface-update\.js[^'"]*)['"]/g)];assert.equal(imports.length,1,'ONE_UPDATE_SINGLETON_IMPORT_REQUIRED: '+file);const target=new URL(imports[0][1],origin+url);assert.equal(target.href,origin+modulePath,'UPDATE_PARTICIPANT_GENERATION_MISMATCH: '+file);}
 return{generation:manifest.generation,module:modulePath,participants:UPDATE_PARTICIPANT_IMPORTERS.length,singleUpdateParticipantRegistry:true};
}
