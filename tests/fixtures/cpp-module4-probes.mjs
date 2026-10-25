// M4-0: одни исходники и контракты для g++/UBSan и настоящего Clang/WASI.
const probe=(id,topics,source,cases,extra={})=>({id,topics,source,cases,...extra});
const io='#include <iostream>\n';
export const M4_PROBES=[
 probe('operation-counts',['M4-A1'],io+`int main(){int n;if(!(std::cin>>n)||n<0||n>128){std::cout<<"invalid\\n";return 0;}int linear=0,pairs=0;for(int i=0;i<n;++i)++linear;for(int i=0;i<n;++i)for(int j=i+1;j<n;++j)++pairs;std::cout<<linear<<' '<<pairs<<'\\n';}`,[
  {stdin:'0',stdout:'0 0\n'},{stdin:'1',stdout:'1 0\n'},{stdin:'8',stdout:'8 28\n'},{stdin:'128',stdout:'128 8128\n'},{stdin:'129',stdout:'invalid\n'}]),
 probe('three-sorts',['cpp.sorting-basic'],io+`#include <vector>
#include <algorithm>
void bubble(std::vector<int>&a){for(std::size_t end=a.size();end>1;--end)for(std::size_t i=1;i<end;++i)if(a[i]<a[i-1])std::swap(a[i],a[i-1]);}
void selection(std::vector<int>&a){for(std::size_t i=0;i<a.size();++i){std::size_t best=i;for(std::size_t j=i+1;j<a.size();++j)if(a[j]<a[best])best=j;std::swap(a[i],a[best]);}}
void insertion(std::vector<int>&a){for(std::size_t i=1;i<a.size();++i){int v=a[i];std::size_t j=i;while(j>0&&v<a[j-1]){a[j]=a[j-1];--j;}a[j]=v;}}
int main(){int n;if(!(std::cin>>n)||n<0||n>128){std::cout<<"invalid\\n";return 0;}std::vector<int>a;for(int i=0;i<n;++i){int v;if(!(std::cin>>v)){std::cout<<"invalid\\n";return 0;}a.push_back(v);}auto b=a,c=a,oracle=a;bubble(a);selection(b);insertion(c);std::sort(oracle.begin(),oracle.end());if(a!=oracle||b!=oracle||c!=oracle)return 2;for(std::size_t i=0;i<a.size();++i){if(i)std::cout<<' ';std::cout<<a[i];}std::cout<<'\\n';}`,[
  {stdin:'0',stdout:'\n'},{stdin:'1 7',stdout:'7\n'},{stdin:'6 3 -1 3 0 -1 2',stdout:'-1 -1 0 2 3 3\n'},{stdin:'5 5 4 3 2 1',stdout:'1 2 3 4 5\n'},{stdin:'3 4 x',stdout:'invalid\n'}]),
 probe('stable-record-order',['cpp.sorting-basic','M4-A2'],io+`#include <vector>
#include <algorithm>
struct Item{int key;int sequence;};bool less_key(const Item&a,const Item&b){return a.key<b.key;}
int main(){std::vector<Item>a{{2,0},{1,1},{2,2},{1,3}};std::stable_sort(a.begin(),a.end(),less_key);for(const auto&v:a)std::cout<<v.key<<':'<<v.sequence<<' ';std::cout<<'\\n';}`,[{stdin:'',stdout:'1:1 1:3 2:0 2:2 \n'}]),
 probe('comparator-contract',['cpp.sorting-basic','M4-A2'],io+`#include <array>
bool less_key(int a,int b){return a<b;}
int main(){std::array<int,4>a{0,1,1,2};bool valid=true;for(int x:a){valid=valid&&!less_key(x,x);for(int y:a){valid=valid&&!(less_key(x,y)&&less_key(y,x));for(int z:a)if(less_key(x,y)&&less_key(y,z))valid=valid&&less_key(x,z);}}std::cout<<valid<<'\\n';}`,[{stdin:'',stdout:'1\n'}]),
 probe('iterator-pipeline',['M4-A2'],io+`#include <vector>
#include <algorithm>
#include <numeric>
#include <iterator>
int main(){std::vector<int>a{4,1,3,2},b;int offset=10;std::transform(a.begin(),a.end(),std::back_inserter(b),[offset](int x){return x+offset;});std::sort(b.begin(),b.end(),[](int a,int b){return a>b;});auto p=std::find_if(b.begin(),b.end(),[](int x){return x%2==0;});std::cout<<std::accumulate(b.begin(),b.end(),0)<<' '<<*p<<' '<<std::distance(b.begin(),p)<<'\\n';std::vector<int>empty;std::cout<<(std::find(empty.begin(),empty.end(),7)==empty.end())<<' '<<std::accumulate(empty.begin(),empty.end(),0)<<'\\n';}`,[{stdin:'',stdout:'50 14 0\n1 0\n'}]),
 probe('iterator-invalidation-safe',['M4-A2'],io+`#include <vector>
#include <algorithm>
int main(){std::vector<int>a{1,2,3};auto pos=std::find(a.begin(),a.end(),2)-a.begin();a.reserve(a.capacity()+20);std::cout<<a[static_cast<std::size_t>(pos)]<<'\\n';}`,[{stdin:'',stdout:'2\n'}]),
 probe('binary-search-boundaries',['cpp.search-linear-binary'],io+`#include <vector>
#include <algorithm>
std::size_t lower(const std::vector<int>&a,int x){std::size_t first=0,last=a.size();while(first<last){const auto mid=first+(last-first)/2;if(a[mid]<x)first=mid+1;else last=mid;}return first;}
int main(){int n,x;if(!(std::cin>>n>>x)||n<0||n>128){std::cout<<"invalid\\n";return 0;}std::vector<int>a;for(int i=0;i<n;++i){int v;if(!(std::cin>>v)){std::cout<<"invalid\\n";return 0;}a.push_back(v);}if(!std::is_sorted(a.begin(),a.end())){std::cout<<"unsorted\\n";return 0;}auto i=lower(a,x);auto expected=std::lower_bound(a.begin(),a.end(),x)-a.begin();if(i!=static_cast<std::size_t>(expected))return 2;std::cout<<i<<' '<<(i<a.size()&&a[i]==x)<<'\\n';}`,[
  {stdin:'0 9',stdout:'0 0\n'},{stdin:'1 7 7',stdout:'0 1\n'},{stdin:'5 2 1 2 2 2 5',stdout:'1 1\n'},{stdin:'3 0 1 2 3',stdout:'0 0\n'},{stdin:'3 9 1 2 3',stdout:'3 0\n'},{stdin:'3 2 1 3 2',stdout:'unsorted\n'}]),
 probe('binary-comparison-count',['M4-A1','cpp.search-linear-binary'],io+`#include <vector>
int main(){std::vector<int>a(128);for(int i=0;i<128;++i)a[i]=2*i;int count=0;std::size_t first=0,last=a.size();while(first<last){auto mid=first+(last-first)/2;++count;if(a[mid]<127)first=mid+1;else last=mid;}std::cout<<first<<' '<<count<<'\\n';}`,[{stdin:'',stdout:'64 7\n'}]),
 probe('recursive-merge-sort',['M4-A3'],io+`#include <vector>
#include <algorithm>
void merge_sort(std::vector<int>&a,std::size_t lo,std::size_t hi,int depth,int&maximum){maximum=std::max(maximum,depth);if(hi-lo<2)return;auto mid=lo+(hi-lo)/2;merge_sort(a,lo,mid,depth+1,maximum);merge_sort(a,mid,hi,depth+1,maximum);std::vector<int>tmp;auto i=lo,j=mid;while(i<mid&&j<hi){if(a[j]<a[i])tmp.push_back(a[j++]);else tmp.push_back(a[i++]);}while(i<mid)tmp.push_back(a[i++]);while(j<hi)tmp.push_back(a[j++]);std::copy(tmp.begin(),tmp.end(),a.begin()+static_cast<std::ptrdiff_t>(lo));}
int main(){int n;if(!(std::cin>>n)||n<0||n>128){std::cout<<"limit\\n";return 0;}std::vector<int>a;for(int i=0;i<n;++i){int x;if(!(std::cin>>x))return 2;a.push_back(x);}auto expected=a;std::sort(expected.begin(),expected.end());int maximum=0;merge_sort(a,0,a.size(),1,maximum);if(a!=expected||maximum>8)return 3;std::cout<<"sorted "<<a.size()<<" bounded\\n";}`,[{stdin:'0',stdout:'sorted 0 bounded\n'},{stdin:'1 5',stdout:'sorted 1 bounded\n'},{stdin:'6 9 1 9 -1 0 2',stdout:'sorted 6 bounded\n'},{stdin:'129',stdout:'limit\n'},{stdin:'128 '+Array.from({length:128},(_,i)=>127-i).join(' '),stdout:'sorted 128 bounded\n'}]),
 probe('recursive-base-case',['M4-A3'],io+`#include <cstdint>
std::uint64_t factorial(unsigned n){return n<2?1:n*factorial(n-1);}
int main(){int n;if(!(std::cin>>n)||n<0||n>12){std::cout<<"limit\\n";return 0;}std::uint64_t iterative=1;for(int i=2;i<=n;++i)iterative*=static_cast<unsigned>(i);auto result=factorial(static_cast<unsigned>(n));if(result!=iterative)return 2;std::cout<<result<<'\\n';}`,[{stdin:'0',stdout:'1\n'},{stdin:'12',stdout:'479001600\n'},{stdin:'-1',stdout:'limit\n'}]),
 probe('associative-frequency',['M4-A4'],io+`#include <map>
#include <set>
#include <unordered_map>
#include <unordered_set>
#include <string>
int main(){std::unordered_map<std::string,int>counts;std::unordered_set<std::string>seen;std::string word;while(std::cin>>word){++counts[word];seen.insert(word);}auto before=counts.size();bool missing=counts.find("absent")==counts.end();if(counts.size()!=before||seen.size()!=counts.size())return 2;std::map<std::string,int>ordered(counts.begin(),counts.end());std::set<std::string>keys(seen.begin(),seen.end());for(const auto&[word,count]:ordered)std::cout<<word<<':'<<count<<' ';std::cout<<"| "<<keys.size()<<' '<<missing<<'\\n';}`,[{stdin:'',stdout:'| 0 1\n'},{stdin:'pear apple pear',stdout:'apple:1 pear:2 | 2 1\n'}]),
 probe('hash-collisions-scaffold',['M4-A4'],io+`#include <unordered_map>
#include <cstddef>
struct SameHash{std::size_t operator()(int)const{return 0;}};
int main(){std::unordered_map<int,int,SameHash>m;for(int n=0;n<16;++n)m.emplace(n,n*n);int sum=0;for(int n=0;n<16;++n){auto p=m.find(n);if(p==m.end()||p->second!=n*n)return 2;sum+=p->second;}m.erase(7);std::cout<<sum<<' '<<m.size()<<' '<<(m.find(7)==m.end())<<'\\n';}`,[{stdin:'',stdout:'1240 15 1\n'}]),
 probe('mt19937-defined-engine',['cpp.pseudo-random-numbers'],io+`#include <random>
int main(){std::mt19937 e;std::mt19937::result_type value=0;for(int i=0;i<10000;++i)value=e();std::cout<<value<<'\\n';}`,[{stdin:'',stdout:'4123659995\n'}]),
 probe('distribution-properties',['cpp.pseudo-random-numbers','M4-A5'],io+`#include <random>
#include <vector>
#include <algorithm>
int main(){std::mt19937 a(2026),b(2026);std::uniform_int_distribution<int>da(-3,3),db(-3,3);std::vector<int>x,y;for(int i=0;i<512;++i){x.push_back(da(a));y.push_back(db(b));}bool bounded=std::all_of(x.begin(),x.end(),[](int n){return n>=-3&&n<=3;});std::cout<<(x==y)<<' '<<bounded<<' '<<x.size()<<'\\n';}`,[{stdin:'',stdout:'1 1 512\n'}],{contract:'Сравниваются свойства и повтор внутри одной stdlib, не последовательность distribution между stdlib'}),
 probe('metamorphic-sort',['M4-A5'],io+`#include <vector>
#include <algorithm>
int main(){std::vector<std::vector<int>>inputs{{},{7},{3,1,3,-2},{0,0,0},{9,7,5,3,1}};int checked=0;for(const auto&source:inputs){auto sorted=source;std::sort(sorted.begin(),sorted.end());auto twice=sorted;std::sort(twice.begin(),twice.end());auto reversed=source;std::reverse(reversed.begin(),reversed.end());std::sort(reversed.begin(),reversed.end());if(!std::is_sorted(sorted.begin(),sorted.end())||!std::is_permutation(source.begin(),source.end(),sorted.begin(),sorted.end())||twice!=sorted||reversed!=sorted)return 2;++checked;}std::cout<<checked<<" properties\\n";}`,[{stdin:'',stdout:'5 properties\n'}]),
 probe('safe-mutation-detected',['M4-A5'],io+`#include <vector>
#include <algorithm>
int main(){std::vector<int>original{3,1,2},mutant=original;for(std::size_t i=0;i+2<mutant.size();++i)if(mutant[i+1]<mutant[i])std::swap(mutant[i+1],mutant[i]);if(std::is_sorted(mutant.begin(),mutant.end()))return 2;std::cout<<"mutation detected\\n";}`,[{stdin:'',stdout:'mutation detected\n'}]),
 probe('clock-samples-no-speed-claim',['M4-A5'],io+`#include <chrono>
#include <vector>
#include <algorithm>
int main(){using Clock=std::chrono::steady_clock;std::vector<int>base(128);for(int i=0;i<128;++i)base[i]=127-i;auto warmup=base;std::sort(warmup.begin(),warmup.end());std::vector<long long>raw;for(int repeat=0;repeat<3;++repeat){auto values=base;const auto start=Clock::now();std::sort(values.begin(),values.end());const auto end=Clock::now();if(!std::is_sorted(values.begin(),values.end()))return 2;raw.push_back(std::chrono::duration_cast<std::chrono::nanoseconds>(end-start).count());}if(!Clock::is_steady||std::any_of(raw.begin(),raw.end(),[](long long n){return n<0;}))return 3;std::cout<<"3 nonnegative samples\\n";}`,[{stdin:'',stdout:'3 nonnegative samples\n'}],{contract:'Только доступность часов; ни положительное время, ни speedup не обещаются'}),
 probe('project-index-files',['M4-A2','M4-A4','M4-A5'],`#include <iostream>
#include <fstream>
#include "domain.hpp"
int main(){std::ifstream in("data/records.txt");std::vector<Record>rows;Record r;while(in>>r.id>>r.name)rows.push_back(r);if(!in.eof())return 2;index_records(rows);std::ofstream out("report.txt");for(const auto&v:rows)out<<v.id<<' '<<v.name<<'\\n';out.close();if(!out)return 3;std::cout<<rows.size()<<' '<<find_record(rows,2)<<'\\n';}`,[{stdin:'',stdout:'3 beta\n'}],{files:{'include/domain.hpp':'#ifndef DOMAIN_HPP\n#define DOMAIN_HPP\n#include <vector>\n#include <string>\nstruct Record{int id;std::string name;};\nvoid index_records(std::vector<Record>&);\nstd::string find_record(const std::vector<Record>&,int);\n#endif\n','src/domain.cpp':'#include "domain.hpp"\n#include <algorithm>\nvoid index_records(std::vector<Record>&r){std::stable_sort(r.begin(),r.end(),[](const Record&a,const Record&b){return a.id<b.id;});}\nstd::string find_record(const std::vector<Record>&r,int id){auto p=std::lower_bound(r.begin(),r.end(),id,[](const Record&a,int id){return a.id<id;});return p!=r.end()&&p->id==id?p->name:"missing";}\n','data/records.txt':'3 gamma\n1 alpha\n2 beta\n'},metadata:{includeRoots:['include'],translationUnits:['main.cpp','src/domain.cpp']},outputFiles:{'report.txt':'1 alpha\n2 beta\n3 gamma\n'}}),
 probe('negative-compile',['M4-A2'],io+`int main(){std::cout<<m4_missing_name;}`,[{stdin:'',diagnostic:'m4_missing_name'}],{expectation:'compile-error'}),
 probe('negative-link',['M4-A5'],`int m4_missing_definition();int main(){return m4_missing_definition();}`,[{stdin:'',diagnostic:'m4_missing_definition'}],{expectation:'compile-error'}),
 probe('m1-m2-regression',['baseline:M1','baseline:M2'],io+`int main(){int n;if(!(std::cin>>n)){std::cout<<"invalid\\n";return 0;}std::cout<<(n%2==0?"even":"odd")<<' '<<static_cast<double>(7)/2<<'\\n';}`,[{stdin:'8',stdout:'even 3.5\n'},{stdin:'x',stdout:'invalid\n'}])
];
export const M4_CASE_COUNT=M4_PROBES.reduce((n,p)=>n+p.cases.length,0);
