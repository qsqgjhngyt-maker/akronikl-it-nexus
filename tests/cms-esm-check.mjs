import assert from 'node:assert/strict';
for(const file of ['core/private-response-policy.js','core/account-control-api.js','core/content-editor.js','core/administration.js','server-access/bff/account-control.mjs','server-access/bff/content.mjs']){
 const module=await import(new URL('../'+file,import.meta.url));assert.ok(Object.keys(module).length,file);console.log('PASS реальный ESM import '+file);
}
