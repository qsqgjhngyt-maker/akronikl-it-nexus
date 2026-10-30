"""Build a clean Windows payload from reviewed local inference files; never download models.
Staging uses NTFS hardlinks to save disk space. Runtime runs isolated and read-only (-I -B).
ZIP archives contain regular file contents, not links or developer paths.
"""
import argparse,hashlib,json,os,shutil,sys,time,zipfile
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--out',required=True);p.add_argument('--module',required=True);p.add_argument('--python-base',required=True);p.add_argument('--site-packages',required=True);p.add_argument('--model',required=True);p.add_argument('--node',required=True);p.add_argument('--licenses',required=True);p.add_argument('--resume',action='store_true');a=p.parse_args()
out=Path(a.out).resolve();out.mkdir(parents=True,exist_ok=a.resume);stage=out/'payload';stage.mkdir(exist_ok=a.resume);base=Path(a.python_base).resolve();site=Path(a.site_packages).resolve();model=Path(a.model).resolve();files=[]
def emit(**v): print(json.dumps(v,ensure_ascii=True),flush=True)
def add(source,target):
    target.parent.mkdir(parents=True,exist_ok=True)
    if target.exists():
        if not a.resume or not os.path.samefile(source.resolve(),target):raise RuntimeError('REFUSE_OVERWRITE')
    else:
        try:os.link(source.resolve(),target)
        except PermissionError:shutil.copy2(source.resolve(),target)
    files.append(target)
def tree(source,target,skip_site=False):
    for root,dirs,names in os.walk(source):
        dirs[:]=[d for d in dirs if d!='__pycache__' and (not skip_site or d!='site-packages')]
        for name in names:
            if name.endswith(('.pyc','.pyo')):continue
            src=Path(root)/name;relative=src.relative_to(source)
            if name.lower() in ('.env','pip.ini','sitecustomize.py','usercustomize.py') or name.endswith('.private.json'):raise RuntimeError('PERSONAL_FILE_FORBIDDEN')
            if name.endswith('.pth') and name!='distutils-precedence.pth':raise RuntimeError('UNREVIEWED_PTH')
            add(src,target/relative)
runtime=stage/'runtime';runtime.mkdir(exist_ok=a.resume)
for name in ['python.exe','pythonw.exe','python3.dll','python311.dll','vcruntime140.dll','vcruntime140_1.dll','LICENSE.txt']:
    if (base/name).is_file():add(base/name,runtime/name)
for required in ['python.exe','python311.dll','LICENSE.txt']:
    if not (runtime/required).is_file():raise RuntimeError('PYTHON_BASE_INCOMPLETE')
tree(base/'Lib',runtime/'Lib',True);tree(base/'DLLs',runtime/'DLLs');tree(site,runtime/'Lib'/'site-packages');add(Path(a.node),runtime/'node.exe')
tree(Path(a.module).resolve(),stage);tree(Path(a.licenses).resolve(),stage/'THIRD_PARTY_NOTICES')
emit(stage='runtime_staged',files=len(files),bytes=sum(f.stat().st_size for f in files))
# Only the 11 required inference files from the pinned snapshot. No training/data/books.
model_files=sorted(f for f in model.rglob('*') if f.is_file());allowed={'.json','.safetensors','.txt','.model'}
if len(model_files)!=11 or any(f.suffix not in allowed for f in model_files):raise RuntimeError('MODEL_SNAPSHOT_CHANGED')
def pack(name,entries):
    target=out/name;started=time.monotonic();total=sum(src.stat().st_size for src,arc in entries);done=0
    with zipfile.ZipFile(target,'x',compression=zipfile.ZIP_DEFLATED,compresslevel=1,allowZip64=True) as z:
        for src,arc in entries:
            z.write(src,arc.as_posix());done+=src.stat().st_size
            if src.stat().st_size>50_000_000 or time.monotonic()-started>30:
                emit(stage=name,processedBytes=done,totalBytes=total);started=time.monotonic()
    h=hashlib.sha256();md5=hashlib.md5()
    with target.open('rb') as stream:
        while part:=stream.read(8*1024*1024):h.update(part);md5.update(part)
    return dict(file=name,bytes=target.stat().st_size,unpackedBytes=total,sha256=h.hexdigest(),md5=md5.hexdigest())
archives=[pack('runtime.zip',[(f,f.relative_to(stage)) for f in files]),pack('model.zip',[(f,Path('model')/f.relative_to(model)) for f in model_files])]
manifest={'kind':'NEXUS_LOCAL_VOICE_WINDOWS_PAYLOAD','version':'uyut7-qwen-20261030.1','modelRepository':'siriusfreak/qwen3-tts-12hz-1.7b-ru-stress-cf','modelRevision':'c16b3af3db3095120efc1ebb73f6522442bcb3b1','archives':archives,'modelFiles':[{'path':f.relative_to(model).as_posix(),'bytes':f.stat().st_size} for f in model_files],'requires':'Windows x64, NVIDIA CUDA/BF16, nominal 8GB GPU; CPU/AMD/iPhone unsupported by this package','sourceModelDownloads':0}
(out/'PAYLOAD_MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8');emit(stage='PACKAGING_COMPLETE',archives=archives)
