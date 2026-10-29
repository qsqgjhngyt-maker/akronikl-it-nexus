// Независимые контрольные программы. Собственные tests ученика не участвуют
// в определении этих наблюдений. Это функциональные проверки, не доказательство O(log n).
import{PRACTICAL_CHECKS}from'./automatic-policy.js';
const q=JSON.stringify;
function group(id,body){return`nexus_case(${q(id)},[]{${body}});\n`}
export function practicalControlSource(variant,part,nonce){
 if(!['A','B','C'].includes(variant)||!Object.hasOwn(PRACTICAL_CHECKS,part)||!/^[a-f0-9-]{36}$/.test(nonce))throw Error('ASSESSMENT_CONTROL_INVALID');
 let body='';
 if(part==='P1'){
  const values={A:{normal:'7 20 2\n3 10 1\n',limits:'1 1 0\n1000 480 3\n',bad:['0 1 0\n','1 0 0\n','1 481 0\n','1 1 4\n'],tail:'3 0 0\n',first:'id',second:'effort'},B:{normal:'7 -300 1\n3 1000 0\n',limits:'1 -50000 0\n1000 150000 1\n',bad:['0 0 0\n','1 -50001 0\n','1 150001 0\n','1 0 2\n'],tail:'3 0 2\n',first:'sensor',second:'millidegrees'},C:{normal:'7 20 2\n3 10 1\n',limits:'1 0 0\n1000 10000 10000\n',bad:['0 1 0\n','1 -1 0\n','1 10001 0\n','1 2 3\n'],tail:'3 2 3\n',first:'sku',second:'stock'}}[variant];
  body+=group('validRecords',`std::vector<Record> r;need(load(${q(values.normal)},r));need(r.size()==2&&r[0].${values.first}==7&&r[1].${values.first}==3);`);
  body+=group('boundaries',`std::vector<Record> r;need(load(${q(values.limits)},r)&&r.size()==2);need(load("",r)&&r.empty());need(load(${q(' 3 '+(variant==='B'?'-1':'1')+' 0 \n')},r)&&r.size()==1);`);
  const bad=[...values.bad,'1 1 0\n1 2 0\n','1 2 0 extra\n','1 2\n','1 999999999999999999999 0\n','\n'];
  body+=group('invalidRecords',`for(const std::string& s:std::vector<std::string>{${bad.map(q).join(',')}}){std::vector<Record> r;need(!load(s,r));}std::string tooMany;for(int i=1;i<=201;++i)tooMany+=std::to_string(i)+" 1 0\\n";std::vector<Record> r;need(!load(tooMany,r));`);
  body+=group('atomicFailure',`std::vector<Record> r;need(load(${q(values.normal)},r));auto before=r;need(!load(${q(values.normal+values.tail)},r));need(r==before);`);
 }
 if(part==='P2'){
  const input=variant==='C'?'{{9,2},{1,5},{4,2}}':'{{9,3},{7,1},{1,1},{4,0}}',expected=variant==='C'?'{{1,5},{4,2},{9,2}}':'{{4,0},{1,1},{7,1},{9,3}}';
  body+=group('indexOrder',`std::vector<Entry> input${input};auto before=input;need(build_index(input)==std::vector<Entry>${expected});need(input==before&&build_index({}).empty());`);
  body+=group('knownKey',variant==='C'?'auto i=build_index({{9,2},{1,5},{4,0}});need(find(i,1)==std::optional<Entry>{{1,5}});need(find(i,9)==std::optional<Entry>{{9,2}});':'auto i=build_index({{9,3},{7,1},{1,1},{4,0}});need(find(i,1)==std::optional<Entry>{{1,1}});'+(variant==='B'?'need(find(i,2)==std::optional<Entry>{{9,3}});need(find(i,-1)==std::optional<Entry>{{4,0}});':''));
  body+=group('absentKey',variant==='C'?'auto i=build_index({{9,2},{1,5},{4,0}});need(!find(i,3)&&!find(i,10)&&!find({},1));':'auto i=build_index({{9,3},{7,1},{1,1},{4,0}});need(!find(i,4)&&!find({},1));'+(variant==='A'?'need(!find(i,2));':''));
  body+=group('duplicates',variant==='C'?'auto i=build_index({{9,2},{1,2},{4,2}});need(i==std::vector<Entry>{{1,2},{4,2},{9,2}});need(find(i,4)==std::optional<Entry>{{4,2}});':'for(const auto& input:std::vector<std::vector<Entry>>{{{9,1},{2,1},{7,1}},{{7,1},{9,1},{2,1}}}){auto i=build_index(input);need(find(i,1)==std::optional<Entry>{{2,1}});}');
 }
 if(part==='P3'){
  const klass={A:'QueueSnapshot',B:'ReportSnapshot',C:'InventorySnapshot'}[variant],low={A:0,B:-50001,C:-1}[variant],high={A:481,B:150001,C:10001}[variant];
  body+=group('independentOwnership',`${klass} a,b;a.replace({{9,30},{1,20}});b.replace({{4,10}});auto old=a.entries();b.replace({{8,5}});need(a.entries()==old&&a.entries()==std::vector<Entry>{{1,20},{9,30}});`);
  body+=group('moveReuse',`${klass} a;a.replace({{9,30}});${klass} b=std::move(a);need(a.entries().empty()&&b.entries()==std::vector<Entry>{{9,30}});a.replace({{8,1}});need(b.entries()==std::vector<Entry>{{9,30}});${klass} c;c=std::move(b);need(b.entries().empty()&&c.entries()==std::vector<Entry>{{9,30}});b.replace({});need(b.entries().empty());`);
  const invalid=`{{{2,1},{2,3}},{{2,1},{3,${low}}},{{2,1},{3,${high}}},std::vector<Entry>(201,{1,1})}`;
  body+=group('invalidReplacement',`for(const auto& r:std::vector<std::vector<Entry>>${invalid}){${klass} m;bool caught=false;try{m.replace(r);}catch(const std::invalid_argument&){caught=true;}need(caught);}`);
  body+=group('atomicFailure',`${klass} m;m.replace({{9,30},{1,20}});auto before=m.entries();for(const auto& r:std::vector<std::vector<Entry>>${invalid}){try{m.replace(r);}catch(const std::invalid_argument&){}need(m.entries()==before);}m.replace({});need(m.entries().empty());`);
 }
 if(part==='P4'){
  const initial={A:2,B:-1,C:3}[variant],bad={A:4,B:150001,C:10001}[variant];
  body+=group('rejectedAction',`Model m;int id=m.add("check",${initial});auto before=m.items();mustReject([&]{m.act(999,1);});need(m.items()==before);mustReject([&]{m.add("   ",${initial});});need(m.items()==before);mustReject([&]{m.add("bad",${bad});});need(m.items()==before);`+(variant==='A'?'m.act(id,1);m.act(id,1);before=m.items();mustReject([&]{m.act(id,1);});need(m.items()==before);':variant==='B'?'mustReject([&]{m.act(id,1001);});need(m.items()==before);':'mustReject([&]{m.act(id,4);});need(m.items()==before);'));
  body+=group('saveRoundTrip',`Model m;int id=m.add("round trip",${initial});m.act(id,1);std::ostringstream out;m.save(out);Model copy;std::istringstream in(out.str());copy.load(in);need(copy.items()==m.items());need(copy.add("next",${initial})==2);`);
  const magic='NXQF'+variant+'1';
  body+=group('atomicLoad',`Model m;m.add("preserved",${initial});auto before=m.items();for(const char* text:{"FUTURE 1 0\\n",${q(magic+' 1 0 trailing')},${q(magic+' 3 2\n1 '+initial+' 0 "a"\n1 '+initial+' 0 "b"\n')}}){mustReject([&]{std::istringstream in(text);m.load(in);});need(m.items()==before);}`);
 }
 return`#include "model.hpp"\n#include <iostream>\n#include <sstream>\n#include <stdexcept>\n#include <algorithm>\n#include <utility>\n#include <optional>\nvoid need(bool ok){if(!ok)throw std::runtime_error("contract");}\ntemplate<class F>void mustReject(F f){bool rejected=false;try{f();}catch(const std::exception&){rejected=true;}need(rejected);}\ntemplate<class F>void nexus_case(const char* id,F f){bool ok=false;try{f();ok=true;}catch(...){}std::cout<<"NEXUS_CONTROL ${nonce} "<<id<<" "<<(ok?1:0)<<std::endl;}\nint main(){\n${body}return 0;}\n`;
}
export function practicalGuiControlSource(variant,nonce){
 if(!['A','B','C'].includes(variant)||!/^[a-f0-9-]{36}$/.test(nonce))throw Error('ASSESSMENT_CONTROL_INVALID');
 const file='/data/final-'+variant.toLowerCase()+'.txt',initial={A:2,B:-1,C:3}[variant],button={A:'Advance item',B:'Calibrate item',C:'Reserve item'}[variant];
 const expected=variant==='A'?'r.items()[0].state==1':variant==='B'?'r.items()[0].value==0':'r.items()[0].state==1';
 return`// SPDX-License-Identifier: GPL-3.0-only\n#define main nexus_student_main\n#include "../src/gui.cpp"\n#undef main\n#include <QTimer>\n#include <QFile>\n#include <QPushButton>\n#include <QLineEdit>\n#include <iostream>\n#include <sstream>\n#include <stdexcept>\nQLineEdit* field(const QString& name){for(auto* w:QApplication::allWidgets())if(auto* e=qobject_cast<QLineEdit*>(w);e&&e->accessibleName()==name)return e;throw std::runtime_error("field missing");}\nQPushButton* button(const QString& name){for(auto* w:QApplication::allWidgets())if(auto* b=qobject_cast<QPushButton*>(w);b&&b->text()==name)return b;throw std::runtime_error("button missing");}\nint main(int argc,char**argv){int result=nexus_student_main(argc,argv);QTimer::singleShot(0,[]{bool ok=false;try{field("Item name")->setText("control item");field("Initial value")->setText("${initial}");button("Add item")->click();field("Item ID")->setText("1");field("Action amount")->setText("1");button(${q(button)})->click();button("Save application data")->click();QFile f(${q(file)});if(!f.open(QIODevice::ReadOnly))throw std::runtime_error("save missing");std::istringstream in(f.readAll().toStdString());Model r;r.load(in);ok=r.items().size()==1&&r.items()[0].title=="control item"&&${expected};}catch(...){}std::cout<<"NEXUS_CONTROL ${nonce} guiAction "<<(ok?1:0)<<std::endl;});return result;}\n`;
}
