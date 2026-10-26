// M5-0: одинаковые C++20 исходники/контракты для host и настоящего browser router.
import {readFileSync} from 'node:fs';
const cpp=String.raw,io='#include <iostream>\n',p=(id,topics,source,cases,extra={})=>({id,topics,source,cases,...extra});
const baseline=JSON.parse(readFileSync(new URL('../../courses/cpp/data/lessons.ru.json',import.meta.url))).lessons;
const legacy=(id,stdout)=>p('legacy-'+id.slice(4),[id],baseline.find(l=>l.id===id).code,[{stdin:'',stdout}],{baselineLesson:id});
export const M5_PROBES=[
 legacy('cpp.oop-principles','15\n'),legacy('cpp.classes-objects-state-control','5'),legacy('cpp.constructors-destructors','start demo\nwork\nfinish demo\n'),
 p('object-contract',['cpp.oop-principles','cpp.classes-objects-state-control'],io+cpp`class Stock{int value_=0;public:bool add(int n){if(n<0||n>100-value_)return false;value_+=n;return true;}int value()const{return value_;}};
int main(){int n;if(!(std::cin>>n)){std::cout<<"invalid\n";return 0;}Stock s;const bool ok=s.add(n);const Stock&view=s;std::cout<<ok<<' '<<view.value()<<'\n';}`,[{stdin:'0',stdout:'1 0\n'},{stdin:'100',stdout:'1 100\n'},{stdin:'101',stdout:'0 0\n'},{stdin:'-1',stdout:'0 0\n'},{stdin:'x',stdout:'invalid\n'}]),
 p('member-lifetime-order',['cpp.constructors-destructors'],io+cpp`struct Part{int id;explicit Part(int n):id(n){std::cout<<'+'<<id<<' ';}~Part(){std::cout<<'-'<<id<<' ';}};
struct Whole{Part first;Part second;Whole():second(2),first(1){std::cout<<"body ";}};
int main(){{Whole w;}std::cout<<'\n';}`,[{stdin:'',stdout:'+1 +2 body -2 -1 \n'}]),
 p('raii-early-return',['M5-A1'],io+cpp`struct Guard{int&live;explicit Guard(int&n):live(n){++live;}~Guard(){--live;}};
int operation(int&live,bool early){Guard g(live);if(early)return 3;return 7;}
int main(){int live=0;std::cout<<operation(live,true)<<' '<<live<<' '<<operation(live,false)<<' '<<live<<'\n';}`,[{stdin:'',stdout:'3 0 7 0\n'}]),
 p('unique-owner-move',['M5-A1','M5-A2'],io+cpp`#include <memory>
#include <utility>
struct Item{static int live;int value;explicit Item(int n):value(n){++live;}~Item(){--live;}};int Item::live=0;
int main(){{auto a=std::make_unique<Item>(7);auto b=std::move(a);std::cout<<(a==nullptr)<<' '<<b->value<<' '<<Item::live<<'\n';}std::cout<<Item::live<<'\n';}`,[{stdin:'',stdout:'1 7 1\n0\n'}]),
 p('shared-weak-lifetime',['M5-A1'],io+cpp`#include <memory>
struct Item{static int live;Item(){++live;}~Item(){--live;}};int Item::live=0;
int main(){std::weak_ptr<Item>w;{auto a=std::make_shared<Item>();auto b=a;w=a;std::cout<<a.use_count()<<' '<<w.expired()<<' ';{auto lock=w.lock();std::cout<<lock.use_count()<<' ';}}std::cout<<w.expired()<<' '<<Item::live<<'\n';}`,[{stdin:'',stdout:'2 0 3 1 0\n'}]),
 p('copy-move-contract',['M5-A2'],io+cpp`#include <utility>
struct Value{int n;explicit Value(int x):n(x){}Value(const Value&o):n(o.n){}Value(Value&&o)noexcept:n(std::exchange(o.n,0)){} };
int main(){Value a(7);Value b=a;Value c=std::move(a);b.n=9;std::cout<<a.n<<' '<<b.n<<' '<<c.n<<'\n';}`,[{stdin:'',stdout:'0 9 7\n'}]),
 p('rule-of-zero',['M5-A2'],io+cpp`#include <vector>
#include <string>
#include <utility>
struct Record{std::string name;std::vector<int>values;};
int main(){Record a{"one",{1,2,3}};auto b=a;b.values[0]=9;auto c=std::move(a);a.values.assign(2,4);std::cout<<c.name<<' '<<c.values[0]<<' '<<b.values[0]<<' '<<a.values.size()<<'\n';}`,[{stdin:'',stdout:'one 1 9 2\n'}]),
 p('virtual-dispatch-destruction',['M5-A3'],io+cpp`#include <memory>
struct Strategy{virtual int apply(int)const=0;virtual ~Strategy()=default;};
struct Twice final:Strategy{int&destroyed;explicit Twice(int&n):destroyed(n){}int apply(int n)const override{return n*2;}~Twice()override{++destroyed;}};
int main(){int destroyed=0;{std::unique_ptr<Strategy>s=std::make_unique<Twice>(destroyed);std::cout<<s->apply(6)<<' ';}std::cout<<destroyed<<'\n';}`,[{stdin:'',stdout:'12 1\n'}]),
 p('slicing-defined',['M5-A3'],io+cpp`struct Base{virtual int value()const{return 1;}virtual ~Base()=default;};struct Derived:Base{int value()const override{return 2;}};
int main(){Derived d;Base sliced=d;const Base&view=d;std::cout<<sliced.value()<<' '<<view.value()<<'\n';}`,[{stdin:'',stdout:'1 2\n'}]),
 p('rtti-pointer',['M5-A3'],io+cpp`struct Base{virtual ~Base()=default;};struct Derived:Base{};
int main(){Base b;Derived d;Base*yes=&d;Base*no=&b;std::cout<<(dynamic_cast<Derived*>(yes)!=nullptr)<<' '<<(dynamic_cast<Derived*>(no)==nullptr)<<'\n';}`,[{stdin:'',stdout:'1 1\n'}],{capability:'rtti'}),
 p('rtti-typeid',['M5-A3'],io+cpp`#include <typeinfo>
struct Base{virtual ~Base()=default;};struct Derived:Base{};
int main(){Derived d;Base*p=&d;std::cout<<(typeid(*p)==typeid(Derived))<<'\n';}`,[{stdin:'',stdout:'1\n'}],{capability:'rtti'}),
 p('exception-unwind',['M5-A4'],io+cpp`#include <stdexcept>
struct Guard{int&live;explicit Guard(int&n):live(n){++live;}~Guard(){--live;}};
int main(){int live=0;try{Guard g(live);throw std::runtime_error("controlled");}catch(const std::exception&){std::cout<<"caught "<<live<<'\n';}}`,[{stdin:'',stdout:'caught 0\n'}],{capability:'exceptions'}),
 p('exception-strong-guarantee',['M5-A4'],io+cpp`#include <vector>
#include <stdexcept>
int main(){int fail;if(!(std::cin>>fail))return 2;std::vector<int>values{1,2};try{auto next=values;next.push_back(3);if(fail)throw std::runtime_error("controlled");values.swap(next);}catch(const std::exception&){}for(int n:values)std::cout<<n<<' ';std::cout<<'\n';}`,[{stdin:'1',stdout:'1 2 \n'},{stdin:'0',stdout:'1 2 3 \n'}],{capability:'exceptions'}),
 p('literal-exception-word',['M5-A4'],io+cpp`int main(){std::cout<<"throw catch try\n";}`,[{stdin:'',stdout:'throw catch try\n'}],{capability:'lexical-guard'}),
 p('raw-literal-exception-word',['M5-A4'],io+cpp`int main(){std::cout<<R"tag(" throw ")tag"<<'\n';}`,[{stdin:'',stdout:'" throw "\n'}],{capability:'lexical-guard'}),
 p('raw-prefixes-comments',['M5-A4'],io+cpp`#include <string_view>
int main(){auto text=R"custom(" // try
/* catch */ throw ' \ ")custom";
auto a=u8R"z(throw ")z";auto b=LR"z(catch //)z";auto c=uR"z(try /*)z";auto d=UR"z(throw //)z";
std::cout<<(std::string_view(text).find("throw")!=std::string_view::npos)<<' '<<(a[0]==u8't'&&b[0]==L'c'&&c[0]==u't'&&d[0]==U't')<<'\n';}`,[{stdin:'',stdout:'1 1\n'}],{capability:'lexical-guard'}),
 p('exception-constructor-cleanup',['M5-A4'],io+cpp`#include <stdexcept>
struct Part{int id;explicit Part(int n):id(n){std::cout<<'+'<<id<<' ';if(id==2)throw std::runtime_error("constructor");}~Part(){std::cout<<'-'<<id<<' ';}};
struct Whole{Part a{1},b{2};~Whole(){std::cout<<"whole ";}};
int main(){try{Whole w;}catch(const std::exception&){std::cout<<"caught\n";}}`,[{stdin:'',stdout:'+1 +2 -1 caught\n'}],{capability:'exceptions'}),
 p('exception-typed-rethrow',['M5-A4'],io+cpp`#include <stdexcept>
struct Guard{char c;explicit Guard(char value):c(value){}~Guard(){std::cout<<c;}};
void fail(){Guard inner('i');throw std::logic_error("domain");}
void forward(){Guard outer('o');try{fail();}catch(const std::exception&){std::cout<<'r';throw;}}
int main(){try{forward();}catch(const std::logic_error&e){std::cout<<' '<<e.what()<<'\n';}}`,[{stdin:'',stdout:'iro domain\n'}],{capability:'exceptions'}),
 p('exception-stdlib-contract',['M5-A4'],io+cpp`#include <vector>
#include <string>
#include <optional>
#include <stdexcept>
int main(){try{std::vector<int>{7}.at(9);}catch(const std::out_of_range&){std::cout<<"range ";}try{std::stoi("bad");}catch(const std::invalid_argument&){std::cout<<"conversion ";}try{std::optional<int>{}.value();}catch(const std::bad_optional_access&){std::cout<<"optional\n";}}`,[{stdin:'',stdout:'range conversion optional\n'}],{capability:'exceptions'}),
 p('exception-ptr-nested',['M5-A4'],io+cpp`#include <exception>
#include <stdexcept>
void nested(){try{throw std::logic_error("inner");}catch(...){std::throw_with_nested(std::runtime_error("outer"));}}
int main(){std::exception_ptr p=std::make_exception_ptr(std::logic_error("saved"));try{std::rethrow_exception(p);}catch(const std::logic_error&e){std::cout<<e.what()<<' ';}try{nested();}catch(const std::exception&e){std::cout<<e.what()<<' ';try{std::rethrow_if_nested(e);}catch(const std::logic_error&x){std::cout<<x.what()<<'\n';}}}`, [{stdin:'',stdout:'saved outer inner\n'}],{capability:'exceptions'}),
 p('exception-multi-tu',['M5-A4'],io+cpp`#include <stdexcept>
#include "fail.hpp"
int main(){try{fail();}catch(const std::runtime_error&e){std::cout<<e.what()<<'\n';}}`,[{stdin:'',stdout:'other TU\n'}],{capability:'exceptions',files:{'fail.hpp':'void fail();\n','fail.cpp':'#include <stdexcept>\n#include "fail.hpp"\nvoid fail(){throw std::runtime_error("other TU");}\n'},metadata:{translationUnits:['main.cpp','fail.cpp']}}),
 p('templates-concepts',['M5-A5'],io+cpp`#include <concepts>
#include <array>
template<std::integral T>T add(T a,T b){return a+b;}
template<class T>struct Pair{std::array<T,2>values;T sum()const{return values[0]+values[1];}};
int main(){Pair<int>p{{2,3}};std::cout<<add(2,3)<<' '<<add(4L,5L)<<' '<<p.sum()<<'\n';}`,[{stdin:'',stdout:'5 9 5\n'}]),
 p('negative-private',['cpp.classes-objects-state-control'],cpp`class Box{int value=1;};int main(){Box b;return b.value;}`,[{stdin:'',diagnostic:'private'}],{expectation:'compile-error'}),
 p('negative-concept',['M5-A5'],cpp`#include <concepts>
template<std::integral T>T add(T a,T b){return a+b;}int main(){return add(1.5,2.5);}`,[{stdin:'',diagnostic:'constraint'}],{expectation:'compile-error'}),
 p('negative-owner-copy',['M5-A1','M5-A2'],cpp`#include <memory>
int main(){auto a=std::make_unique<int>(3);auto b=a;return *b;}`,[{stdin:'',diagnostic:'deleted'}],{expectation:'compile-error'}),
 p('composition-contract',['M5-A6'],io+cpp`int twice(int n){return 2*n;}int increment(int n){return n+1;}class Service{int(*operation_)(int);public:explicit Service(int(*f)(int)):operation_(f){}int run(int n)const{return operation_(n);}};
int main(){Service a(twice),b(increment);std::cout<<a.run(5)<<' '<<b.run(5)<<'\n';}`,[{stdin:'',stdout:'10 6\n'}]),
 p('project-domain-files',['M5-A6'],cpp`#include <iostream>
#include <fstream>
#include "domain.hpp"
int main(){std::ifstream in("data/items.txt");Stats stats;int n;while(in>>n)if(!stats.add(n))return 2;if(!in.eof())return 3;std::ofstream out("report.txt");out<<"count "<<stats.count()<<"\nsum "<<stats.sum()<<'\n';out.close();if(!out)return 4;std::cout<<stats.count()<<' '<<stats.sum()<<'\n';}`,[{stdin:'',stdout:'3 13\n'}],{files:{'include/domain.hpp':'#ifndef DOMAIN_HPP\n#define DOMAIN_HPP\nclass Stats{int count_=0;int sum_=0;public:bool add(int);int count()const;int sum()const;};\n#endif\n','src/domain.cpp':'#include "domain.hpp"\nbool Stats::add(int n){if(n<0||n>100||count_>=100)return false;++count_;sum_+=n;return true;}int Stats::count()const{return count_;}int Stats::sum()const{return sum_;}\n','data/items.txt':'2 4 7\n'},metadata:{includeRoots:['include'],translationUnits:['main.cpp','src/domain.cpp']},outputFiles:{'report.txt':'count 3\nsum 13\n'}}),
 p('m1-m4-regression',['baseline:M1','baseline:M2','baseline:M3','baseline:M4'],io+cpp`#include <vector>
#include <algorithm>
int main(){int n;if(!(std::cin>>n)){std::cout<<"invalid\n";return 0;}std::vector<int>a{3,1,2};std::sort(a.begin(),a.end());std::cout<<(n%2==0?"even":"odd")<<' '<<7.0/2<<' '<<a[0]<<a[1]<<a[2]<<'\n';}`,[{stdin:'8',stdout:'even 3.5 123\n'},{stdin:'x',stdout:'invalid\n'}])
];
export const M5_CASE_COUNT=M5_PROBES.reduce((n,p)=>n+p.cases.length,0);
