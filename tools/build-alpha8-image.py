#!/usr/bin/env python3
"""Offline OCI/Docker archive: reuse pinned Alpha7 layers and overlay all app files.
No daemon, registry, network, credentials or cloud access. Not a container runtime test.
"""
import argparse, hashlib, io, json, pathlib, tarfile, copy

BASE_SHA = 'f7a29c9ae09721d152e4859eb7a3c6b16f2795a59df5235a23a66e2082db5bad'
BASE_CONFIG = '795aea8e5eb0510fc1df3b55ca03198559614463e0d23aa2102bf1fd1d14a214'
sha = lambda b: hashlib.sha256(b).hexdigest()
encode = lambda x: json.dumps(x, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode('utf-8')

def main():
    p=argparse.ArgumentParser(); p.add_argument('--base',type=pathlib.Path,required=True); p.add_argument('--repo',type=pathlib.Path,required=True); p.add_argument('--out',type=pathlib.Path,required=True); a=p.parse_args()
    if a.out.exists(): raise ValueError('Output already exists')
    with a.base.open('rb') as f:
        if hashlib.file_digest(f,'sha256').hexdigest()!=BASE_SHA: raise ValueError('Base archive mismatch')
    with tarfile.open(a.base) as base:
        manifests=json.load(base.extractfile('manifest.json')); assert len(manifests)==1
        old=manifests[0]; config_bytes=base.extractfile(old['Config']).read(); assert sha(config_bytes)==BASE_CONFIG
        config=json.loads(config_bytes)
        assert config['architecture']=='amd64' and config['os']=='linux'
        assert config['config']['User']=='node' and config['config']['WorkingDir']=='/app'
        assert config['config']['Cmd']==['node','bff/server.mjs']
        assert set(v.split('=',1)[0] for v in config['config']['Env'])=={'PATH','NODE_VERSION','YARN_VERSION','NODE_ENV'}
        assert len(old['Layers'])==len(config['rootfs']['diff_ids'])
        for name,digest in zip(old['Layers'],config['rootfs']['diff_ids']):
            with base.extractfile(name) as f: actual=hashlib.file_digest(f,'sha256').hexdigest()
            assert actual==digest.split(':')[1]==name.split('/')[-1]
        files={}
        for rel in ['bff/server.mjs', *['public/'+x for x in ['index.html','page.js','passkey-client.js','entry.html','entry.css','entry.js','galaxy.js','oauth-client.js']]]:
            path=a.repo/'server-access'/'image'/rel; assert path.is_file() and not path.is_symlink(); files['app/'+rel]=path.read_bytes()
        source={str(p.relative_to(a.repo)).replace('\\','/'):sha(p.read_bytes()) for d in ['bff','public'] for p in sorted((a.repo/'server-access'/d).glob('*')) if p.is_file()}
        info={'version':'0.1.7-alpha.2.4.6-ui1a.8','baselineCommit':'1da420500076c9d764984a098d5699229be0a0f4','uncommittedCandidate':True,'sourceHashes':source,'installedAppHashes':{k:sha(v) for k,v in files.items()},'cookieContract':'unchanged V1/V2; no V3.1','baseArchiveSHA256':BASE_SHA}
        files['app/build-info.json']=encode(info)
        layer_buffer=io.BytesIO()
        with tarfile.open(fileobj=layer_buffer,mode='w',format=tarfile.USTAR_FORMAT) as layer:
            for name,data in sorted(files.items()):
                t=tarfile.TarInfo(name);t.size=len(data);t.mode=0o644;t.uid=1000;t.gid=1000;t.mtime=0;layer.addfile(t,io.BytesIO(data))
        layer=layer_buffer.getvalue(); layer_sha=sha(layer); layer_name='blobs/sha256/'+layer_sha
        new=copy.deepcopy(config);new['created']='2026-10-20T00:00:00Z';new['rootfs']['diff_ids'].append('sha256:'+layer_sha)
        new.setdefault('history',[]).append({'created':new['created'],'created_by':'Nexus Alpha8 offline app overlay; verified Alpha7 parent; no runtime claim'})
        labels=new['config'].setdefault('Labels',{});labels.update({'org.opencontainers.image.version':info['version'],'nexus.base.archive.sha256':BASE_SHA,'nexus.app.closure.sha256':sha(encode(info['installedAppHashes']))})
        new_bytes=encode(new);new_sha=sha(new_bytes);new_name='blobs/sha256/'+new_sha
        layers=[{'mediaType':'application/vnd.oci.image.layer.v1.tar','digest':digest,'size':base.getmember(name).size} for name,digest in zip(old['Layers'],config['rootfs']['diff_ids'])]
        layers.append({'mediaType':'application/vnd.oci.image.layer.v1.tar','digest':'sha256:'+layer_sha,'size':len(layer)})
        image=encode({'schemaVersion':2,'mediaType':'application/vnd.oci.image.manifest.v1+json','config':{'mediaType':'application/vnd.oci.image.config.v1+json','digest':'sha256:'+new_sha,'size':len(new_bytes)},'layers':layers}); image_sha=sha(image)
        index=encode({'schemaVersion':2,'manifests':[{'mediaType':'application/vnd.oci.image.manifest.v1+json','digest':'sha256:'+image_sha,'size':len(image),'platform':{'architecture':'amd64','os':'linux'},'annotations':{'org.opencontainers.image.ref.name':'nexus-access-bff:alpha8-local'}}]})
        docker_manifest=encode([{'Config':new_name,'RepoTags':['nexus-access-bff:alpha8-local'],'Layers':old['Layers']+[layer_name]}])
        a.out.parent.mkdir(parents=True,exist_ok=True)
        with tarfile.open(a.out,mode='w',format=tarfile.USTAR_FORMAT) as out:
            def put(name,data):
                t=tarfile.TarInfo(name);t.size=len(data);t.mode=0o644;t.mtime=0;out.addfile(t,io.BytesIO(data))
            for name in old['Layers']:
                t=tarfile.TarInfo(name);t.size=base.getmember(name).size;t.mode=0o644
                with base.extractfile(name) as stream: out.addfile(t,stream)
            for name,data in [(layer_name,layer),(new_name,new_bytes),('blobs/sha256/'+image_sha,image),('index.json',index),('oci-layout',encode({'imageLayoutVersion':'1.0.0'})),('manifest.json',docker_manifest)]: put(name,data)
    result={'status':'PASS / OFFLINE IMAGE ASSEMBLY','imageManifestDigest':'sha256:'+image_sha,'configDigest':'sha256:'+new_sha,'appLayerDigest':'sha256:'+layer_sha,'installedFiles':len(files),'baseLayersVerified':len(old['Layers']),'daemonUsed':False,'runtimeTest':'NOT RUN BY ASSEMBLER / see separate runtime evidence','registryUpload':False,'buildInfo':info}
    with a.out.open('rb') as f: result['archiveSHA256']=hashlib.file_digest(f,'sha256').hexdigest()
    a.out.with_suffix('.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({k:v for k,v in result.items() if k!='buildInfo'}))

if __name__=='__main__': main()
