// No credential arguments or files: choose provider/model and paste a key in UI.
import {fileURLToPath} from 'node:url';
import {startCloudSettingsServer} from './cloud-settings-gateway.mjs';
const server=await startCloudSettingsServer({personalPreview:true,root:fileURLToPath(new URL('../../',import.meta.url))});
console.log(JSON.stringify({url:server.origin,credentialsFrom:'settings UI only',automaticInference:false,scope:'isolated localhost'}));
process.once('SIGINT',()=>server.close());process.once('SIGTERM',()=>server.close());
