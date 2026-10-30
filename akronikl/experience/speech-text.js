// Spoken text only. The message, code and saved history remain byte-for-byte intact.
import {mathSpeech,proseMathSpeech,isMathNotation} from './math-speech.js';
const terms=new Map(Object.entries({
 'C++':'си плюс плюс','C#':'си шарп','F#':'эф шарп','C':'си',
 'JavaScript':'джава скрипт','TypeScript':'тайп скрипт','Python':'пайтон','Java':'джава',
 'Rust':'раст','Kotlin':'котлин','Swift':'свифт','Go':'гоу','PHP':'пи эйч пи',
 'HTML':'эйч ти эм эл','CSS':'си эс эс','SQL':'эс кью эл','JSON':'джейсон','XML':'экс эм эл',
 'API':'эй пи ай','SDK':'эс ди кей','HTTP':'эйч ти ти пи','HTTPS':'эйч ти ти пи эс',
 'URL':'ю ар эл','URI':'ю ар ай','UTF':'ю ти эф','UTF-8':'ю ти эф восемь',
 'CPU':'си пи ю','GPU':'джи пи ю','RAM':'рэм','SSD':'эс эс ди','TCP':'ти си пи','IP':'ай пи',
 'RAII':'ар эй ай ай','STL':'эс ти эл','OOP':'оу оу пи','ООП':'о о п',
 'Git':'гит','GitHub':'гит хаб','Docker':'докер','Linux':'линукс','Windows':'виндоус',
 'React':'реакт','Node.js':'ноуд джей эс','npm':'эн пи эм','Qwen':'квен','Piper':'пайпер',
 'Ctrl':'контрол','Enter':'энтер','Esc':'эскейп','Tab':'таб','Shift':'шифт',
}));
const codeWords=new Map(Object.entries({
 std:'эс ти ди',vector:'вектор',int:'инт',long:'лонг',short:'шорт',char:'чар',bool:'бул',
 float:'флоут',double:'дабл',void:'войд',auto:'ауто',const:'конст',static:'статик',
 unsigned:'ансайнд',signed:'сайнд',string:'стринг',size_t:'сайз ти',
 if:'иф',else:'элс',for:'фор',while:'вайл',do:'ду',return:'ретёрн',break:'брейк',continue:'континью',
 switch:'свитч',case:'кейс',default:'дефолт',class:'класс',struct:'стракт',enum:'энум',
 public:'паблик',private:'прайвит',protected:'протектед',virtual:'вёрчуал',override:'овэррайд',
 new:'нью',delete:'дилит',this:'зис',nullptr:'налл пойнтер',null:'налл',true:'тру',false:'фолс',
 namespace:'нейм спейс',using:'юзинг',template:'темплейт',typename:'тайп нейм',include:'инклуд',
 cout:'си аут',cin:'си ин',endl:'энд эл',main:'мэйн',printf:'принт эф',scanf:'скан эф',
 unique_ptr:'юник пойнтер',shared_ptr:'шэрд пойнтер',weak_ptr:'вик пойнтер',
 push_back:'пуш бэк',emplace_back:'эмплейс бэк',begin:'бигин',end:'энд',size:'сайз',
 def:'дэф',print:'принт',import:'импорт',from:'фром',async:'эйсинк',await:'эвейт',
 function:'фанкшн',let:'лет',var:'вар',console:'консоль',log:'лог',try:'трай',catch:'кэтч',throw:'троу',
 select:'селект',where:'вэр',insert:'инсёрт',update:'апдейт',values:'вэльюз',value:'вэлью',
}));
const letters={a:'эй',b:'би',c:'си',d:'ди',e:'и',f:'эф',g:'джи',h:'эйч',i:'ай',j:'джей',k:'кей',l:'эл',m:'эм',n:'эн',o:'оу',p:'пи',q:'кью',r:'ар',s:'эс',t:'ти',u:'ю',v:'ви',w:'дабл ю',x:'икс',y:'игрек',z:'зэд'};
const operators={
 '===':'строго равно','!==':'строго не равно','<=>':'трёхстороннее сравнение',
 '<<=':'сдвиг влево с присваиванием','>>=':'сдвиг вправо с присваиванием',
 '==':'равно','!=':'не равно','<=':'меньше или равно','>=':'больше или равно',
 '++':'плюс плюс','--':'минус минус','+=':'плюс равно','-=':'минус равно','*=':'умножить и присвоить','/=':'разделить и присвоить',
 '&&':'логическое и','||':'логическое или','<<':'два знака меньше','>>':'два знака больше',
 '->':'стрелка','=>':'стрелка','::':'два двоеточия','**':'возведение в степень',
 '=':'присвоить','+':'плюс','-':'минус','*':'звёздочка','/':'делить','%':'остаток от деления',
 '<':'меньше','>':'больше','!':'логическое не','&':'амперсанд','|':'вертикальная черта','^':'крышка','~':'тильда',
 '(':'открыть круглую скобку',')':'закрыть круглую скобку','[':'открыть квадратную скобку',']':'закрыть квадратную скобку',
 '{':'открыть фигурную скобку.','}':'закрыть фигурную скобку.',';':'точка с запятой.',
 ':':'двоеточие',',':'запятая','.':'точка','#':'решётка','?':'вопросительный знак','@':'собака',
};
const englishOperators={
 '===':'strictly equals','!==':'strictly does not equal','<=>':'three way comparison','<<=':'left shift and assign','>>=':'right shift and assign',
 '==':'equals','!=':'does not equal','<=':'less than or equal to','>=':'greater than or equal to','++':'increment','--':'decrement',
 '+=':'plus equals','-=':'minus equals','*=':'multiply and assign','/=':'divide and assign','&&':'logical and','||':'logical or',
 '<<':'left shift','>>':'right shift','->':'arrow','=>':'arrow','::':'double colon','**':'to the power of',
 '=':'assign','+':'plus','-':'minus','*':'asterisk','/':'divide by','%':'remainder','<':'less than','>':'greater than','!':'logical not',
 '&':'ampersand','|':'vertical bar','^':'caret','~':'tilde','(':'open parenthesis',')':'close parenthesis','[':'open bracket',']':'close bracket',
 '{':'open brace.','}':'close brace.',';':'semicolon.',':':'colon',',':'comma','.':'dot','#':'hash','?':'question mark','@':'at sign'
};
const tokenPattern=/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[\p{L}_][\p{L}\p{M}\p{N}_]*|\d+(?:\.\d+)?|===|!==|<=>|<<=|>>=|==|!=|<=|>=|\+\+|--|\+=|-=|\*=|\/=|&&|\|\||<<|>>|->|=>|::|\*\*|\/\/|[^\s]/gu;
function identifier(word,language='ru'){
 if(language==='en')return ({'C++':'C plus plus','C#':'C sharp',std:'S T D',nullptr:'null pointer'}[word]??word.replace(/([a-z])([A-Z])/gu,'$1 $2').replaceAll('_',' underscore '));
 if(terms.has(word))return terms.get(word);
 if(codeWords.has(word.toLowerCase()))return codeWords.get(word.toLowerCase());
 if(/^[a-z]$/iu.test(word))return letters[word.toLowerCase()];
 // Spell unknown identifiers rather than guessing an English pronunciation.
 return word.replace(/([a-z])([A-Z])/g,'$1 $2').split(/(_|\s+)/u).map(part=>part==='_'?'подчёркивание':/^[A-Za-z]+$/u.test(part)?[...part.toLowerCase()].map(c=>letters[c]).join(' '):part).join(' ');
}
function literalSpeech(value,language='ru'){
 const en=language==='en',ops=en?englishOperators:operators;
 const escaped={n:'экранированный перевод строки',t:'экранированная табуляция',r:'экранированный возврат каретки','\\':'обратная косая черта','"':'кавычка',"'":'апостроф'};
 const escapedEn={n:'escaped newline',t:'escaped tab',r:'escaped carriage return','\\':'backslash','"':'quotation mark',"'":'apostrophe'};
 return (value.match(/\\.|[A-Za-z]+|[\p{L}\p{M}\p{N}]+|[^\s]/gu)??[]).map(token=>{
  if(token.startsWith('\\'))return (en?escapedEn:escaped)[token[1]]??(en?'backslash ':'обратная косая черта ')+identifier(token.slice(1),language);
  if(/^[A-Za-z]+$/u.test(token))return identifier(token,language);
  if(token==='!')return en?'exclamation mark':'восклицательный знак';if(token==='=')return en?'equals sign':'знак равно';
  return ops[token]??token;
 }).join(' ');
}
export function codeSpeech(value,language='cpp',spokenLanguage='ru'){
 const en=spokenLanguage==='en',ops=en?englishOperators:operators;
 const python=/^(?:python|py)$/iu.test(language),shell=/^(?:bash|sh|shell|yaml|yml|ruby|rb)$/iu.test(language),sql=/^sql$/iu.test(language);
 const commentPattern=python||shell?'#[^\\n]*':sql?'--[^\\n]*|/\\*[\\s\\S]*?(?:\\*/|$)':'//[^\\n]*|/\\*[\\s\\S]*?(?:\\*/|$)';
 const tokens=value.match(new RegExp(commentPattern+'|'+tokenPattern.source,'gu'))??[];let templateDepth=0;
 return tokens.map((token,index)=>{
  if((!python&&!shell&&!sql&&token.startsWith('//'))||token.startsWith('/*')||(python||shell)&&token.startsWith('#')||sql&&token.startsWith('--'))return (en?'Comment: ':'Комментарий: ')+proseSpeech(token.replace(/^(?:\/\/|\/\*|#|--)|\*\/$/gu,''),spokenLanguage)+'.';
  if(token==='//'&&python)return en?'integer division':'целочисленное деление';
  if(/^['"]/u.test(token))return (en?'string, ':'строка, ')+literalSpeech(token.slice(1,-1),spokenLanguage)+(en?', end string':', конец строки');
  if(/^[\p{L}_]/u.test(token))return identifier(token,spokenLanguage);
  if(/^\d/u.test(token))return token.replace('.',en?' point ':' точка ');
  if(token==='<'&&/^(?:vector|map|set|list|array|deque|queue|stack|pair|tuple|optional|variant|unique_ptr|shared_ptr|weak_ptr|List|Map|Set|Promise|include)$/u.test(tokens[index-1]??'')){templateDepth++;return en?'open angle bracket':'открыть угловую скобку';}
  if(token==='>'&&templateDepth){templateDepth--;return en?'close angle bracket':'закрыть угловую скобку';}
  if(token==='>>'&&templateDepth>=2){templateDepth-=2;return en?'close angle bracket, close angle bracket':'закрыть угловую скобку, закрыть угловую скобку';}
  return ops[token]??token;
 }).join(' ').replace(/\s+/gu,' ').trim();
}
const termPattern=new RegExp('(?<![\\p{L}\\p{N}_])('+[...terms.keys()].sort((a,b)=>b.length-a.length).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')(?![\\p{L}\\p{N}_])','gu');
const withoutMath=value=>value.replace(/\$\$[\s\S]*?\$\$|\$[^$\n]*\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/gu,' ');
function textLanguage(value,fallback){
 const narrative=withoutMath(value);if(/[а-яё]/iu.test(narrative))return 'ru';
 const words=narrative.replace(/\\[a-z]+|\b(?:sin|cos|tan|ln|lg|log)\b/giu,' ').match(/\b[a-z]{2,}\b/giu)??[];
 return words.length>=3?'en':fallback;
}
function proseSpeech(value,language='ru'){
 if(value.includes('\n'))return value.split(/(\n+)/u).map(part=>/^\n+$/u.test(part)?part:proseSpeech(part,language)).join('');
 // English sentences must not acquire Cyrillic API/CPU/Python substitutions.
 language=textLanguage(value,language);
 const en=language==='en';
 return proseMathSpeech(value,{language}).replace(/!\[([^\]]*)\]\([^\n)]*\)/gu,en?'Image: $1.':'Изображение: $1.').replace(/\[([^\]]+)\]\([^\n)]*\)/gu,'$1')
  .replace(/\*\*([^*]+)\*\*|__([^_]+)__/gu,(_,a,b)=>a??b).replace(/\*([^*\n]+)\*/gu,'$1')
  .replace(/^\s{0,3}(?:#{1,6}\s+|>\s*|[-*+]\s+|\d+[.)]\s+)/gmu,'')
  .replace(/(?<!\p{L})т\.\s*е\./giu,'то есть').replace(/(?<!\p{L})т\.\s*д\./giu,'так далее').replace(/(?<!\p{L})т\.\s*п\./giu,'тому подобное')
  .replace(termPattern,term=>en?({'C++':'C plus plus','C#':'C sharp','F#':'F sharp'}[term]??term):terms.get(term))
  .replace(/(?<=\d)\.(?=\d)/gu,en?' point ':' точка ')
  .replace(/\s+[—–]\s+/gu,', ').replace(/…/gu,'...')
  .replace(/([\p{L}\p{N}])\s*\n\s*\n/gu,'$1.\n\n')
  .replace(/№\s*/gu,en?'number ':'номер ').replace(/\u00a0/gu,' ');
}
export function prepareSpeechText(value,{language='ru'}={}){
 if(typeof value!=='string'||value.length>12000)throw Error('SPEECH_TEXT_INVALID');
 language=language==='en'?'en':'ru';
 const parts=[];let at=0;
 // Fences and inline code are kept out of Markdown cleanup and prose pronunciation.
 const blocks=/(`{3,}|~{3,})([^\n]*)\n([\s\S]*?)(?:\n\1(?=\s|$)|$)|`([^`\n]+)`/gu;
 language=textLanguage(value.replace(blocks,' '),language);
 for(const match of value.matchAll(blocks)){
  parts.push(proseSpeech(value.slice(at,match.index),language));
  const mathBlock=/^(?:math|latex|tex)$/iu.test(match[2]?.trim()??'');
  parts.push(match[3]!==undefined?(mathBlock?mathSpeech(match[3],{language}):(language==='en'?'\nStart of code. ':'\nНачало кода. ')+codeSpeech(match[3],match[2].trim(),language)+(language==='en'?'. End of code.\n':'. Конец кода.\n')):isMathNotation(match[4])?mathSpeech(match[4],{language}):codeSpeech(match[4],'cpp',language));
  at=match.index+match[0].length;
 }
 parts.push(proseSpeech(value.slice(at),language));
 const result=parts.join('').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/gu,' ').replace(/[ \t]+/gu,' ').replace(/(?<!\.)\.\.(?!\.)/gu,'.').replace(/\.{4,}/gu,'...')
  .replace(/(?<![\p{L}\p{M}])запятой(?![\p{L}\p{M}])/giu,word=>word.slice(0,-1)+'\u0301'+word.slice(-1)).trim();
 if(result.length>60000)throw Error('SPEECH_TEXT_TOO_LONG');
 return result;
}
// Keep complete sentences/clauses, with a strict UTF-16 limit of 240 at the worker boundary.
export function phraseChunks(value){
 const chunks=[];let rest=value;
 while(rest){
  if(rest.length<=240){chunks.push(rest);break;}
  const window=rest.slice(0,240),sentences=[...window.matchAll(/[.!?…](?:[»”"')\]]*)(?:\s+|$)|\n\s*\n/gu)];
  // Avoid decimal versions, initials and short abbreviation boundaries.
  const meaningful=sentences.filter(m=>m.index>=35&&!/\d\.$/u.test(window.slice(0,m.index+1)));
  let end=meaningful.at(-1)?.index;
  if(end!==undefined){const m=chunks.length?meaningful.at(-1):meaningful[0];end=m.index+m[0].length;}
  else{const part=chunks.length?window:window.slice(0,160),clauses=[...part.matchAll(/[,;:]\s+/gu)].filter(m=>m.index>=55);const m=clauses.at(-1);end=m?m.index+m[0].length:part.lastIndexOf(' ')+1;}
  if(!end){end=240;if(/[\uD800-\uDBFF]/u.test(rest[end-1]))end--;}
  chunks.push(rest.slice(0,end));rest=rest.slice(end);
 }
 return chunks;
}
