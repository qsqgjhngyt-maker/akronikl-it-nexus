// Только проверка evidence, без изменения runtime и без автогрейдинга ученика.
export function filePropertiesMatch(properties={},files={}){
 try{for(const [name,p]of Object.entries(properties)){
  if(!Object.hasOwn(files,name)||typeof files[name]!=='string')return false;
  const value=files[name];
  if(p.kind==='equal-file'){if(!Object.hasOwn(files,p.other)||value!==files[p.other])return false;}
  else if(p.kind==='integer-lines'){
   if(p.count===0){if(value!=='')return false;continue;}
   if(!value.endsWith('\n'))return false;const lines=value.slice(0,-1).split('\n');
   if(lines.length!==p.count||lines.some(s=>!/^[-]?\d+$/.test(s)||!Number.isSafeInteger(Number(s))||Number(s)<p.min||Number(s)>p.max))return false;
  }else if(p.kind==='timing-table'){
   if(!value.endsWith('\n'))return false;const lines=value.slice(0,-1).split('\n');if(lines.shift()!=='algorithm\titeration\telapsed_ns'||lines.length!==p.algorithms.length*p.repetitions)return false;
   const seen=new Set();for(const line of lines){const a=line.split('\t');if(a.length!==3||!p.algorithms.includes(a[0])||!/^\d+$/.test(a[1])||Number(a[1])>=p.repetitions||!/^\d+$/.test(a[2]))return false;const key=a[0]+':'+Number(a[1]);if(seen.has(key))return false;seen.add(key);}
  }else return false;
 }return true;}catch{return false;}
}
