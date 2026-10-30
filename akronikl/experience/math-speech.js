// Bounded structural reading, never evaluation. Used only for the spoken copy.
const names={
 ru:{sin:'синус',cos:'косинус',tan:'тангенс',tg:'тангенс',cot:'котангенс',ctg:'котангенс',asin:'арксинус',arcsin:'арксинус',acos:'арккосинус',arccos:'арккосинус',atan:'арктангенс',arctan:'арктангенс',sinh:'гиперболический синус',cosh:'гиперболический косинус',tanh:'гиперболический тангенс',ln:'натуральный логарифм',lg:'десятичный логарифм',log:'логарифм',exp:'экспонента',det:'определитель',rank:'ранг',tr:'след',abs:'модуль',norm:'норма'},
 en:{sin:'sine',cos:'cosine',tan:'tangent',tg:'tangent',cot:'cotangent',ctg:'cotangent',asin:'arcsine',arcsin:'arcsine',acos:'arccosine',arccos:'arccosine',atan:'arctangent',arctan:'arctangent',sinh:'hyperbolic sine',cosh:'hyperbolic cosine',tanh:'hyperbolic tangent',ln:'natural logarithm',lg:'base ten logarithm',log:'logarithm',exp:'exponential',det:'determinant',rank:'rank',tr:'trace',abs:'absolute value',norm:'norm'}
};
const alphabet={a:'а',b:'бэ',c:'цэ',d:'дэ',e:'е',f:'эф',g:'гэ',h:'аш',i:'и',j:'йот',k:'ка',l:'эль',m:'эм',n:'эн',o:'о',p:'пэ',q:'ку',r:'эр',s:'эс',t:'тэ',u:'у',v:'вэ',w:'дубль вэ',x:'икс',y:'игрек',z:'зэт'};
const greek={alpha:['альфа','alpha'],beta:['бета','beta'],gamma:['гамма','gamma'],delta:['дельта','delta'],epsilon:['эпсилон','epsilon'],theta:['тета','theta'],lambda:['лямбда','lambda'],mu:['мю','mu'],nu:['ню','nu'],xi:['кси','xi'],pi:['пи','pi'],rho:['ро','rho'],sigma:['сигма','sigma'],tau:['тау','tau'],phi:['фи','phi'],chi:['хи','chi'],psi:['пси','psi'],omega:['омега','omega']};
const greekCharacters='αβγδεθλμνξπρστφχψω',greekKeys=Object.keys(greek);
const binary={
 '=':['равно','equals'],'≠':['не равно','is not equal to'],'<':['меньше','is less than'],'>':['больше','is greater than'],'≤':['меньше или равно','is less than or equal to'],'≥':['больше или равно','is greater than or equal to'],'≈':['приблизительно равно','is approximately equal to'],
 '+':['плюс','plus'],'-':['минус','minus'],'*':['умножить на','times'],'·':['умножить на','times'],'×':['умножить на','times'],':':['делить на','divided by'],
 '→':['стремится к','tends to'],'∈':['принадлежит','belongs to'],'∉':['не принадлежит','does not belong to'],'∪':['объединение','union'],'∩':['пересечение','intersection'],'±':['плюс минус','plus or minus']
};
const commands={cdot:'·',times:'×',div:':',le:'≤',leq:'≤',ge:'≥',geq:'≥',ne:'≠',neq:'≠',approx:'≈',to:'→',rightarrow:'→',in:'∈',notin:'∉',cup:'∪',cap:'∩',pm:'±',infty:'∞',partial:'∂',nabla:'∇',sum:'∑',prod:'∏',int:'∫',lim:'lim'};
const small={ru:['ноль','один','два','три','четыре','пять','шесть','семь','восемь','девять','десять','одиннадцать','двенадцать','тринадцать','четырнадцать','пятнадцать','шестнадцать','семнадцать','восемнадцать','девятнадцать','двадцать'],en:['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty']};
const denominators={2:['вторая','вторых','half','halves'],3:['третья','третьих','third','thirds'],4:['четвёртая','четвёртых','quarter','quarters'],5:['пятая','пятых','fifth','fifths'],6:['шестая','шестых','sixth','sixths'],7:['седьмая','седьмых','seventh','sevenths'],8:['восьмая','восьмых','eighth','eighths'],9:['девятая','девятых','ninth','ninths'],10:['десятая','десятых','tenth','tenths']};
const token=/\\(?:[A-Za-z]+|.)|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[A-Za-z]+|[\p{L}\p{M}]+|<=|>=|!=|[^\s]/gu;
const superscripts={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-','⁺':'+'};
function tokens(value){
 const clean=value.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/gu,s=>'^{' + [...s].map(c=>superscripts[c]).join('')+'}')
  .replace(/[₀₁₂₃₄₅₆₇₈₉]+/gu,s=>'_{'+[...s].map(c=>'₀₁₂₃₄₅₆₇₈₉'.indexOf(c)).join('')+'}')
  .replace(/\\mathrm\{d\}\s*([a-z])\b/gu,'d$1')
  .replace(/\\(?:left|right)(?=[\s()[\]{}|])/gu,'').replace(/\\(?:,|;|!|quad\b|qquad\b| )/gu,' ');
 const result=(clean.match(token)??[]).map(t=>t==='-'||t==='−'?'-':({'<=':'≤','>=':'≥','!=':'≠'}[t]??commands[t.startsWith('\\')?t.slice(1):'']??t));
 if(result.length>1800)throw Error('MATH_TOO_LARGE');return result;
}
class Reader{
 constructor(value){this.t=tokens(value);this.at=0;this.depth=0;}
 peek(){return this.t[this.at];}take(){return this.t[this.at++];}
 need(t){if(this.take()!==t)throw Error('MATH_GROUP_INVALID');}
 group(open='{',close='}'){
  this.need(open);const values=[this.expression()];while(this.peek()===','){this.take();values.push(this.expression());}this.need(close);
  return values.length===1?values[0]:{type:'tuple',values};
 }
 script(){return this.peek()==='{'?this.group():this.atom();}
 bounds(){const out={};while(this.peek()==='_'||this.peek()==='^'){const key=this.take();if(out[key])throw Error('MATH_DUPLICATE_BOUND');out[key]=this.script();}return out;}
 integrand(){
  // The differential closes this integral; a later +2 belongs outside it.
  let level=0,nested=0;
  for(let i=this.at;i<this.t.length;i++){
   const t=this.t[i];if(['(','{','['].includes(t)){level++;continue;}if([')','}',']'].includes(t)){if(!level)break;level--;continue;}
   if(level)continue;if(t==='∫'){if(++nested>8)throw Error('MATH_TOO_DEEP');continue;}
   if(/^d[a-z]$/u.test(t)){
    if(nested){nested--;continue;}
    const inner=new Reader('');inner.t=this.t.slice(this.at,i+1);const value=inner.read();this.at=i+1;return value;
   }
   if(Object.hasOwn(binary,t)&&!['+','-','*','·','×',':','±'].includes(t))break;
  }
  return this.expression(6);
 }
 matrix(latex){
  const rows=[];let env;
  if(latex){this.need('{');env=this.take();if(!['matrix','pmatrix','bmatrix','vmatrix','Vmatrix'].includes(env))throw Error('MATH_ENV_UNSUPPORTED');this.need('}');}
  else this.need('[');
  do{
   if(!latex)this.need('[');const row=[this.expression()];
   while(this.peek()===(latex?'&':',')){this.take();row.push(this.expression());if(row.length>16)throw Error('MATH_MATRIX_TOO_LARGE');}
   if(!latex)this.need(']');rows.push(row);if(rows.length>16)throw Error('MATH_MATRIX_TOO_LARGE');
   if(this.peek()!==(latex?'\\\\':','))break;this.take();
  }while(true);
  if(latex){this.need('\\end');this.need('{');this.need(env);this.need('}');}else this.need(']');
  if(rows.some(r=>r.length!==rows[0].length))throw Error('MATH_MATRIX_RAGGED');
  return {type:'matrix',rows,determinant:env==='vmatrix',norm:env==='Vmatrix'};
 }
 atom(){
  if(++this.depth>60)throw Error('MATH_TOO_DEEP');let node;const t=this.peek();
  if(t===undefined)throw Error('MATH_OPERAND_MISSING');
  if(t==='(')node={type:'group',value:this.group('(',')')};
  else if(t==='{')node={type:'group',value:this.group()};
  else if(t==='['&&this.t[this.at+1]==='[')node=this.matrix(false);
  else if(t==='[')node={type:'group',value:this.group('[',']')};
  else if(t==='|'){this.take();node={type:'function',name:'abs',arg:this.expression()};this.need('|');}
  else if(t==='\\begin'){this.take();node=this.matrix(true);}
  else if(['\\frac','\\dfrac','\\tfrac'].includes(t)){this.take();node={type:'fraction',left:this.script(),right:this.script()};}
  else if(t==='\\sqrt'||t==='√'){
   this.take();const degree=this.peek()==='['?this.group('[',']'):null;node={type:'root',degree,arg:this.script()};
  }else if(['∑','∏','∫','lim'].includes(t)){
   this.take();const b=this.bounds();node={type:'large',operator:t,lower:b._,upper:b['^'],arg:t==='∫'?this.integrand():this.expression(11)};
  }else if(t==='\\operatorname'||t==='\\mathrm'||t==='\\text'){
   this.take();this.need('{');const word=this.take();this.need('}');
   if(t==='\\operatorname'){
    if(!Object.hasOwn(names.ru,word))throw Error('MATH_OPERATOR_UNSUPPORTED');
    this.t.splice(this.at,0,word);node=this.atom();
   }else node={type:'symbol',value:word};
  }else if(/^(?:\d|[\p{L}\\∞∂∇])/u.test(t)){
   this.take();const name=t.replace(/^\\/u,'');
   if(Object.hasOwn(names.ru,name)){
    const b=this.bounds();let arg;
    if(this.peek()==='(')arg=this.group('(',')');else if(this.peek()==='{')arg=this.group();else if(this.startsAtom())arg=this.expression(25);
    node={type:'function',name,arg,base:b._};if(b['^'])node={type:'power',left:node,right:b['^']};
   }else {if(t.startsWith('\\')&&!Object.hasOwn(greek,name.toLowerCase()))throw Error('MATH_COMMAND_UNSUPPORTED');node={type:/^\d/u.test(t)?'number':'symbol',value:name};}
  }else throw Error('MATH_TOKEN_UNSUPPORTED');
  this.depth--;return node;
 }
 startsAtom(){const t=this.peek();return t!==undefined&&t!=='\\end'&&(/^[\p{L}\p{N}∞∂∇]/u.test(t)||['(','{','[','\\frac','\\dfrac','\\tfrac','\\sqrt','√','\\begin'].includes(t)||/^\\[A-Za-z]+$/u.test(t));}
 expression(min=0){
  let left;
  if(this.peek()==='-'||this.peek()==='+'){const op=this.take();left={type:'unary',operator:op,arg:this.expression(25)};}else left=this.atom();
  while(this.at<this.t.length){
   const op=this.peek();
   if((op==='^'||op==='_')&&30>=min){const b=this.bounds();if(b._)left={type:'index',left,right:b._};if(b['^'])left={type:'power',left,right:b['^']};continue;}
   if(op==="'"&&30>=min){this.take();left={type:'derivative',arg:left};continue;}
   if(op==='('&&(left.type==='derivative'||left.type==='symbol'&&/^[fghFGH]$/u.test(left.value))&&30>=min){left={type:'call',name:left,arg:this.group('(',')')};continue;}
   const implicit=this.startsAtom(),precedence=op==='/'||op==='*'||op==='·'||op==='×'||op===':'||implicit?20:op==='+'||op==='-'||op==='±'?10:Object.hasOwn(binary,op)?5:0;
   if(!precedence||precedence<min)break;
   if(!implicit)this.take();const right=this.expression(precedence+1);
   left={type:op==='/'?'fraction':'binary',operator:implicit?'*':op,left,right};
  }
  return left;
 }
 read(){if(!this.t.length)throw Error('MATH_EMPTY');const node=this.expression();if(this.at!==this.t.length)throw Error('MATH_TRAILING_INPUT');return node;}
}
function speak(node,language){
 const en=language==='en',choose=(ru,eng)=>en?eng:ru,go=n=>speak(n,language),plain=n=>n?.type==='group'?n.value:n;
 const inflect=(n,form)=>{
  n=plain(n);if(en)return go(n);
  const cases=form==='to'?['нулю','одному','двум','трём','четырём','пяти','шести','семи','восьми','девяти','десяти']:['нуля','одного','двух','трёх','четырёх','пяти','шести','семи','восьми','девяти','десяти'];
  if(n.type==='number'&&/^\d+$/.test(n.value)&&cases[Number(n.value)])return cases[Number(n.value)];
  if(n.type==='symbol'&&form==='of'){
   const at=greekCharacters.indexOf(n.value.toLowerCase()),key=at>=0?greekKeys[at]:n.value.toLowerCase();
   const genitive={alpha:'альфы',beta:'беты',gamma:'гаммы',delta:'дельты',epsilon:'эпсилона',theta:'теты',lambda:'лямбды',mu:'мю',nu:'ню',xi:'кси',pi:'пи',rho:'ро',sigma:'сигмы',tau:'тау',phi:'фи',chi:'хи',psi:'пси',omega:'омеги'};
   if(genitive[key])return genitive[key];
  }
  if(n.type==='symbol'&&['∞','infty'].includes(n.value))return 'бесконечности';return go(n);
 };
 const number=s=>small[language][Number(s)]??s.replace('.',choose(' запятая ',' point '));
 if(node.type==='number'){
  const m=node.value.match(/^(.+)[eE]([+-]?\d+)$/u);return m?number(m[1])+choose(' умножить на десять в степени ',' times ten to the power of ')+number(m[2]):number(node.value);
 }
 if(node.type==='symbol'){
  const k=greekCharacters.indexOf(node.value.toLowerCase()),name=k>=0?greekKeys[k]:node.value.toLowerCase();
  if(greek[name])return greek[name][en?1:0];
  if(node.value==='∞'||node.value==='infty')return choose('бесконечность','infinity');
  if(node.value==='∂')return choose('знак частной производной','partial derivative');if(node.value==='∇')return choose('набла','nabla');
  return /^[A-Za-z]+$/u.test(node.value)?[...node.value.toLowerCase()].map(c=>en?c:alphabet[c]).join(' '):node.value;
 }
 if(node.type==='group')return choose('открыть скобку, ','open parenthesis, ')+go(node.value)+choose(', закрыть скобку',', close parenthesis');
 if(node.type==='tuple')return node.values.map(go).join(choose(', запятая, ', ', comma, '));
 if(node.type==='unary')return (node.operator==='-'?choose('минус ','minus '):choose('плюс ','plus '))+go(node.arg);
 if(node.type==='binary')return go(node.left)+' '+binary[node.operator][en?1:0]+' '+(node.operator==='→'?inflect(node.right,'to'):go(node.right));
 if(node.type==='power'){
  const degree=plain(node.right),special=degree.type==='number'?({'2':choose(' в квадрате',' squared'),'3':choose(' в кубе',' cubed')}[degree.value]):null;
  const base=['function','call'].includes(node.left.type)?choose('открыть скобку, ','open parenthesis, ')+go(node.left)+choose(', закрыть скобку',', close parenthesis'):go(node.left);
  return base+(special??choose(' в степени ',' to the power of ')+go(node.right));
 }
 if(node.type==='index')return go(node.left)+choose(' с индексом ',' subscript ')+go(plain(node.right));
 if(node.type==='fraction'){
  const a=plain(node.left),b=plain(node.right),den=b.type==='number'&&denominators[b.value];
  const differential=n=>n.type==='symbol'&&/^d[a-z]$/iu.test(n.value)?{kind:'ordinary',arg:{type:'symbol',value:n.value[1]}}:n.type==='binary'&&n.operator==='*'&&n.left.type==='symbol'&&['d','∂'].includes(n.left.value)?{kind:n.left.value==='∂'?'partial':'ordinary',arg:n.right}:null;
  const denominator=differential(b),numerator=differential(a);
  if(denominator&&(numerator?.kind===denominator.kind||a.type==='symbol'&&(a.value==='d'&&denominator.kind==='ordinary'||a.value==='∂'&&denominator.kind==='partial')))return (denominator.kind==='partial'?choose('частная производная','partial derivative'):choose('производная','derivative'))+(numerator?' '+go(numerator.arg):'')+choose(' по ',' with respect to ')+go(denominator.arg);
  if(a.type==='number'&&/^[1-9]$|^10$/u.test(a.value)&&den){const singular=a.value==='1';return en?number(a.value)+' '+den[singular?2:3]:(singular?'одна':a.value==='2'?'две':number(a.value))+' '+den[singular?0:1];}
  return choose('дробь, числитель: ','fraction, numerator: ')+go(a)+choose(', знаменатель: ',', denominator: ')+go(b)+choose(', конец дроби',', end fraction');
 }
 if(node.type==='function'){
  const bounded=n=>['binary','power','fraction','tuple'].includes(plain(n).type);
  const base=node.base?(bounded(node.base)?choose(' по основанию, выражение: ',' base, expression: ')+go(plain(node.base))+choose(', конец основания',', end base'):choose(' по основанию ',' base ')+go(plain(node.base))):'';
  const arg=node.arg?(bounded(node.arg)?choose(' от выражения: ',' of expression: ')+go(plain(node.arg))+choose(', конец аргумента',', end argument'):choose(' от ',' of ')+inflect(node.arg,'of')):'';
  return names[language][node.name]+base+arg;
 }
 if(node.type==='root')return (node.degree?choose('корень степени ','root of degree ')+go(plain(node.degree)):choose('квадратный корень','square root'))+choose(' из ',' of ')+go(plain(node.arg))+choose(', конец корня',', end root');
 if(node.type==='call')return go(node.name)+(['binary','power','fraction','tuple'].includes(plain(node.arg).type)?choose(' от выражения: ',' of expression: ')+go(plain(node.arg))+choose(', конец аргумента',', end argument'):choose(' от ',' of ')+go(node.arg));
 if(node.type==='derivative')return choose('производная ','derivative of ')+go(node.arg);
 if(node.type==='large'){
  const title=({'∑':['сумма','sum'],'∏':['произведение','product'],'∫':['интеграл','integral'],lim:['предел','limit']})[node.operator][en?1:0];
  let expression=go(node.arg);
  if(node.operator==='∫'&&node.arg.type==='binary'&&node.arg.operator==='*'&&node.arg.right.type==='symbol'&&/^d[a-z]$/u.test(node.arg.right.value))expression=go(node.arg.left)+choose(' по ',' with respect to ')+go({type:'symbol',value:node.arg.right.value[1]});
  return title+(node.lower?choose(node.operator==='lim'?' при ':', нижний предел: ',node.operator==='lim'?' as ':', lower bound: ')+go(plain(node.lower)):'')+(node.upper?choose(', верхний предел: ',', upper bound: ')+go(plain(node.upper)):'')+choose(', выражение: ',', expression: ')+expression+choose(', конец выражения',', end expression');
 }
 if(node.type==='matrix'){
  const title=node.determinant?choose('определитель матрицы','determinant of matrix'):node.norm?choose('норма матрицы','norm of matrix'):choose('матрица','matrix');
  const rows=node.rows.length,columns=node.rows[0].length;
  const plural=(n,forms)=>n%100>=11&&n%100<=14?forms[2]:n%10===1?forms[0]:n%10>=2&&n%10<=4?forms[1]:forms[2];
  const dimensions=en?number(String(rows))+(rows===1?' row and ':' rows and ')+number(String(columns))+(columns===1?' column':' columns'):(rows===1?'одна':rows===2?'две':number(String(rows)))+' '+plural(rows,['строка','строки','строк'])+' и '+number(String(columns))+' '+plural(columns,['столбец','столбца','столбцов']);
  return title+': '+dimensions+'. '+node.rows.map((r,i)=>choose('Строка ','Row ')+number(String(i+1))+': '+r.map(go).join('; ')+'.').join(' ')+choose(' Конец матрицы',' End matrix');
 }
 throw Error('MATH_NODE_UNSUPPORTED');
}
// Unknown notation is announced and read literally, rather than silently losing it.
function literal(value,language){
 const en=language==='en',symbols={'/':en?'slash':'косая черта','^':en?'power sign':'знак степени','_':en?'subscript sign':'нижний индекс','{':en?'open brace':'открыть фигурную скобку','}':en?'close brace':'закрыть фигурную скобку','(':en?'open parenthesis':'открыть круглую скобку',')':en?'close parenthesis':'закрыть круглую скобку','[':en?'open bracket':'открыть квадратную скобку',']':en?'close bracket':'закрыть квадратную скобку','&':en?'column separator':'разделитель столбцов','\\\\':en?'row separator':'разделитель строк',',':en?'comma':'запятая',';':en?'semicolon':'точка с запятой','|':en?'vertical bar':'вертикальная черта','%':en?'percent':'процент'};
 return (en?'Formula, literal notation: ':'Формула, запись по символам: ')+tokens(value).map(t=>{
  if(binary[t])return binary[t][en?1:0];if(symbols[t])return symbols[t];
  if(t.startsWith('\\'))return (en?'command ':'команда ')+t.slice(1);
  if(/^[\p{L}\p{M}\p{N}.]+$/u.test(t))return t;
  return (en?'Unicode symbol ':'символ юникод ')+[...t].map(c=>c.codePointAt(0)).join(' ');
 }).join(' ');
}
export function mathSpeech(value,{language='ru',strict=false}={}){
 if(typeof value!=='string'||value.length>4000)throw Error('MATH_TEXT_INVALID');language=language==='en'?'en':'ru';
 try{return speak(new Reader(value).read(),language);}catch(error){if(strict)throw error;return literal(value,language);}
}
export function isMathNotation(value){return /\\(?:frac|dfrac|tfrac|sqrt|sin|cos|tan|log|ln|sum|int|lim|begin)\b|[⁰¹²³⁴⁵⁶⁷⁸⁹∑∫√]|^\s*\d+\s*\/\s*\d+\s*$|\b(?:sin|cos|tan|ln|log)(?:_\{?\d+\}?)?\s*\(/u.test(value);}
export function proseMathSpeech(value,{language='ru'}={}){
 if(/[\uE000\uE001]/u.test(value))return value;
 // Protect already spoken replacements from subsequent plain-text recognizers.
 const spoken=[],store=text=>'\uE000'+(spoken.push(text)-1)+'\uE001';
 let result=value.replace(/https?:\/\/[^\s)]+/giu,m=>store(m));
 result=result.replace(/\$\$([\s\S]*?)\$\$|(?<![\\\w])\$([^$\n]+)\$|\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/gu,(_,a,b,c,d)=>store(mathSpeech(a??b??c??d,{language})));
 result=result.replace(/(?<![\p{L}\p{N}_/.,])(?:[0-9]|10)(?:[.,]\d{1,4})?\s*\/\s*(?:[0-9]|10)(?:[.,]\d{1,4})?(?![\p{L}\p{N}_/]|[.,]\d)/gu,m=>store(mathSpeech(m.replaceAll(',','.'),{language})));
 result=result.replace(/(?<![\p{L}\p{N}_/])(?:sin|cos|tan|ln|lg|log)(?:_\{?\d+\}?)?\s*\([^()\n]{1,120}\)/gu,m=>store(mathSpeech(m,{language})));
 return result.replace(/\uE000(\d+)\uE001/gu,(_,i)=>spoken[Number(i)]);
}
