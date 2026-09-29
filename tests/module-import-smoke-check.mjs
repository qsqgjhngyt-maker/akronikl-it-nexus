const modules=[
  '../core/account-shell.js',
  '../project-studio/project-studio.js',
  '../sync/cloud-sync.js',
  '../sync/cloudflare-provider.js',
  '../sync/identity-v2-client.js'
];

for(const modulePath of modules){
  try{
    await import(new URL(modulePath,import.meta.url));
    console.log(`PASS import ${modulePath}`);
  }catch(error){
    console.error(`FAIL import ${modulePath}`);
    console.error(error);
    process.exit(1);
  }
}

console.log('MODULE_IMPORT_SMOKE_PASS');
