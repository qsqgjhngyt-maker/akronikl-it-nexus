const count=(s,ch)=>[...s].filter(x=>x===ch).length;

export function analyzeSource(source,requirements=[]){
  const code=String(source??'');
  const issues=[];
  if(!/\b(?:int|auto)\s+main\s*\(/.test(code))issues.push({level:'error',line:1,message:'Не найдена точка входа main().'});
  const pairs=[['{','}','фигурные скобки'],['(',')','круглые скобки'],['[',']','квадратные скобки']];
  for(const [a,b,label] of pairs){const da=count(code,a),db=count(code,b);if(da!==db)issues.push({level:'error',line:1,message:`Не сбалансированы ${label}: ${da} / ${db}.`})}
  const lines=code.split('\n');
  lines.forEach((line,i)=>{
    const trimmed=line.trim();
    if(!trimmed||trimmed.startsWith('#')||trimmed.startsWith('//')||/[{}:]$/.test(trimmed))return;
    if(/^(if|for|while|switch|else|do)\b/.test(trimmed))return;
    if(/^(int|double|float|char|bool|string|std::string|return|cout|cin|cerr|std::cout|std::cin|std::cerr)\b/.test(trimmed)&&!/[;{}]$/.test(trimmed))issues.push({level:'warning',line:i+1,message:'Строка похожа на оператор без завершающей точки с запятой.'});
  });
  const checks=(requirements||[]).map(req=>({requirement:req,ok:code.includes(req)}));
  return{issues,checks,requirementsPassed:checks.filter(x=>x.ok).length,requirementsTotal:checks.length,lineCount:lines.length};
}

const labels=(features,locale='ru')=>(features||[]).map(x=>locale==='en'?(x.labelEn||x.id):(x.labelRu||x.id)).join(', ');

export function parseRuntimeError(error,source='',options={}){
  const raw=String(error?.message||error||'Неизвестная ошибка');
  const firstRaw=String(error?.anxFirstError||'');
  const evidence=firstRaw?`${firstRaw}\n${raw}`:raw;
  const m=raw.match(/line\s+(\d+)\s*\(column\s*(\d+)\)/i)||raw.match(/line\s+(\d+)/i)||firstRaw.match(/line\s+(\d+)\s*\(column\s*(\d+)\)/i)||firstRaw.match(/line\s+(\d+)/i);
  const rawLine=m?Number(m[1]):null;const offset=Number(error?.anxLineOffset||0);const detectedLine=rawLine?Math.max(1,rawLine-offset):null;const detectedColumn=m&&m[2]?Number(m[2]):null;
  const locale=options.locale==='en'?'en':'ru';
  const analysis=options.analysis||null;
  const capability=error?.anxCapability||options.capability||null;
  const bestEffort=capability?.bestEffort||[];
  const parseLike=/Parsing Failure|Expected|parse|syntax|unexpected token/i.test(evidence);
  const compatibilityRetryFailed=error?.anxCompatibilityRetry===true;
  const noStaticErrors=!analysis||analysis.issues?.filter(x=>x.level==='error').length===0;
  const providerLimit=(parseLike||compatibilityRetryFailed)&&noStaticErrors&&bestEffort.length>0;
  const line=providerLimit?null:detectedLine;
  const column=providerLimit?null:detectedColumn;
  let kind='runtime-error';
  let title=locale==='en'?'Runtime error':'Ошибка выполнения';
  let explanation=locale==='en'?'The environment could not execute the program. Open technical output and inspect the reported line.':'Среда не смогла выполнить программу. Откройте технический вывод и проверьте указанную строку.';
  if(providerLimit){
    kind='provider-limit';
    title=locale==='en'?'Browser Runtime limitation':'Ограничение Browser Runtime';
    const featureText=labels(bestEffort,locale);
    explanation=locale==='en'
      ?`Nexus structural checks did not find a basic syntax-shape error, but the lightweight Browser Runtime does not guarantee full support for: ${featureText}. ${compatibilityRetryFailed?'A safe compatibility retry was attempted, but the lightweight provider still could not execute this program. ':''}This is an environment limitation, not proof that your C++ source is invalid. The same Sandbox UI will route such code to an extended provider when it becomes available.`
      :`Структурная проверка Nexus не нашла базовой ошибки формы кода, но лёгкий Browser Runtime не гарантирует полную поддержку конструкций: ${featureText}. ${compatibilityRetryFailed?'Безопасный compatibility retry был выполнен, но лёгкий provider всё равно не смог запустить программу. ':''}Это ограничение среды, а не доказательство ошибки вашего C++. В дальнейшем тот же Nexus Sandbox будет направлять такой код в расширенный provider.`;
  }else if(parseLike){
    kind='syntax-error';title=locale==='en'?'Syntax error':'Ошибка синтаксиса';
    explanation=locale==='en'?'The parser could not read a C++ construct. Check brackets, semicolons, quotes, and the construct near the marked line.':'Парсер не смог разобрать конструкцию C++. Проверьте скобки, точки с запятой, кавычки и конструкцию рядом с отмеченной строкой.';
  }
  if(!providerLimit&&/std::|unexpected token.*:/i.test(raw)){
    explanation=locale==='en'?'The current Browser Runtime supports a teaching subset of C++. Nexus applies compatibility adaptations for common standard-library names; inspect the technical output if the error repeats.':'Текущий Browser Runtime поддерживает учебное подмножество C++. Nexus применяет слой совместимости для распространённых стандартных имён; если ошибка повторяется, проверьте технический вывод.';
  }
  if(!providerLimit&&/not defined|unknown identifier|undeclared/i.test(raw)){kind='unknown-name';title=locale==='en'?'Unknown name':'Неизвестное имя';explanation=locale==='en'?'The code uses a name that is not known in this scope. Check declarations, function names, and headers.':'В коде используется имя, которое среда не знает в этой области видимости. Проверьте объявление переменной, функции или заголовка.'}
  const snippet=line?String(source).split('\n')[line-1]||'':'';
  const technicalRaw=firstRaw?`${locale==='en'?'Primary Browser Runtime attempt':'Первичная попытка Browser Runtime'}:\n${firstRaw}\n\n${locale==='en'?'Compatibility retry':'Compatibility retry'}:\n${raw}`:raw;
  return{kind,title,explanation,line,column,raw:technicalRaw,snippet,capability,bestEffort,providerLimit,compatibilityRetryFailed};
}
