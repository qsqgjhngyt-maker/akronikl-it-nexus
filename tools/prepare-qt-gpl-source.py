"""Локальный комплект исходников. Не публикует, не меняет облако/старые проекты."""
import argparse, pathlib, hashlib, json, tarfile, shutil, subprocess
parser=argparse.ArgumentParser()
parser.add_argument('--qt-source',required=True)
parser.add_argument('--out',required=True)
args=parser.parse_args()
repo=pathlib.Path(__file__).resolve().parent.parent
source=pathlib.Path(args.qt_source).resolve(); out=pathlib.Path(args.out).resolve()
expected='56001b905601bb9023d399f3ba780d7fa940f3e4861e496a7c490331f49e0b80'
assert source.stat().st_size==48426536 and hashlib.sha256(source.read_bytes()).hexdigest()==expected, 'QT_SOURCE_INTEGRITY'
out.mkdir(exist_ok=False)
shutil.copyfile(source,out/source.name)
licenses=out/'licenses';licenses.mkdir()
with tarfile.open(source,'r:xz') as archive:
 for member in archive.getmembers():
  prefix='qtbase-everywhere-src-6.8.3/LICENSES/'
  if member.isfile() and member.name.startswith(prefix):
   name=member.name[len(prefix):]
   assert '/' not in name and len(name)<160
   (licenses/name).write_bytes(archive.extractfile(member).read())
 assert (licenses/'GPL-3.0-only.txt').exists()
# Полный установленный Emscripten source, включая системные библиотеки и notices.
# Исключены только build cache, VCS, node_modules и генерируемый Python bytecode.
code=r'''
import pathlib,tarfile,sys,json,hashlib
root=pathlib.Path('/emsdk/upstream/emscripten')
excluded={'cache','.git','node_modules','__pycache__','.pytest_cache'}
with tarfile.open(fileobj=sys.stdout.buffer,mode='w|xz') as archive:
 for p in sorted(root.rglob('*')):
  rel=p.relative_to(root)
  if any(x in excluded for x in rel.parts):continue
  if not p.is_file() or p.is_symlink() or p.suffix=='.pyc':continue
  item=archive.gettarinfo(str(p),'emscripten-3.1.56/'+rel.as_posix())
  item.uid=item.gid=0;item.uname=item.gname='';item.mtime=0
  with p.open('rb') as f:archive.addfile(item,f)
'''
image='nexus-m6-qt:6.8.3-ems3.1.56'
image_id=subprocess.check_output(['docker','image','inspect',image,'--format','{{.Id}}'],text=True).strip()
assert image_id=='sha256:d6bcaf3ab7c3ebe08b38ea816ee67acbe366421701d99210fd355ce2a8ccb9ef','SDK_IMAGE_CHANGED'
target=out/'emscripten-3.1.56-installed-source.tar.xz'
with target.open('xb') as output:
 subprocess.run(['docker','run','--rm','--network','none','--read-only','--entrypoint','python3',image,'-c',code],stdout=output,check=True,timeout=240)
with tarfile.open(target,'r:xz') as archive:
 for name in ['LICENSE','AUTHORS','emscripten-version.txt']:
  data=archive.extractfile('emscripten-3.1.56/'+name).read()
  (licenses/('Emscripten-'+name.replace('.txt','')+'.txt')).write_bytes(data)
 assert archive.getmember('emscripten-3.1.56/system/lib/libc/musl/COPYRIGHT')
 assert archive.getmember('emscripten-3.1.56/system/lib/libcxx/LICENSE.TXT')
scripts=out/'nexus-source';scripts.mkdir()
(scripts/'package.json').write_text('{"private":true,"type":"module","engines":{"node":">=22"}}\n',encoding='utf-8')
for name in ['studio-build/browser-qt/host.cpp','studio-build/browser-qt/CMakeLists.txt','studio-build/browser-qt/export-generator.py','studio-build/browser-qt/rebuild-qt-sdk.sh','studio-build/browser-qt/SOURCE_AND_LICENSE_RU.md','studio-build/containers/qt-wasm.Dockerfile','studio-build/docker-runner.mjs','studio-build/preview.mjs','tools/prepare-qt-browser-runtime.mjs','project-studio/project-transfer.js','project-studio/project-templates.js','project-studio/application-template.js','project-studio/application-license.js','sandbox/code-workspace.js','sandbox/virtual-files.js','sandbox/qt/preview/index.html','sandbox/qt/preview/preview.js','sandbox/qt/verified-pack.js','sandbox/qt/profile.js']:
 destination=scripts/name;destination.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(repo/name,destination)
shutil.copyfile(repo/'studio-build/browser-qt/SOURCE_AND_LICENSE_RU.md',out/'README_RU.md')
shutil.copyfile(licenses/'GPL-3.0-only.txt',out/'COPYING.txt')
(out/'index.html').write_text('''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Qt · исходники и лицензии</title><body><main><h1>Qt browser runtime — исходники / source</h1><p>Qt6.8.3 + Emscripten3.1.56. Новый адаптер: Copyright2026 AKRONIKL IT NEXUS contributors. GPLv3, без гарантии / without warranty. Вы можете изучать, изменять и передавать программу и её исходники на условиях GPLv3.</p><ul><li><a href="COPYING.txt">GPLv3</a></li><li><a href="README_RU.md">Состав, уведомления и порядок сборки</a></li><li><a href="qtbase-everywhere-src-6.8.3.tar.xz">Полный QtBase6.8.3 source</a></li><li><a href="emscripten-3.1.56-installed-source.tar.xz">Emscripten source и системные библиотеки</a></li><li><a href="nexus-source.tar.gz">Исходники и scripts адаптера Nexus</a></li><li><a href="SOURCE_MANIFEST.json">SHA256 inventory</a></li></ul><p>Личные работы автоматически не публикуются. / Private student work is not automatically published.</p></main></body></html>''',encoding='utf-8')
# Архив только перечисленных source files, без локальных профилей/секретов/работ.
import gzip,io
buffer=io.BytesIO()
with tarfile.open(fileobj=buffer,mode='w') as archive:
 for p in sorted(scripts.rglob('*')):
  if p.is_file():
   item=archive.gettarinfo(str(p),'nexus-source/'+p.relative_to(scripts).as_posix());item.uid=item.gid=0;item.uname=item.gname='';item.mtime=0
   with p.open('rb') as data:archive.addfile(item,data)
(out/'nexus-source.tar.gz').write_bytes(gzip.compress(buffer.getvalue(),mtime=0))
rows=[{'path':p.relative_to(out).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(out.rglob('*')) if p.is_file()]
receipt={'status':'LOCAL SOURCE INVENTORY / REBUILD AND PUBLIC DELIVERY GATES OPEN','imageId':image_id,'qt':'6.8.3','emscripten':'3.1.56','licenseRoute':'GPL-3.0-only','files':rows,'published':False,'existingWorksRelicensed':False}
(out/'SOURCE_MANIFEST.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':receipt['status'],'files':len(rows),'bytes':sum(r['bytes'] for r in rows),'published':False}))
