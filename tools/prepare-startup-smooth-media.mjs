// Цельные1080p-файлы: нативные B-frames/faststart вместо переключения decoder.
import assert from 'node:assert/strict';import {readFile,mkdir,mkdtemp,writeFile,copyFile} from 'node:fs/promises';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';import path from 'node:path';
const value=f=>{const i=process.argv.indexOf(f);return i<0?null:process.argv[i+1]},ffmpeg=value('--ffmpeg');assert.ok(ffmpeg);const root=path.resolve(import.meta.dirname,'..'),temp=await mkdtemp(path.join(root,'..','smooth-source-')),out=path.join(root,'intro-media/cinematic-v4');await mkdir(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const sources={desktop:{path:value('--desktop'),sha:'21fdd3ae2d9bbcbcbb142adcd9a45c17a47b71a63c80c54c790e032cb5cf4108',parts:5},mobile:{path:value('--mobile'),sha:'023e6ef9b0ffa9e01610468d8c6c78b4b7e7ca11e6a6006b693b6bfe654102d4',parts:4}};
function run(args){const r=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-y',...args],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr)}
for(const [kind,source]of Object.entries(sources)){
 assert.ok(source.path);assert.equal(hash(await readFile(source.path)),source.sha);
 run(['-i',source.path,'-map','0:v:0','-an','-sn','-dn','-map_metadata','-1','-fps_mode','passthrough','-c:v','libx264','-threads','4','-preset','slow','-crf','20','-profile:v','main','-level:v','4.0','-pix_fmt','yuv420p','-maxrate','6M','-bufsize','12M','-movflags','+faststart',path.join(temp,kind+'.mp4')]);
 const list=Array.from({length:source.parts},(_,i)=>"file '"+path.join(root,'intro-media/cinematic-v3',kind,'webm','part-'+String(i).padStart(3,'0')+'.webm').split(path.sep).join('/').replaceAll("'","'\\''")+"'\n").join(''),file=path.join(temp,kind+'-parts.txt');await writeFile(file,list);
 run(['-f','concat','-safe','0','-i',file,'-map','0:v:0','-c','copy','-an',path.join(temp,kind+'.webm')]);
 for(const ext of ['mp4','webm'])await copyFile(path.join(temp,kind+'.'+ext),path.join(out,kind+'.'+ext));await copyFile(path.join(root,'intro-media/cinematic-v3',kind+'.jpg'),path.join(out,kind+'.jpg'));
}
for(const kind of ['desktop','mobile'])for(const ext of ['mp4','webm','jpg']){const file=kind+'.'+ext,b=await readFile(path.join(out,file));console.log({file,bytes:b.length,sha256:hash(b)})}
