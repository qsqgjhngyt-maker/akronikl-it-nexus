import fs from 'node:fs';
const assert=(v,m)=>{if(!v)throw new Error(m)};
for(const locale of ['ru','en']){
  const data=JSON.parse(fs.readFileSync(new URL(`../courses/cpp/data/lessons.${locale}.json`,import.meta.url),'utf8'));
  const lesson=data.lessons.find(x=>x.id==='cpp.oop-principles');
  assert(lesson,`${locale}: OOP benchmark missing`);
  for(const [field,needle] of [['code','std::cout << c.get() << "\\n";'],['solution','std::cout << w.getBalance() << "\\n";']]){
    const value=lesson[field]||'';
    assert(value.includes(needle),`${locale}: ${field} must contain valid quoted newline literal`);
    assert(!value.includes('\\\\"\\n\\\\"'),`${locale}: ${field} still contains JSON-escape backslashes in learner C++ source`);
  }
}
console.log('OOP_EXAMPLE_ESCAPE_REGRESSION_PASS');
