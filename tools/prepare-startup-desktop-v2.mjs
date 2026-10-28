// Полный новый Desktop: 300 исходных кадров, без trim. Mobile не записывается.
import assert from 'node:assert/strict';
import {readFile,mkdir,stat,mkdtemp,copyFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
const value=flag=>{const i=process.argv.indexOf(flag);return i<0?null:process.argv[i+1]},source=value('--source'),ffmpeg=value('--ffmpeg');assert.ok(source&&ffmpeg,'Нужны --source и --ffmpeg');
const digest=createHash('sha256').update(await readFile(source)).digest('hex');assert.equal(digest,'21fdd3ae2d9bbcbcbb142adcd9a45c17a47b71a63c80c54c790e032cb5cf4108','Нужен именно новый ролик владельца');
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'intro-media/cinematic-v2');await mkdir(out,{recursive:true});
// Короткий относительный путь нужен x264/Windows; готовые assets заменяются
// только после успешных двух проходов и проверки всех выходных файлов.
const logs=path.relative(root,await mkdtemp(path.join(root,'..','ev2-'))).split(path.sep).join('/');
function run(args){const r=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-y',...args],{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:10*1024*1024});assert.equal(r.status,0,r.stderr)}
const common=['-i',source,'-map','0:v:0','-an','-sn','-dn','-map_metadata','-1','-fps_mode','passthrough'];
const avc=['-c:v','libx264','-threads','4','-preset','slow','-profile:v','main','-level:v','4.0','-pix_fmt','yuv420p','-b:v','1750k','-maxrate','2300k','-bufsize','4600k','-passlogfile',path.join(logs,'avc')];
run([...common,...avc,'-pass','1','-f','null','-']);run([...common,...avc,'-pass','2','-movflags','+faststart',logs+'/desktop.mp4']);
const vp9=['-c:v','libvpx-vp9','-threads','4','-b:v','1700k','-maxrate','2300k','-bufsize','4600k','-row-mt','1','-cpu-used','4','-deadline','good','-pix_fmt','yuv420p','-passlogfile',path.join(logs,'vp9')];
run([...common,...vp9,'-pass','1','-f','null','-']);run([...common,...vp9,'-pass','2',logs+'/desktop.webm']);
run(['-i',source,'-vf','select=eq(n\\,299),scale=1280:720','-frames:v','1','-q:v','3',logs+'/desktop.jpg']);
for(const name of ['desktop.mp4','desktop.webm','desktop.jpg'])assert.ok((await stat(path.resolve(root,logs,name))).size<2400000,'Нужен запас к документированному лимиту ответа Gateway');
for(const name of ['desktop.mp4','desktop.webm','desktop.jpg']){const file=path.join(out,name);await copyFile(path.resolve(root,logs,name),file);const bytes=await readFile(file);console.log({file:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')})}
