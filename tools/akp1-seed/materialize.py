#!/usr/bin/env python3
"""Одноразовый перенос проверенных байтов; только изолированная feature-ветка.
После переноса этот файл и части delta удаляются из рабочего дерева.
Никаких сетевых вызовов, main, release metadata, backend или секретов.
"""
from pathlib import Path, PurePosixPath
import gzip, hashlib, json, os, subprocess
ROOT = Path.cwd().resolve()
BRANCH = 'feature/akronikl-platform-guide-20261027'
BASE = 'd76d1613a1fbf6726d453e40366c306ea502d4c7'
DONOR = 'fd72c1372ff4f67e927bae570fc20358d8f2e72d'
DIGEST = '72bd08a0ab9dd562db0f218cef0c62787ed36e08061f5ffa545e26d13434efff'
SHA = lambda b: hashlib.sha256(b).hexdigest()
assert os.environ.get('GITHUB_REF') == 'refs/heads/' + BRANCH, 'FEATURE_ONLY'
assert subprocess.check_output(['git','status','--porcelain']).strip() == b'', 'DIRTY_INPUT'
payload = b''.join((ROOT/'tools/akp1-seed'/f'part-{i}').read_bytes() for i in range(5))
assert len(payload) == 22747 and SHA(payload) == DIGEST, 'DELTA_INTEGRITY'
raw = gzip.decompress(payload)
assert len(raw) < 300000, 'DELTA_LIMIT'
p = json.loads(raw)
m = p['manifest']
assert m['baseCommit']==BASE and m['donorCommit']==DONOR and m['schemaVersion']==1
subprocess.run(['git','merge-base','--is-ancestor',BASE,'HEAD'],check=True)
def safe(name):
    path=PurePosixPath(name)
    assert str(path)==name and not path.is_absolute() and '..' not in path.parts and '\\' not in name
    assert name.startswith(('akronikl/','docs/ru/08-assistant/','tests/akronikl-','tests/helpers/akronikl-')) or name in ('tools/build-akronikl-knowledge.mjs','tools/check-akronikl-built-candidate.mjs','core/app.js','core/bootstrap.js','pwa/offline-entry.js'), 'PATH_SCOPE'
    target=ROOT/name
    assert not target.is_symlink() and target.resolve().is_relative_to(ROOT), 'PATH_ESCAPE'
    return target
assert len(m['donorPaths'])==57 and len(m['outputs'])==65
paths=[item['path'] for item in m['outputs']]
assert len(set(paths))==len(paths)
for name in paths+m['donorPaths']+[c['path'] for c in p['changes']]: safe(name)
for name,expected in m['baseChecks'].items():
    assert SHA((ROOT/name).read_bytes())==expected, 'BASE_DRIFT: '+name
for name in m['donorPaths']:
    data=subprocess.check_output(['git','show',DONOR+':'+name])
    target=safe(name);target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
for change in p['changes']:
    target=safe(change['path']);before=target.read_bytes() if target.exists() else None
    assert (SHA(before) if before is not None else None)==change['before'], 'PREIMAGE: '+change['path']
    text=(before or b'').decode('utf-8')
    previous=len(text)+1
    for start,end,replacement in reversed(change['edits']):
        assert isinstance(start,int) and isinstance(end,int) and 0<=start<=end<previous
        previous=start
        text=text[:start]+replacement+text[end:]
    result=text.encode('utf-8');assert SHA(result)==change['after'], 'POSTIMAGE: '+change['path']
    target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(result)
subprocess.run(['node','tools/build-akronikl-knowledge.mjs'],check=True)
for item in m['outputs']:
    data=safe(item['path']).read_bytes()
    assert len(data)==item['bytes'] and SHA(data)==item['sha256'], 'OUTPUT: '+item['path']
changed=subprocess.check_output(['git','ls-files','--modified','--others','--exclude-standard','-z']).decode().split('\0')
assert set(filter(None,changed))<=set(paths), 'UNEXPECTED_CHANGE'
ledger=ROOT/'docs/ru/08-assistant/SOURCE_LINEAGE_AKP1.json'
ledger.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for child in (ROOT/'tools/akp1-seed').iterdir():
    assert child.is_file() and child.name in ['materialize.py']+[f'part-{i}' for i in range(5)]
    child.unlink()
(ROOT/'tools/akp1-seed').rmdir()
subprocess.run(['git','add','--',*paths,str(ledger.relative_to(ROOT)),'tools/akp1-seed'],check=True)
print('PASS: 65 проверенных файлов, транспорт удалён; main/backend/release не изменяются.')
