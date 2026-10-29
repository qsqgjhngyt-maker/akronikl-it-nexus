// M6-0: исполняемые контракты, не новые уроки/ID и не реализация GUI.
import {readFileSync} from 'node:fs';
const cpp=String.raw,io='#include <iostream>\n',p=(id,topics,source,cases,extra={})=>({id,topics,source,cases,...extra});
const old=JSON.parse(readFileSync(new URL('../../courses/cpp/data/lessons.ru.json',import.meta.url))).lessons.find(l=>l.id==='cpp.visual-event-model');
export const M6_PROBES=[
 p('legacy-event-example',['cpp.visual-event-model'],old.code,[{stdin:'',stdout:'376.5'}],{baseline:true}),
 p('legacy-event-solution',['cpp.visual-event-model'],old.solution,[{stdin:'',stdout:'850'}],{baseline:true}),
 p('fifo-event-loop',['M6-A1'],io+cpp`#include <queue>
int main(){int n;if(!(std::cin>>n)||n<0||n>8){std::cout<<"invalid\n";return 0;}std::queue<int>q;for(int i=0;i<n;++i)q.push(i+1);int sum=0;while(!q.empty()){sum+=q.front();q.pop();}std::cout<<n<<' '<<sum<<'\n';}`,[{stdin:'3',stdout:'3 6\n'},{stdin:'0',stdout:'0 0\n'},{stdin:'x',stdout:'invalid\n'}]),
 p('callback-dispatch',['M6-A1'],io+cpp`#include <functional>
#include <map>
int main(){int value=2;std::map<int,std::function<void()>>h;h[7]=[&]{value*=4;};for(int event:{7,9}){auto i=h.find(event);if(i!=h.end())i->second();}std::cout<<value<<' '<<h.contains(9)<<'\n';}`,[{stdin:'',stdout:'8 0\n'}]),
 p('empty-callback-exception',['M6-A1'],io+cpp`#include <functional>
int main(){std::function<void()>f;try{f();}catch(const std::bad_function_call&){std::cout<<"empty\n";}}`,[{stdin:'',stdout:'empty\n'}],{capability:'exceptions'}),
 p('typed-event-variant',['M6-A2'],io+cpp`#include <variant>
#include <string>
int main(){std::variant<int,std::string>v{7};std::visit([](const auto&x){std::cout<<x;},v);v=std::string("ready");std::cout<<' ';std::visit([](const auto&x){std::cout<<x;},v);std::cout<<'\n';}`,[{stdin:'',stdout:'7 ready\n'}]),
 p('variant-access-exception',['M6-A2'],io+cpp`#include <variant>
#include <string>
int main(){std::variant<int,std::string>v{7};try{(void)std::get<std::string>(v);}catch(const std::bad_variant_access&){std::cout<<"bad variant\n";}}`,[{stdin:'',stdout:'bad variant\n'}],{capability:'exceptions'}),
 p('state-transition-contract',['M6-A2','M6-A8'],io+cpp`enum class State{idle,editing,closed};
int main(){State s=State::idle;int saved=0,rejected=0;char e;while(std::cin>>e){if(e=='o'&&s==State::idle)s=State::editing;else if(e=='s'&&s==State::editing)++saved;else if(e=='x'&&s==State::editing)s=State::closed;else ++rejected;}std::cout<<static_cast<int>(s)<<' '<<saved<<' '<<rejected<<'\n';}`,[{stdin:'o s x',stdout:'2 1 0\n'},{stdin:'s o x',stdout:'2 0 1\n'},{stdin:'',stdout:'0 0 0\n'}]),
 p('model-presenter-boundary',['M6-A3','M6-A4'],io+cpp`#include <sstream>
class Counter{int n_=0;public:bool add(int n){if(n<0||n>100-n_)return false;n_+=n;return true;}int value()const{return n_;}};
std::string render(const Counter&c){return "value="+std::to_string(c.value());}
int main(){Counter model;int n;if(!(std::cin>>n)){std::cout<<"invalid\n";return 0;}const bool ok=model.add(n);std::cout<<render(model)<<' '<<ok<<'\n';}`,[{stdin:'5',stdout:'value=5 1\n'},{stdin:'101',stdout:'value=0 0\n'}]),
 p('strict-command-parse',['M6-A4'],io+cpp`#include <charconv>
#include <string>
int main(){std::string s;std::cin>>s;int n=0;auto r=std::from_chars(s.data(),s.data()+s.size(),n);const bool ok=r.ec==std::errc{}&&r.ptr==s.data()+s.size()&&n>=0&&n<=100;std::cout<<(ok?std::to_string(n):"invalid")<<'\n';}`,[{stdin:'7',stdout:'7\n'},{stdin:'7x',stdout:'invalid\n'},{stdin:'-1',stdout:'invalid\n'}]),
 p('subscription-lifetime',['M6-A5'],io+cpp`#include <memory>
#include <functional>
struct Bus{std::function<void()>slot;void emit(){if(slot)slot();}};
struct Connection{Bus&b;~Connection(){b.slot={};}};
int main(){Bus b;int delivered=0;{auto model=std::make_shared<int>(0);std::weak_ptr<int>w=model;Connection c{b};b.slot=[w,&delivered]{if(auto p=w.lock()){++*p;++delivered;}};b.emit();b.emit();model.reset();b.emit();}std::cout<<delivered<<' '<<(!b.slot)<<'\n';}`,[{stdin:'',stdout:'2 1\n'}]),
 p('queued-not-reentrant',['M6-A1','M6-A5'],io+cpp`#include <queue>
int main(){std::queue<int>q;q.push(1);int count=0;while(!q.empty()&&count<8){int e=q.front();q.pop();if(count++)std::cout<<' ';std::cout<<e;if(e==1){q.push(2);q.push(3);}}std::cout<<'\n';}`,[{stdin:'',stdout:'1 2 3\n'}]),
 p('cooperative-cancel',['M6-A6'],io+cpp`int main(){int n,limit;if(!(std::cin>>n>>limit)||n<0||n>10||limit<0){std::cout<<"invalid\n";return 0;}int done=0,value=0;bool cancelled=false;while(done<n){if(done==limit)cancelled=true;if(cancelled)break;++value;++done;}std::cout<<done<<' '<<value<<'\n';}`,[{stdin:'5 2',stdout:'2 2\n'},{stdin:'0 0',stdout:'0 0\n'},{stdin:'x 1',stdout:'invalid\n'}]),
 p('versioned-file-roundtrip',['M6-A7'],io+cpp`#include <fstream>
#include <string>
int main(){{std::ofstream out("state.txt");out<<"NX1\n4\n7\n";if(!out)return 2;}std::ifstream in("state.txt");std::string version;int a=0,b=0;if(!(in>>version>>a>>b)||version!="NX1")return 3;std::cout<<"v1 "<<a<<' '<<b<<'\n';}`,[{stdin:'',stdout:'v1 4 7\n'}],{outputFiles:{'state.txt':'NX1\n4\n7\n'}}),
 p('reject-unknown-file-version',['M6-A7'],io+cpp`#include <sstream>
#include <string>
int main(){std::string line;std::getline(std::cin,line);std::istringstream in(line);std::string version;int a=0,b=0;bool ok=bool(in>>version>>a>>b)&&version=="NX1";in>>std::ws;ok=ok&&in.eof();std::cout<<(ok?std::to_string(a+b):"invalid")<<'\n';}`,[{stdin:'NX1 4 7',stdout:'11\n'},{stdin:'NX2 4 7',stdout:'invalid\n'},{stdin:'NX1 4 7 extra',stdout:'invalid\n'}]),
 p('bounded-event-queue',['M6-A6','M6-A8'],io+cpp`#include <deque>
int main(){int n;if(!(std::cin>>n)||n<0||n>8){std::cout<<"invalid\n";return 0;}std::deque<int>q;int dropped=0;for(int i=0;i<n;++i){if(q.size()==2)++dropped;else q.push_back(i);}std::cout<<q.size()<<' '<<dropped<<'\n';}`,[{stdin:'4',stdout:'2 2\n'},{stdin:'0',stdout:'0 0\n'},{stdin:'-1',stdout:'invalid\n'}]),
 p('multifile-event-application',['M6-A9'],io+cpp`#include "model.hpp"
int main(){Model m;int rejected=0;for(int n:{1,2,-1})if(!m.add(n))++rejected;std::cout<<render(m)<<" rejected "<<rejected<<'\n';}`,[{stdin:'',stdout:'count 3 rejected 1\n'}],{files:{'model.hpp':'#ifndef MODEL_HPP\n#define MODEL_HPP\n#include <string>\nclass Model{int n_=0;public:bool add(int);int value()const;};\nstd::string render(const Model&);\n#endif\n','model.cpp':'#include "model.hpp"\nbool Model::add(int n){if(n<0||n>100-n_)return false;n_+=n;return true;}\nint Model::value()const{return n_;}\n','view.cpp':'#include "model.hpp"\nstd::string render(const Model&m){return "count "+std::to_string(m.value());}\n'},metadata:{translationUnits:['main.cpp','model.cpp','view.cpp']}}),
 p('qt-widgets-boundary',['M6-X1','M6-X2'],cpp`#include <QApplication>
#include <QPushButton>
#include <memory>
int main(int argc,char**argv){QApplication app(argc,argv);auto button=std::make_unique<QPushButton>("Test");button->show();return 0;}`,[{stdin:'',diagnostic:'QApplication'}],{boundary:'qt',nativeExpectation:'compile-error',browserExpectation:'compile-error',capability:'gui'}),
 p('managed-windows-forms-boundary',['M6-X1'],cpp`#include <string>
#using <System.Windows.Forms.dll>
int main(){return 0;}`,[{stdin:'',diagnostic:'using'}],{boundary:'cpp-cli',nativeExpectation:'compile-error',browserExpectation:'compile-error',capability:'gui'}),
 p('native-thread-boundary',['M6-A6'],io+cpp`#include <thread>
int main(){int n=0;std::thread worker([&]{n=3;});worker.join();std::cout<<n<<'\n';}`,[{stdin:'',stdout:'3\n',diagnostic:'thread'}],{boundary:'threads',nativeExpectation:'run',browserExpectation:'capability-limit',capability:'threads'}),
 p('worker-recovery',['M6-A9'],io+cpp`int main(){std::cout<<"recovered\n";}`,[{stdin:'',stdout:'recovered\n'}])
];
export const M6_CASE_COUNT=M6_PROBES.reduce((n,p)=>n+p.cases.length,0);
