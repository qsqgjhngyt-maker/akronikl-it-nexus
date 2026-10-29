// Использует только два подтверждённых оригинала. Бесплатный локальный FFmpeg.
import {readFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const arg=name=>{const i=process.argv.indexOf('--'+name);if(i<0||!process.argv[i+1])throw Error('Нужен --'+name);return process.argv[i+1]};
const ffmpeg=arg('ffmpeg'),out=path.resolve(arg('out'));
const inputs=[['desktop',arg('desktop'),'83d8207dd82e6051f2e74ec0c8721020e2e9b4baae88804ef604ec909bed5f3f','1280:720'],['mobile',arg('mobile'),'023e6ef9b0ffa9e01610468d8c6c78b4b7e7ca11e6a6006b693b6bfe654102d4','720:1280']];
for(const [kind,input,sha]of inputs){if(createHash('sha256').update(await readFile(input)).digest('hex')!==sha)throw Error('Оригинал не совпадает: '+kind);if(path.dirname(path.resolve(input))===out)throw Error('Вывод должен быть отдельно от оригиналов')}
await mkdir(out,{recursive:true});
const run=args=>{const r=spawnSync(ffmpeg,['-y','-hide_banner','-loglevel','error',...args],{stdio:'inherit',windowsHide:true});if(r.status!==0)throw Error('FFmpeg завершился с ошибкой')};
for(const [kind,input,,scale]of inputs){
 const common=['-i',input,'-map','0:v:0','-an','-map_metadata','-1','-vf','scale='+scale,'-pix_fmt','yuv420p'];
 run([...common,'-c:v','libx264','-preset','slow','-crf','30','-profile:v','main','-level','3.1','-movflags','+faststart',path.join(out,kind+'.mp4')]);
 run([...common,'-c:v','libvpx-vp9','-crf','42','-b:v','0','-deadline','good','-cpu-used','3','-row-mt','1',path.join(out,kind+'.webm')]);
 run(['-ss','3','-i',input,'-frames:v','1','-vf','scale='+scale,'-q:v','6','-map_metadata','-1',path.join(out,kind+'.jpg')]);
}
