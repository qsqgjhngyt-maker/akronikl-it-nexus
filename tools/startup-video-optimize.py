"""Воспроизводимая оптимизация двух утверждённых сюжетов; старые bytes не меняются."""
from pathlib import Path
import hashlib, json, subprocess, tempfile, shutil, struct
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'intro-media/cinematic-v6'
SOURCES={
 'intro-media/cinematic-v4/desktop.mp4':'6e62cf069410cc28f4778c781525181e926875b4fc88efc62b9f8f3ad58f7333',
 'intro-media/cinematic-v3/mobile/mp4/part-000.mp4':'47241765636ef59f2e51f86b43fd24247ff2127847b89016054494687fc8b158',
 'intro-media/cinematic-v3/mobile/mp4/part-001.mp4':'39ce49b1dfda4f34330e1461dabd6a9fba14f2e1363338e12c1ff150df1dc9f4',
 'intro-media/cinematic-v3/mobile/mp4/part-002.mp4':'9500c4135e953f3bd16758f46feb77d12bcd5eeb077fd9cbb1bf06c4f564fce9',
 'intro-media/cinematic-v3/mobile/mp4/part-003.mp4':'0e1244fb9dfa2be23c2a88a58a84fb8fc9b64398adf638201553b4d6230bb695'
}
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def run(*args):subprocess.run(list(map(str,args)),check=True)
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]))
def atoms(p):
 b=p.read_bytes();pos=0;result=[]
 while pos+8<=len(b):
  n,t=struct.unpack('>I4s',b[pos:pos+8]);header=8
  if n==1:n=struct.unpack('>Q',b[pos+8:pos+16])[0];header=16
  if n==0:n=len(b)-pos
  if n<header or pos+n>len(b):raise ValueError('Некорректный MP4')
  result.append(t.decode('ascii'));pos+=n
 return result
for name,expected in SOURCES.items():
 if digest(ROOT/name)!=expected:raise ValueError('Исходный сюжет изменился: '+name)
if (OUT/'MANIFEST.json').exists():
 m=json.loads((OUT/'MANIFEST.json').read_text())
 if m['sources']!=SOURCES:raise ValueError('Изменилась provenance медиа')
 for name,item in m['outputs'].items():
  if digest(OUT/name)!=item['sha256']:raise ValueError('Изменены утверждённые bytes: '+name)
 print('Поколение cinematic-v6 уже собрано; проверены исходники и SHA256.');raise SystemExit(0)
with tempfile.TemporaryDirectory(prefix='nexus-intro-') as tmp:
 t=Path(tmp);playlist=t/'mobile.txt'
 playlist.write_text(''.join("file '"+str(ROOT/n).replace("'","'\\''")+"'\n" for n in SOURCES if '/mobile/' in n))
 run('ffmpeg','-v','error','-f','concat','-safe','0','-i',playlist,'-map','0:v:0','-an','-c','copy','-movflags','+faststart',t/'mobile-source.mp4')
 for variant,source in [('desktop',ROOT/'intro-media/cinematic-v4/desktop.mp4'),('mobile',t/'mobile-source.mp4')]:
  small=variant=='mobile';scale=['-vf','scale=720:1280:flags=lanczos'] if small else []
  run('ffmpeg','-v','error','-i',source,'-map','0:v:0','-an',*scale,'-c:v','libx264','-preset','medium','-crf','23' if small else '24','-maxrate','1400k' if small else '2500k','-bufsize','2800k' if small else '5000k','-pix_fmt','yuv420p','-profile:v','main','-level:v','3.1' if small else '4.0','-g','60','-keyint_min','30','-refs','2','-movflags','+faststart','-threads','4',t/(variant+'.mp4'))
  run('ffmpeg','-v','error','-i',source,'-map','0:v:0','-an',*scale,'-c:v','libvpx-vp9','-b:v','1400k' if small else '2500k','-crf','32','-deadline','good','-cpu-used','4','-row-mt','1','-threads','4','-g','60','-pix_fmt','yuv420p',t/(variant+'.webm'))
  run('ffmpeg','-v','error','-i',t/(variant+'.mp4'),*(['-vf','scale=1280:720'] if not small else []),'-frames:v','1','-q:v','3',t/(variant+'.jpg'))
 outputs={}
 for name in ['desktop.mp4','desktop.webm','desktop.jpg','mobile.mp4','mobile.webm','mobile.jpg']:
  p=t/name;item={'bytes':p.stat().st_size,'sha256':digest(p)}
  if p.suffix in ('.mp4','.webm'):
   data=probe(p);v=data['streams'][0];duration=float(data['format']['duration']);expected=8 if name.startswith('mobile') else 10
   if abs(duration-expected)>.05 or v['avg_frame_rate']!='30/1' or len(data['streams'])!=1:raise ValueError('Изменились длительность, FPS или потоки')
   item.update({'width':v['width'],'height':v['height'],'duration':duration,'fps':v['avg_frame_rate'],'codec':v['codec_name'],'bitrate':int(data['format']['bit_rate'])})
   if p.suffix=='.mp4':
    top=atoms(p)
    if top.index('moov')>top.index('mdat'):raise ValueError('Требуется faststart')
    if int(v['nb_frames'])!=expected*30:raise ValueError('Потеряны кадры')
    item.update({'frames':int(v['nb_frames']),'faststart':True})
  outputs[name]=item
 OUT.mkdir(parents=True,exist_ok=True)
 for name in outputs:shutil.copy2(t/name,OUT/name)
 manifest={'schema':1,'generation':'cinematic-v6','sources':SOURCES,'outputs':outputs,'note':'Desktop: прежний сюжет cinematic-v4. Mobile: прежние 4 части cinematic-v3 в исходном порядке, один поток. 30 fps, 10/8 секунд, без обрезки. Сжатие с потерями; мобильный размер 720x1280.','ffmpeg':subprocess.check_output(['ffmpeg','-version']).decode().splitlines()[0]}
 (OUT/'MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(manifest,ensure_ascii=False,indent=2))
