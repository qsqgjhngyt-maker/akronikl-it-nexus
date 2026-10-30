// Manual isolated preview. No deployment and no automatic inference.
import {fileURLToPath} from 'node:url';
import {readQwenKey,startQwenQaServer} from './qwen-gateway.mjs';
try{
 const key=await readQwenKey(process.env.NEXUS_QWEN_KEY_FILE);
 const server=await startQwenQaServer({root:fileURLToPath(new URL('../../',import.meta.url)),apiKey:key});
 console.log(JSON.stringify({url:server.origin,model:'qwen3.7-plus',scope:'localhost QA only',automaticInference:false}));
 process.once('SIGINT',async()=>{await server.close();});
}catch{console.error('CLOUD_KEY_REQUIRED: configure DASHSCOPE_API_KEY or NEXUS_QWEN_KEY_FILE outside the repository.');process.exitCode=1;}
