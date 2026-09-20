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

export function parseRuntimeError(error,source=''){
  const raw=String(error?.message||error||'Неизвестная ошибка');
  const m=raw.match(/line\s+(\d+)\s*\(column\s*(\d+)\)/i)||raw.match(/line\s+(\d+)/i);
  const rawLine=m?Number(m[1]):null;const offset=Number(error?.anxLineOffset||0);const line=rawLine?Math.max(1,rawLine-offset):null;const column=m&&m[2]?Number(m[2]):null;
  let title='Ошибка выполнения';let explanation='Среда не смогла выполнить программу. Откройте технический вывод и проверьте указанную строку.';
  if(/Parsing Failure|Expected|parse|syntax/i.test(raw)){title='Ошибка синтаксиса';explanation='Парсер не смог разобрать конструкцию C++. Проверьте скобки, точки с запятой, кавычки и конструкцию рядом с отмеченной строкой.'}
  if(/std::|unexpected token.*:/i.test(raw)){explanation='Текущий браузерный runtime поддерживает учебное подмножество C++. Nexus применяет слой совместимости для стандартных имён std::cout/std::cin; если ошибка повторяется, проверьте технический вывод.'}
  if(/not defined|unknown identifier|undeclared/i.test(raw)){title='Неизвестное имя';explanation='В коде используется имя, которое среда не знает в этой области видимости. Проверьте объявление переменной, функции или заголовка.'}
  const snippet=line?String(source).split('\n')[line-1]||'':'';
  return{title,explanation,line,column,raw,snippet};
}
