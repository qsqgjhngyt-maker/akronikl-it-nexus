// M2-0: самостоятельные исходники C++20, а не готовые Gold-уроки.
// Определённое поведение; намеренно ошибочные программы помечены compile-error.
const unit=(body,headers='iostream')=>headers.split(',').map(h=>'#include <'+h+'>').join('\n')+'\nint main(){\n'+body+'\nreturn 0;\n}\n';
const probe=(id,lesson,body,stdout,headers='iostream',extra={})=>({id,lesson:'cpp.'+lesson,source:unit(body,headers),cases:[{stdin:'',stdout}],...extra});
export const M2_PROBES=[
 probe('first-output','first-cpp-program','std::cout << "Nexus\\n";','Nexus\n'),
 {id:'implicit-main-return',lesson:'cpp.first-cpp-program',source:'#include <iostream>\nint main(){std::cout << "Nexus\\n";}\n',cases:[{stdin:'',stdout:'Nexus\n'}]},
 probe('tokens-names','tokens-identifiers-keywords','int bytes_per_second=12; int Bytes_per_second=3; std::cout << bytes_per_second + Bytes_per_second << "\\n";','15\n'),
 probe('const-literals','comments-constants-literals','/* units */ const int seconds_per_minute=60; // named value\nstd::cout << 2 * seconds_per_minute << "\\n";','120\n'),
 probe('constexpr','comments-constants-literals','constexpr int bytes_per_kib=1024; std::cout << 2 * bytes_per_kib << "\\n";','2048\n'),
 probe('binary-separated-literals','comments-constants-literals',"std::cout << 0b1010 << ' ' << 1'000 << '\\n';",'10 1000\n'),
 probe('fundamental-types','data-types',"bool ready=true; char letter='A'; double ratio=0.5; std::cout << ready << ' ' << letter << ' ' << ratio << '\\n';",'1 A 0.5\n'),
 probe('uniform-auto-init','data-types',"int count{4}; auto total=count+2; std::cout << total << '\\n';",'6\n'),
 probe('numeric-limits','data-types',"std::cout << (std::numeric_limits<int>::max() >= 32767) << ' ' << (std::numeric_limits<long long>::digits >= 63) << ' ' << std::numeric_limits<int>::is_signed << '\\n';",'1 1 1\n','iostream,limits'),
 probe('type-layout','data-types',"std::cout << sizeof(char) << ' ' << sizeof(short) << ' ' << sizeof(int) << ' ' << sizeof(long) << ' ' << sizeof(long long) << ' ' << sizeof(void*) << '\\n';",null,'iostream',{expectation:'layout'}),
 probe('scope-shadow-copy','variables-scope',"int value=4; int copy=value; {int value=9; std::cout << value << ' ';} value=6; std::cout << value << ' ' << copy << '\\n';",'9 6 4\n'),
 probe('precedence-block','expressions-operators-blocks',"int result=2+3*4; {result=(2+3)*4;} std::cout << result << '\\n';",'20\n'),
 probe('division-remainder','arithmetic-assignment',"std::cout << 7/3 << ' ' << 7%3 << ' ' << -7/3 << ' ' << -7%3 << '\\n';",'2 1 -2 -1\n'),
 probe('compound-assignment','arithmetic-assignment',"int total=8; total+=4; total*=3; total/=2; total%=7; std::cout << total << '\\n';",'4\n'),
 probe('widen-before-multiply','arithmetic-assignment',"long long bytes=1'000'000LL * 1024 * 1024; std::cout << bytes << '\\n';",'1048576000000\n'),
 probe('static-cast','type-conversions',"double ratio=2.75; int whole=static_cast<int>(ratio); std::cout << whole << ' ' << static_cast<double>(5)/2 << '\\n';",'2 2.5\n'),
 probe('integer-floating-division','type-conversions',"std::cout << 5/2 << ' ' << 5/2.0 << '\\n';",'2 2.5\n'),
 probe('mixed-signed-unsigned','type-conversions',"int debt=-1; unsigned int balance=1; std::cout << (debt < balance) << '\\n';",'0\n'),
 probe('unsigned-modulo','type-conversions',"unsigned int value=0; value-=1; std::cout << (value > 0) << ' '; value+=1; std::cout << value << '\\n';",'1 0\n'),
 probe('floating-tolerance','type-conversions',"double delta=(0.1+0.2)-0.3; std::cout << (delta > -0.000001) << ' ' << (delta < 0.000001) << '\\n';",'1 1\n'),
 probe('short-circuit','relations-logic',"int zero=0; bool a=(zero!=0 && 10/zero>1); int visits=0; bool b=(true || ++visits>0); std::cout << a << ' ' << b << ' ' << visits << '\\n';",'0 1 0\n'),
 probe('prefix-postfix','increment-decrement-sizeof-conditional',"int n=3; int before=n++; int after=++n; std::cout << before << ' ' << after << ' ' << n << '\\n';",'3 5 5\n'),
 probe('sizeof-unevaluated','increment-decrement-sizeof-conditional',"int n=3; std::cout << (sizeof(++n)==sizeof(int)) << ' ' << n << '\\n';",'1 3\n'),
 probe('conditional-expression','increment-decrement-sizeof-conditional',"int a=3,b=8; std::cout << (a>b?a:b) << '\\n';",'8\n'),
 probe('pointer-reference-alias','pointers-references-addresses',"int original=3; int copy=original; int& alias=original; int* pointer=&original; alias=7; *pointer+=1; std::cout << original << ' ' << alias << ' ' << copy << ' ' << (pointer==&original) << '\\n';",'8 8 3 1\n'),
 probe('nullptr-const-pointer','pointers-references-addresses',"int value=7; const int* pointer=&value; int* empty=nullptr; if(empty==nullptr)std::cout << *pointer << '\\n';",'7\n'),
 probe('input-basic','standard-io',"int count=0; std::cin >> count; std::cout << count*2 << '\\n';",'16\n','iostream',{cases:[{stdin:'8\n',stdout:'16\n'}]}),
 probe('input-state','standard-io',"int count=0; if(!(std::cin>>count)){std::cout<<\"invalid\\n\";return 0;} std::cout<<count<<'\\n';",null,'iostream',{cases:[{stdin:'8\n',stdout:'8\n'},{stdin:'x\n',stdout:'invalid\n'},{stdin:'',stdout:'invalid\n'},{stdin:'9999999999999999999999999',stdout:'invalid\n'}]}),
 probe('getline-after-token','standard-io',"int count=0; std::string line; if(!(std::cin>>count)){return 0;} std::getline(std::cin,line); std::cout << count << '|' << line << '\\n';",null,'iostream,string',{cases:[{stdin:'8 rest of line\n',stdout:'8| rest of line\n'},{stdin:'8\nnext\n',stdout:'8|\n'}]}),
 probe('getline-ws','standard-io',"std::string line; std::getline(std::cin>>std::ws,line); std::cout << line << '\\n';",null,'iostream,string',{cases:[{stdin:' \n  Nexus Academy\n',stdout:'Nexus Academy\n'},{stdin:'',stdout:'\n'}]}),
 probe('fixed-precision','standard-io',"std::cout << std::fixed << std::setprecision(2) << 1.25 << '\\n';",'1.25\n','iostream,iomanip'),
 probe('invalid-const-write','comments-constants-literals','const int count=2; count=3;','', 'iostream',{expectation:'compile-error'}),
 probe('invalid-list-narrowing','type-conversions','int count{2.5}; std::cout<<count;','', 'iostream',{expectation:'compile-error'}),
 probe('invalid-keyword-name','tokens-identifiers-keywords','int class=2;','', 'iostream',{expectation:'compile-error'}),
 probe('transfer-capstone','standard-io',`long long mib=0,rate=0,overhead=0;
if(!(std::cin>>mib>>rate>>overhead)){std::cout<<"invalid\\n";return 0;}
std::cin>>std::ws;
if(!std::cin.eof() || mib<0 || mib>1000000 || rate<1 || rate>1000000 || overhead<0 || overhead>100){std::cout<<"invalid\\n";return 0;}
long long numerator=mib*1024*1024*8*(100+overhead);
long long denominator=100LL*rate*1000;
long long seconds=numerator/denominator+(numerator%denominator!=0);
std::cout<<seconds<<' '<<seconds/60<<' '<<seconds%60<<'\\n';`,null,'iostream',{cases:[
 {stdin:'0 1000 0',stdout:'0 0 0\n'},
 {stdin:'1 1000 0',stdout:'9 0 9\n'},
 {stdin:'1 1000 25',stdout:'11 0 11\n'},
 {stdin:'1000000 1 100',stdout:'16777216000 279620266 40\n'},
 ...['','1 1000','1.5 1000 0','1 0 0','-1 1000 0','1000001 1000 0','1 1000001 0','1 1000 -1','1 1000 101','1 1000 0 extra','1 1000 0.5','999999999999999999999999 1000 0'].map(stdin=>({stdin,stdout:'invalid\n'})),
 {stdin:'1 1000 25 \n\t',stdout:'11 0 11\n'}]})
];
export function matchesOutput(probe,actual,testCase){
 if(probe.expectation==='layout'){
  const sizes=actual.trim().split(/\s+/).map(Number);
  // sizeof измеряется в C++ bytes, а CHAR_BIT не обязан равняться 8.
  // Численные размеры фиксируем как наблюдение target, проверяем порядок.
  return sizes.length===6 && sizes.every(Number.isInteger) && sizes[0]===1 && sizes[1]>=1 && sizes[2]>=sizes[1] && sizes[3]>=sizes[2] && sizes[4]>=sizes[3] && sizes[5]>0;
 }
 return actual===testCase.stdout;
}
