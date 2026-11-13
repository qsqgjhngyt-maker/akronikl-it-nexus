from pathlib import Path
import json, shutil, uuid
w=Path(__file__).parent
r=Path(r'C:/Users/User/.codex/.chatgpt-projects/g-p-6abd25f3a9c081919ee253c9198f69b4/outputs/cpp-clarity-01-20261104/repo')
n=json.loads((w/'onec-p3-module-native-20261108/CASE_SOURCES.json').read_text(encoding='utf-8'))
cases={c['id']:c for c in n['cases']}
ids=['contexts-main30','contexts-independent45','params-main30','params-independent45','collections-main','collections-independent-two','exceptions-main-bad','exceptions-independent-45','tests-main','tests-independent']
root=w/'onec-p3-plain-gui'
template=(r/'courses/onec-education/native/service-desk-advanced/CommonModules/УчебныеЗадания.xml').read_text(encoding='utf-8-sig')
out=[]
for i,id in enumerate(ids,1):
 c=cases[id]; d=root/id; s=d/'source'
 if s.exists():
  assert (s/'Ext/ManagedApplicationModule.bsl').read_text(encoding='utf-8-sig')==c['fullSource']
 else: shutil.copytree(r/'courses/onec-education/native/service-desk',s)
 cfg=(r/'courses/onec-education/native/service-desk/Configuration.xml').read_text(encoding='utf-8-sig').replace('NexusTrainingServiceDesk','NexusP3Practice'+str(i).zfill(2))
 for name,code in c['externalModules'].items():
  x=template.replace('УчебныеЗадания',name).replace('1f0db6e0-2d5c-41ed-ae43-0dcc40799bb8',str(uuid.uuid4()))
  (s/'CommonModules'/name/'Ext').mkdir(parents=True,exist_ok=True)
  (s/'CommonModules'/(name+'.xml')).write_text(x,encoding='utf-8-sig')
  (s/'CommonModules'/name/'Ext/Module.bsl').write_text(code,encoding='utf-8-sig',newline='\n')
  if '<CommonModule>'+name+'</CommonModule>' not in cfg: cfg=cfg.replace('<ChildObjects>','<ChildObjects><CommonModule>'+name+'</CommonModule>',1)
 (s/'Configuration.xml').write_text(cfg,encoding='utf-8-sig')
 (s/'Ext/ManagedApplicationModule.bsl').write_text(c['fullSource'],encoding='utf-8-sig',newline='\n')
 out.append({'id':id,'name':'NexusP3Practice'+str(i).zfill(2),'root':str(d),'base':str(d/'base'),'source':str(s),'expectedMessages':c['expectedMessages'],'sourceSha256':c['sha256'],'externalModules':list(c['externalModules'])})
(root/'MANIFEST.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Подготовлены 10 изолированных полных GUI-исходников без QA-обёрток.')
