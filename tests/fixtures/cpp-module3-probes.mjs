// M3-0: одинаковые исходники для host C++20 и настоящего Clang/WASI.
// Только ограниченные, определённые программы; UB не используется как демонстрация.
const probe=(id,topics,source,cases,extra={})=>({id,topics,source,cases,...extra});
const io='#include <iostream>\n';
export const M3_PROBES=[
 probe('branch-switch',['cpp.if-else-switch'],io+`int main(){int n; if(!(std::cin>>n)){std::cout<<"invalid\\n";return 0;} switch(n){case 0:std::cout<<"zero\\n";break;case 1:std::cout<<"one\\n";break;default:std::cout<<(n<0?"negative\\n":"many\\n");}}`,[
  {stdin:'0',stdout:'zero\n'},{stdin:'1',stdout:'one\n'},{stdin:'-1',stdout:'negative\n'},{stdin:'8',stdout:'many\n'},{stdin:'x',stdout:'invalid\n'}]),
 probe('for-boundaries',['cpp.for-loop'],io+`int main(){int n;if(!(std::cin>>n)||n<0||n>100){std::cout<<"invalid\\n";return 0;}int sum=0;for(int i=0;i<n;++i)sum+=i;std::cout<<sum<<'\\n';}`,[{stdin:'0',stdout:'0\n'},{stdin:'1',stdout:'0\n'},{stdin:'5',stdout:'10\n'}]),
 probe('finite-stream',['cpp.while-do-while','cpp.streams-state'],io+`int main(){int n,sum=0;while(std::cin>>n){if(n==0)break;sum+=n;}int count=0;do{++count;}while(false);std::cout<<sum<<' '<<count<<'\\n';}`,[{stdin:'',stdout:'0 1\n'},{stdin:'2 3 0 99',stdout:'5 1\n'},{stdin:'2 3',stdout:'5 1\n'}]),
 probe('functions-contract',['M3-A1'],io+`bool valid(const int& x){return x>=0;}int twice(int x){return 2*x;}int main(){int x=4;std::cout<<valid(x)<<' '<<twice(x)<<' '<<x<<'\\n';}`,[{stdin:'',stdout:'1 8 4\n'}]),
 probe('array-vector-span',['M3-A2','cpp.one-dimensional-arrays'],io+`#include <array>
#include <vector>
#include <span>
int sum(std::span<const int> v){int s=0;for(int x:v)s+=x;return s;}
int main(){std::array<int,3>a{1,2,3};std::vector<int>v;v.push_back(4);v.push_back(5);int raw[2]{6,7};std::cout<<sum(a)<<' '<<sum(v)<<' '<<sum(raw)<<' '<<sum(std::span<const int>{})<<'\\n';}`,[{stdin:'',stdout:'6 9 13 0\n'}]),
 probe('matrix-shape',['cpp.two-dimensional-arrays'],io+`#include <array>
int main(){std::array<std::array<int,3>,2>m{{{{1,2,3}},{{4,5,6}}}};int sum=0;for(const auto& row:m)for(int x:row)sum+=x;std::cout<<m.size()<<' '<<m[0].size()<<' '<<sum<<'\\n';}`,[{stdin:'',stdout:'2 3 21\n'}]),
 probe('strings-utf8-view',['cpp.char-arrays-strings','M3-A3'],io+`#include <string>
#include <string_view>
int main(){char raw[]{'a','b','\\0'};std::string owned="Привет";std::string ascii="alpha";std::string_view view(ascii.data(),3);std::cout<<sizeof(raw)<<' '<<std::char_traits<char>::length(raw)<<' '<<owned.size()<<' '<<view<<'\\n';}`,[{stdin:'',stdout:'3 2 12 alp\n'}]),
 probe('record-validation',['cpp.structures'],io+`#include <string>
struct Record{int id;std::string name;};bool valid(const Record& r){return r.id>0&&!r.name.empty();}int main(){Record a{1,"Ada"},b{0,""};std::cout<<valid(a)<<' '<<valid(b)<<' '<<a.name<<'\\n';}`,[{stdin:'',stdout:'1 0 Ada\n'}]),
 probe('enum-variant',['cpp.unions-typedef-enums'],io+`#include <variant>
#include <string>
enum class Status{ready,done};using Id=int;
int main(){Id id=7;Status s=Status::ready;union Number{int i;double d;};Number n{};n.i=3;std::variant<int,std::string>v=std::string("go");std::cout<<id<<' '<<(s==Status::ready)<<' '<<n.i<<' '<<(std::get_if<int>(&v)==nullptr)<<' '<<*std::get_if<std::string>(&v)<<'\\n';}`,[{stdin:'',stdout:'7 1 3 1 go\n'}]),
 probe('ownership-move',['M3-A3'],io+`#include <memory>
#include <utility>
int live=0;struct Item{int value;explicit Item(int v):value(v){++live;}~Item(){--live;}};
int main(){{auto a=std::make_unique<Item>(7);auto b=std::move(a);std::cout<<bool(a)<<' '<<b->value<<' '<<live<<'\\n';}std::cout<<live<<'\\n';}`,[{stdin:'',stdout:'0 7 1\n0\n'}]),
 probe('formatted-output',['cpp.formatted-io'],io+`#include <iomanip>
int main(){std::cout<<std::fixed<<std::setprecision(2)<<1.25<<'|'<<std::setw(4)<<7<<'\\n';}`,[{stdin:'',stdout:'1.25|   7\n'}]),
 probe('stream-recovery',['cpp.streams-state'],io+`#include <sstream>
#include <string>
int main(){std::istringstream in("oops 42");int n=0;in>>n;std::cout<<in.fail()<<' ';in.clear();std::string bad;in>>bad>>n;std::cout<<bad<<' '<<n<<' '<<in.eof()<<'\\n';}`,[{stdin:'',stdout:'1 oops 42 1\n'}]),
 probe('unit-harness',['M3-A5'],io+`#include <cassert>
int abs_small(int n){return n<0?-n:n;}int main(){assert(abs_small(-3)==3);assert(abs_small(0)==0);assert(abs_small(3)==3);std::cout<<"3 checks\\n";}`,[{stdin:'',stdout:'3 checks\n'}]),
 probe('compile-negative',['M3-A5'],io+`int main(){int n=missing_name;std::cout<<n;}`,[{stdin:'',diagnostic:'missing_name'}],{expectation:'compile-error'}),
 probe('multifile',['M3-A4'],`#include <iostream>
#include "domain.hpp"
#include "domain.hpp"
int main(){std::cout<<twice(6)<<'\\n';}`,[{stdin:'',stdout:'12\n'}],{files:{'include/domain.hpp':'#ifndef DOMAIN_HPP\n#define DOMAIN_HPP\nint twice(int);\n#endif\n','src/domain.cpp':'#include "domain.hpp"\nint twice(int n){return n*2;}\n'},metadata:{translationUnits:['main.cpp','src/domain.cpp'],includeRoots:['include']}}),
 probe('link-missing-definition',['M3-A4'],`int declared_only();int main(){return declared_only();}`,[{stdin:'',diagnostic:'declared_only'}],{expectation:'compile-error'}),
 probe('link-odr',['M3-A4'],`int duplicated(){return 1;}int main(){return duplicated();}`,[{stdin:'',diagnostic:'duplicate'}],{files:{'other.cpp':'int duplicated(){return 2;}\n'},metadata:{translationUnits:['main.cpp','other.cpp']},expectation:'compile-error'}),
 probe('file-missing-handled',['cpp.files'],io+`#include <fstream>
int main(){std::ifstream in("absent-m30.txt");std::cout<<(in?"unexpected":"missing")<<'\\n';}`,[{stdin:'',stdout:'missing\n'}]),
 probe('file-project-input',['cpp.files'],io+`#include <fstream>
int main(){std::ifstream in("data/records.txt");int n=0,sum=0;if(!in){std::cout<<"open-failed\\n";return 0;}while(in>>n)sum+=n;std::cout<<sum<<'\\n';}`,[{stdin:'',stdout:'6\n'}],{files:{'data/records.txt':'1 2 3\n'},capability:'project-input-file'}),
 probe('file-within-run',['cpp.files'],io+`#include <fstream>
int main(){{std::ofstream out("report.txt");if(!out){std::cout<<"write-failed\\n";return 0;}out<<42;}std::ifstream in("report.txt");int n=0;if(!(in>>n)){std::cout<<"read-failed\\n";return 0;}std::cout<<n<<'\\n';}`,[{stdin:'',stdout:'42\n'}],{capability:'in-run-file'}),
 probe('file-export-write',['cpp.files'],io+`#include <fstream>
int main(){std::ofstream out("m30-persist.txt");out<<73;out.close();std::cout<<(out?"written":"write-failed")<<'\\n';}`,[{stdin:'',stdout:'written\n'}],{capability:'output-file-export',outputFiles:{'m30-persist.txt':'73'}}),
 probe('file-next-run',['cpp.files'],io+`#include <fstream>
int main(){std::ifstream in("m30-persist.txt");int n=0;if(in>>n)std::cout<<n<<'\\n';else std::cout<<"not-persisted\\n";}`,[{stdin:'',stdout:'73\n'}],{capability:'explicit-persistence',nativeSetup:{'m30-persist.txt':'73'}}),
 probe('bounded-list',['cpp.linked-lists'],io+`#include <memory>
#include <utility>
struct Node{int value;std::unique_ptr<Node> next;explicit Node(int v):value(v){}};
int main(){std::unique_ptr<Node>head;std::cout<<bool(head)<<' ';for(int i=1;i<=3;++i){auto n=std::make_unique<Node>(i);n->next=std::move(head);head=std::move(n);}int sum=0;for(Node*p=head.get();p;p=p->next.get())sum+=p->value;while(head){auto next=std::move(head->next);head=std::move(next);}std::cout<<sum<<' '<<bool(head)<<'\\n';}`,[{stdin:'',stdout:'0 6 0\n'}]),
 probe('stack-queue',['cpp.stacks-queues'],io+`#include <stack>
#include <queue>
int main(){std::stack<int>s;std::queue<int>q;std::cout<<s.empty()<<' '<<q.empty()<<' ';for(int n:{1,2,3}){s.push(n);q.push(n);}std::cout<<s.top()<<' '<<q.front()<<' ';s.pop();q.pop();std::cout<<s.top()<<' '<<q.front()<<'\\n';}`,[{stdin:'',stdout:'1 1 3 1 2 2\n'}]),
 probe('m1-input-bool-regression',['baseline:M1'],io+`int main(){int n;if(!(std::cin>>n)){std::cout<<"invalid\\n";return 0;}std::cout<<(n%2==0?"even\\n":"odd\\n");}`,[{stdin:'8',stdout:'even\n'},{stdin:'x',stdout:'invalid\n'}]),
 probe('m2-cast-regression',['baseline:M2'],io+`int main(){std::cout<<static_cast<double>(7)/2<<'\\n';}`,[{stdin:'',stdout:'3.5\n'}])
];
export const M3_CASE_COUNT=M3_PROBES.reduce((n,p)=>n+p.cases.length,0);
