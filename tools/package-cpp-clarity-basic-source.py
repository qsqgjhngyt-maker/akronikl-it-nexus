import pathlib, subprocess, hashlib, json, zipfile
root=pathlib.Path('.')
import os
out=pathlib.Path(os.environ['NEXUS_CLARITY_EVIDENCE']);out.mkdir(exist_ok=True)
profile=json.loads((out/'CI_PROFILE.json').read_text())
assert profile['profile']=='BASIC'
source=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
paths=subprocess.check_output(['git','ls-files','-z']).decode('utf-8').split('\0')
allowed={'.md','.txt','.json','.mjs','.js','.css','.html','.yml','.yaml','.py','.sh','.cpp','.hpp','.h','.c','.cmake','.toml','.ps1','.cmd','.bsl','.query'}
roots={'core','courses','sandbox','styles','pwa','effects','akronikl','content','tools','tests','server-access','.github'}
hashes=[];included=[];total=0
with zipfile.ZipFile(out/'source-text.zip','w',zipfile.ZIP_DEFLATED) as z:
  for rel in paths:
    if not rel: continue
    p=root/rel
    if not p.is_file() or p.is_symlink(): continue
    b=p.read_bytes()
    hashes.append({'path':rel,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
    parts=p.parts
    in_scope=len(parts)==1 or parts[0] in roots or rel.startswith('docs/ru/03-content/cpp-clarity-01/') or rel.startswith('review/cpp-clarity-r3/')
    if not in_scope: continue
    if any(x in parts for x in ('node_modules','dist','evidence','releases','retained','vendor-cache')): continue
    if '.env' in p.name or any(k in p.name.lower() for k in ('credential','secret-key','private-key')): continue
    if p.suffix not in allowed and p.name not in ('LICENSE','CMakeLists.txt','.gitattributes','.gitignore'): continue
    if len(b)>8*1024*1024: continue
    try: b.decode('utf-8')
    except UnicodeDecodeError: continue
    total+=len(b)
    if total>100*1024*1024: raise RuntimeError('Current source snapshot exceeds the explicit 100 MiB cap')
    z.writestr(rel,b);included.append(rel)
(out/'SOURCE.json').write_text(json.dumps({'sourceCommit':source,'baseline':'ee2787c0cd92da2ad1d5e79df5e2bfadab2c3dd6','profile':'BASIC','contentBaseline':profile['baseline'],'kind':'current-text-only-source-not-release','includedFiles':len(included),'uncompressedBytes':total,'publicationAuthorized':False},indent=2)+'\n')
(out/'TRACKED_SHA256.json').write_text(json.dumps(hashes,ensure_ascii=False,indent=2)+'\n')
b=(out/'source-text.zip').read_bytes()
(out/'SOURCE_SHA256.txt').write_text(hashlib.sha256(b).hexdigest()+'  source-text.zip\n')
