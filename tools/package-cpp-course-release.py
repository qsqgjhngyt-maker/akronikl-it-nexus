"""Только публичный manifest и Qt GPL-kit. Никаких профилей/БД/ключей ответов."""
import argparse,hashlib,json,pathlib,subprocess,zipfile
p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--baseline',required=True);p.add_argument('--out',required=True);a=p.parse_args()
root=pathlib.Path(a.root).resolve();out=pathlib.Path(a.out).resolve();assert root!=out and not out.is_relative_to(root);out.mkdir(parents=True,exist_ok=True)
def sha(b):return hashlib.sha256(b).hexdigest()
def git(file):return subprocess.check_output(['git','-C',str(root),'show',a.baseline+':'+file],stderr=subprocess.PIPE)
def safe(name):
 assert name and '\\' not in name and not name.startswith('/') and not any(x in ['', '.', '..'] for x in name.split('/'))
 assert not any(x in name.lower() for x in ['.wrangler','qa-key.pem','qa-cert.pem','private-capstone','private-automatic','keys.json','owner_baseline','cookies'])
 target=(root/name).resolve();assert target.is_relative_to(root) and target.is_file();return target
manifest=json.loads((root/'BUILD_MANIFEST.json').read_bytes());old_bytes=git('BUILD_MANIFEST.json');old=json.loads(old_bytes);rows={r['file']:r for r in manifest['files']};baseline={r['file']:r for r in old['files']}
rows['BUILD_MANIFEST.json']={'file':'BUILD_MANIFEST.json','bytes':(root/'BUILD_MANIFEST.json').stat().st_size,'sha256':sha((root/'BUILD_MANIFEST.json').read_bytes())}
for f in (root/'runtime-packs/qt-6.8.3-v1').rglob('*'):
 if f.is_file():name=f.relative_to(root).as_posix();b=f.read_bytes();rows[name]={'file':name,'bytes':len(b),'sha256':sha(b)}
for name,row in rows.items():
 b=safe(name).read_bytes();assert len(b)==row['bytes'] and sha(b)==row['sha256'],name
def archive(name,names,reader):
 target=out/name;assert not target.exists(),name
 expected={}
 with zipfile.ZipFile(target,'x',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
  for file in sorted(names):
   b=reader(file);info=zipfile.ZipInfo(file,date_time=(2020,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,b);expected[file]=sha(b)
 with zipfile.ZipFile(target) as z:
  assert len(z.infolist())==len(expected)
  for file,digest in expected.items():assert sha(z.read(file))==digest,file
 return {'file':name,'bytes':target.stat().st_size,'sha256':sha(target.read_bytes()),'entries':len(expected),'rereadVerified':True}
full=archive('CPP_GOLD_FULL_PUBLIC.zip',rows,lambda f:safe(f).read_bytes())
changed=[f for f,r in rows.items() if f not in baseline or r['sha256']!=baseline[f]['sha256']]
patch=archive('CPP_GOLD_PATCH_PUBLIC.zip',changed,lambda f:safe(f).read_bytes())
rollback_names=['index.html','nexus-shell.html','offline.html','manifest.webmanifest','service-worker.js','version.json','BUILD_MANIFEST.json','startup-intro.json']
rollback=archive('CPP_GOLD_ROLLBACK_ROOT.zip',rollback_names,git)
result={'status':'PASS / packages reread verified','version':manifest['version'],'assetGeneration':manifest['assetGeneration'],'baselineCommit':a.baseline,'packages':[full,patch,rollback],'runtimeAndCorrespondingSourceIncluded':True,'privateLearnerDataIncluded':False,'rollbackDeletesData':False}
(out/'PACKAGES.json').write_bytes((json.dumps(result,ensure_ascii=False,indent=2)+'\n').encode());print(json.dumps(result,ensure_ascii=False))
