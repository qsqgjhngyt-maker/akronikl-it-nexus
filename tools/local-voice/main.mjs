import {readFile,mkdir} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createLocalSpeechProvider} from '../qa-akronikl/local-speech.mjs';import {startLocalVoiceCompanion} from '../qa-akronikl/local-voice-companion.mjs';
const config=JSON.parse((await readFile(process.argv[2],'utf8')).replace(/^\uFEFF/,'')),base=path.dirname(fileURLToPath(import.meta.url));
if(!config||Object.keys(config).some(k=>!['python','modelDirectory','privateDirectory','port'].includes(k))||config.port!==undefined&&(!Number.isInteger(config.port)||config.port<0||config.port>65535))throw Error('SPEECH_CONFIG_INVALID');
await mkdir(config.privateDirectory,{recursive:true});const speech=createLocalSpeechProvider({...config,referenceFile:path.join(base,'uyut7-narrator.wav'),fastMode:true});
let companion;try{companion=await startLocalVoiceCompanion({speech,...(config.port!==undefined?{port:config.port}:{})});console.log(JSON.stringify({status:'LOCAL_VOICE_READY',endpoint:companion.endpoint,cloudModelCalls:0}));}catch(e){await speech.close();console.error('LOCAL_VOICE_START_FAILED:'+(/^[A-Z_]+$/.test(e.code??'')?e.code:'SERVICE_UNAVAILABLE'));process.exitCode=1;}
for(const event of ['SIGTERM','SIGINT'])process.once(event,()=>{void companion?.close().finally(()=>process.exit(0));});
