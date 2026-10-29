"""Настоящие native Qt/FS; I/O-stub модели не оценивает решение учащегося."""
import argparse,pathlib,json,subprocess,tempfile,hashlib,copy,os
p=argparse.ArgumentParser();p.add_argument('--out',required=True);p.add_argument('--image',default='nexus-qt-native-portability:6.8.3');a=p.parse_args();r=pathlib.Path(__file__).resolve().parents[1];out=pathlib.Path(a.out).resolve();out.mkdir(parents=True,exist_ok=True);work=pathlib.Path(tempfile.mkdtemp(prefix='private-qt-native-',dir=out));base='f923c6b1fec8d62ad85dc0a1ede02cbbb6ba0248';records=[]
stub='#pragma once\n#include <vector>\n#include <string>\n#include <ostream>\n#include <istream>\nstruct SyntheticItem{int id=0;std::string title;int value=0;int state=0;};\nclass Model{std::vector<SyntheticItem> values_;public:const auto&items()const{return values_;}void save(std::ostream&o)const{o<<"SYNTHETIC\\n";}void load(std::istream&){} };\n'
def run(args,stage):
 q=subprocess.run(args,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=180);(out/(stage+'.log')).write_text(q.stdout+q.stderr,encoding='utf-8');assert q.returncode==0,stage+' failed; see local log';return q.stdout
def docker(cwd,command,args,stage):
 return run(['docker','run','--rm','--read-only','--network','none','--cap-drop','ALL','--security-opt','no-new-privileges','--user','1000:1000','--memory','1g','--cpus','2','--pids-limit','128','--mount','type=bind,source='+str(work)+',target=/work','--tmpfs','/tmp:rw,uid=1000,gid=1000,size=128m','-e','QT_QPA_PLATFORM=offscreen','-e','XDG_RUNTIME_DIR=/tmp/qt-native','--workdir',cwd,'--entrypoint',command,a.image,*args],stage)
try:
 for name in ['a-p4','b-p4','c-p4']:
  file='courses/cpp/final/kits/'+name+'.json';before=json.loads(subprocess.check_output(['git','-C',str(r),'show',base+':'+file]));current=json.loads((r/file).read_bytes());expected=copy.deepcopy(before);gui=next(f for f in expected['template']['files'] if f['path']=='src/gui.cpp');gui['content']=gui['content'].replace('"/data','"data');assert current==expected,'Only relative GUI data paths may change'
  project=work/name;project.mkdir();
  for f in current['template']['files']:
   dest=(project/f['path']).resolve();assert dest.is_relative_to(project);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(f['content'],encoding='utf-8',newline='\n')
  (project/'io_fixture').mkdir();(project/'io_fixture/model.hpp').write_text(stub,encoding='utf-8')
  old_gui=next(f['content'] for f in before['template']['files'] if f['path']=='src/gui.cpp');new_gui=next(f['content'] for f in current['template']['files'] if f['path']=='src/gui.cpp')
  cmake=(project/'CMakeLists.txt').read_text(encoding='utf-8')
  for mode,source in [('before',old_gui),('after',new_gui)]:
   (project/('gui_'+mode+'.cpp')).write_text(source,encoding='utf-8');(project/(mode+'-run')).mkdir()
   driver='#define main nexus_original_gui_main\n#include "gui_'+mode+'.cpp"\n#undef main\nint main(int argc,char**argv){QApplication app(argc,argv);Window window;window.show();app.processEvents();QPushButton*save=nullptr;for(auto*b:window.findChildren<QPushButton*>())if(b->text().startsWith("Save"))save=b;if(!save)return 4;save->click();app.processEvents();QFile f("data/final-'+name[0]+'.txt");bool ok=f.open(QIODevice::ReadOnly)&&f.readAll()==QByteArray("SYNTHETIC\\n");std::cout<<(ok?"NATIVE_SAVE_OK":"NATIVE_SAVE_REJECTED")<<std::endl;return ok==('+('true' if mode=='after' else 'false')+')?0:5;}\n'
   (project/('driver_'+mode+'.cpp')).write_text(driver,encoding='utf-8');cmake+='\nadd_executable(native_'+mode+' driver_'+mode+'.cpp)\ntarget_include_directories(native_'+mode+' BEFORE PRIVATE io_fixture)\ntarget_link_libraries(native_'+mode+' PRIVATE Qt6::Widgets)\n'
  (project/'CMakeLists.txt').write_text(cmake,encoding='utf-8');prefix='/work/'+name
  docker(prefix,'cmake',['-S',prefix,'-B',prefix+'/build','-GNinja','-DNEXUS_GUI=ON','-DCMAKE_CXX_COMPILER=/usr/bin/g++','-DCMAKE_PREFIX_PATH=/opt/qt/6.8.3/gcc_64'],name+'-configure')
  docker(prefix,'cmake',['--build',prefix+'/build','--target','program','native_before','native_after','--parallel','2'],name+'-build')
  b=docker(prefix+'/before-run',prefix+'/build/native_before',[],name+'-before');c=docker(prefix+'/after-run',prefix+'/build/native_after',[],name+'-after');assert 'NATIVE_SAVE_REJECTED' in b and 'NATIVE_SAVE_OK' in c
  records.append({'kit':name,'status':'PASS','originalExportRejected':True,'relativeExportSavesInWorkingDirectory':True,'nativeQtCMakeBuild':True,'modelIoStub':True,'realQtGuiAndFilesystem':True,'rootReadOnly':True,'nonRootUid':1000,'guiSourceSha256':hashlib.sha256(new_gui.encode()).hexdigest()});print(json.dumps(records[-1]))
 result={'status':'PASS','records':records,'cases':6,'realNativeQt':True,'assessmentModelCorrectnessProvedByThisTest':False,'credentialsUsed':False,'productionRequests':0}
except Exception as e:result={'status':'FAIL','records':records,'failure':str(e),'productionRequests':0};raise
finally:(out/'NATIVE_QT_PORTABILITY.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
