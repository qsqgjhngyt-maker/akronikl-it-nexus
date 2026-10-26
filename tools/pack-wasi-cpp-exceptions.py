"""Воспроизводимый data-only пакет WASI SDK33; не изменяет LLVM/библиотеки."""
import argparse, gzip, hashlib, io, json, struct, tarfile
from pathlib import Path, PurePosixPath

SDK_SHA = '063bc1b56582b9923e08ac9b89e58789618d851763f01530b3ff20b9e5df0ca3'
BASE_SHA = '79eef0c336fe55cf03ff8f5b42b784c8168f929a3603138b2c6301f4601e4c86'
SDK_URL = 'https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-33/wasi-sysroot-33.0%2Bm.tar.gz'
PREFIX = 'wasi-sysroot-33.0+m/'
CPP = 'include/wasm32-wasip1/eh/c++/v1/'
sha = lambda b: hashlib.sha256(b).hexdigest()

def produce(sdk, base, dest):
    assert sha(sdk.read_bytes()) == SDK_SHA, 'SDK33 SHA256 mismatch'
    assert sha(base.read_bytes()) == BASE_SHA, 'Pinned YoWASP resources SHA256 mismatch'
    with tarfile.open(base) as t:
        headers = {m.name.removeprefix('include/c++/v1/'): t.extractfile(m).read()
                   for m in t.getmembers() if m.isfile() and m.name.startswith('include/c++/v1/')}
    selected, reused = {}, []
    with tarfile.open(sdk) as t:
        for m in t.getmembers():
            if not m.isfile():
                continue
            assert m.name.startswith(PREFIX)
            name = m.name.removeprefix(PREFIX)
            assert not PurePosixPath(name).is_absolute() and '..' not in PurePosixPath(name).parts
            if name.startswith(CPP) and name != CPP + '__config_site':
                b = t.extractfile(m).read()
                assert headers.get(name.removeprefix(CPP)) == b, 'C++ header drift: ' + name
                reused.append({'file': name.removeprefix(CPP), 'sha256': sha(b)})
                continue
            c_header = name.startswith('include/wasm32-wasip1/') and '/noeh/' not in name and '/eh/' not in name
            libc = name.startswith('lib/wasm32-wasip1/') and name.count('/') == 2 and name.endswith(('.a', '.o'))
            cpp_lib = name in ['lib/wasm32-wasip1/eh/' + f for f in ['libc++.a', 'libc++abi.a', 'libunwind.a']]
            if c_header or libc or cpp_lib or name == CPP + '__config_site':
                selected[name] = t.extractfile(m).read()
    assert len(reused) == 1678 and 200 < len(selected) < 300
    rows, body, offset = [], [], 0
    for name, b in sorted(selected.items()):
        rows.append({'path': name, 'offset': offset, 'bytes': len(b), 'sha256': sha(b)})
        offset += len(b)
        body.append(b)
    header = json.dumps({'format': 'nexus-wasi-eh-pack-v1', 'sdk': '33.0+m', 'files': rows},
                        ensure_ascii=True, separators=(',', ':')).encode()
    raw = struct.pack('<I', len(header)) + header + b''.join(body)
    buffer = io.BytesIO()
    with gzip.GzipFile(filename='', mode='wb', fileobj=buffer, compresslevel=9, mtime=0) as z:
        z.write(raw)
    packed = buffer.getvalue()
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(packed)
    result = {'format': 'nexus-wasi-eh-pack-v1', 'sdk': '33.0+m', 'sourceUrl': SDK_URL,
              'sourceSha256': SDK_SHA, 'baseResourcesSha256': BASE_SHA,
              'baseCompiler': '@yowasp/clang@22.0.0-git20542-10',
              'modifications': 'No library/header edits. Select wasm32-wasip1 static EH; deterministic container/gzip only.',
              'bytes': len(packed), 'sha256': sha(packed), 'unpackedBytes': len(raw),
              'files': rows, 'reusedCppHeaders': reused, 'reusedCppHeaderCount': len(reused)}
    dest.with_suffix('.json').write_bytes((json.dumps(result, ensure_ascii=False, indent=2)+'\n').encode('utf-8'))
    print(json.dumps({k: v for k, v in result.items() if k not in ['files', 'reusedCppHeaders']}))

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--sdk', required=True, type=Path)
    p.add_argument('--base-resources', required=True, type=Path)
    p.add_argument('--out', required=True, type=Path)
    args = p.parse_args()
    produce(args.sdk, args.base_resources, args.out)
