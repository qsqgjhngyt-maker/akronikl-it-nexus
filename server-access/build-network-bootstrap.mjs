import {build} from 'esbuild';
import {readFile,mkdir} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import path from 'node:path';
export async function buildNetworkBootstrap(outfile=fileURLToPath(new URL('./image/bff/network-bootstrap.mjs',import.meta.url))){
 const root=new URL('./',import.meta.url),license=await readFile(new URL('node_modules/undici/LICENSE',root),'utf8');
 await mkdir(path.dirname(outfile),{recursive:true});
 await build({absWorkingDir:fileURLToPath(root),entryPoints:[fileURLToPath(new URL('bff/network-bootstrap.mjs',root))],outfile,bundle:true,platform:'node',format:'esm',target:'node22',external:['./server.mjs'],banner:{js:'/*! undici 7.29.1\n'+license.replaceAll('*/','* /')+' */\n'+"import {createRequire as __nexusRequireFactory} from 'node:module'; const require=__nexusRequireFactory(import.meta.url);"},logLevel:'warning'});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildNetworkBootstrap(process.argv[2]?path.resolve(process.argv[2]):undefined);
