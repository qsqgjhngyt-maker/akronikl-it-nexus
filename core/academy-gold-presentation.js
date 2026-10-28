// CP-GOLD учебная разметка и интерактив без изменения сохранения кода/прогресса.
import {goldVisualizationSteps} from './academy-gold-model.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const E=esc;
const ordered=items=>'<ol>'+items.map(s=>'<li>'+E(s)+'</li>').join('')+'</ol>';
const badge=(s)=>'<span class="gold-badge">'+E(s)+'</span>';
const links={
  'CPP20-CALLABLE':{label:'WG21 N4861 — function wrapper',url:'https://timsong-cpp.github.io/cppwp/n4861/func.wrap.func'},
  'CPP20-CHARCONV':{label:'WG21 N4861 — from_chars',url:'https://timsong-cpp.github.io/cppwp/n4861/charconv.from.chars'},
  'QT68-SIGNALS':{label:'Qt 6.8 — Signals and Slots',url:'https://doc.qt.io/qt-6.8/signalsandslots.html'},
  'QT68-OWNERSHIP':{label:'Qt 6.8 — Object Trees and Ownership',url:'https://doc.qt.io/qt-6.8/objecttrees.html'},
  'QT68-WASM':{label:'Qt 6.8 — Qt for WebAssembly',url:'https://doc.qt.io/qt-6.8/wasm.html'},
  'QT68-CMAKE':{label:'Qt 6.8 — CMake',url:'https://doc.qt.io/qt-6.8/cmake-get-started.html'},
  'CPP20-DTOR':{label:'WG21 N4861 (C++20 draft) — class.dtor',url:'https://timsong-cpp.github.io/cppwp/n4861/class.dtor'},
  'CPP20-COPY':{label:'WG21 N4861 (C++20 draft) — class.copy.ctor',url:'https://timsong-cpp.github.io/cppwp/n4861/class.copy.ctor'},
  'CPP20-EXCEPT':{label:'WG21 N4861 (C++20 draft) — except',url:'https://timsong-cpp.github.io/cppwp/n4861/except'},
  'CPP20-CONSTRAINTS':{label:'WG21 N4861 (C++20 draft) — temp.constr',url:'https://timsong-cpp.github.io/cppwp/n4861/temp.constr'},
  'CPP20-WEAK':{label:'WG21 N4861 (C++20 draft) — util.smartptr.weak',url:'https://timsong-cpp.github.io/cppwp/n4861/util.smartptr.weak'},

  'CPP20-ALGORITHMS':{label:'WG21 N4861 (C++20 draft) — algorithms.requirements',url:'https://timsong-cpp.github.io/cppwp/n4861/algorithms.requirements'},
  'CPP20-SORT':{label:'WG21 N4861 (C++20 draft) — alg.sorting',url:'https://timsong-cpp.github.io/cppwp/n4861/alg.sorting'},
  'CPP20-ITERATORS':{label:'WG21 N4861 (C++20 draft) — iterator.requirements',url:'https://timsong-cpp.github.io/cppwp/n4861/iterator.requirements'},
  'CPP20-BINARY':{label:'WG21 N4861 (C++20 draft) — alg.binary.search',url:'https://timsong-cpp.github.io/cppwp/n4861/alg.binary.search'},
  'CPP20-UNORDERED':{label:'WG21 N4861 (C++20 draft) — unord.req',url:'https://timsong-cpp.github.io/cppwp/n4861/unord.req'},
  'CPP20-RANDOM':{label:'WG21 N4861 (C++20 draft) — rand.predef',url:'https://timsong-cpp.github.io/cppwp/n4861/rand.predef'},
  'CPP20-DISTRIBUTIONS':{label:'WG21 N4861 (C++20 draft) — rand.dist.general',url:'https://timsong-cpp.github.io/cppwp/n4861/rand.dist.general'},
  'CPP20-STEADY':{label:'WG21 N4861 (C++20 draft) — time.clock.steady',url:'https://timsong-cpp.github.io/cppwp/n4861/time.clock.steady'},

  'CPP20-SELECTION':{label:'WG21 N4861 (C++20 draft) — stmt.select',url:'https://timsong-cpp.github.io/cppwp/n4861/stmt.select'},
  'CPP20-ITERATION':{label:'WG21 N4861 (C++20 draft) — stmt.iter',url:'https://timsong-cpp.github.io/cppwp/n4861/stmt.iter'},
  'CPP20-FUNCTIONS':{label:'WG21 N4861 (C++20 draft) — dcl.fct.def',url:'https://timsong-cpp.github.io/cppwp/n4861/dcl.fct.def'},
  'CPP20-VECTOR':{label:'WG21 N4861 (C++20 draft) — vector',url:'https://timsong-cpp.github.io/cppwp/n4861/vector'},
  'CPP20-SPAN':{label:'WG21 N4861 (C++20 draft) — views.span',url:'https://timsong-cpp.github.io/cppwp/n4861/views.span'},
  'CPP20-ARRAY':{label:'WG21 N4861 (C++20 draft) — array',url:'https://timsong-cpp.github.io/cppwp/n4861/array'},
  'CPP20-STRING':{label:'WG21 N4861 (C++20 draft) — basic.string',url:'https://timsong-cpp.github.io/cppwp/n4861/basic.string'},
  'CPP20-STRINGVIEW':{label:'WG21 N4861 (C++20 draft) — string.view',url:'https://timsong-cpp.github.io/cppwp/n4861/string.view'},
  'CPP20-CLASS':{label:'WG21 N4861 (C++20 draft) — class',url:'https://timsong-cpp.github.io/cppwp/n4861/class'},
  'CPP20-ENUM':{label:'WG21 N4861 (C++20 draft) — dcl.enum',url:'https://timsong-cpp.github.io/cppwp/n4861/dcl.enum'},
  'CPP20-VARIANT':{label:'WG21 N4861 (C++20 draft) — variant.get',url:'https://timsong-cpp.github.io/cppwp/n4861/variant.get'},
  'CPP20-UNIQUE':{label:'WG21 N4861 (C++20 draft) — unique.ptr',url:'https://timsong-cpp.github.io/cppwp/n4861/unique.ptr'},
  'CPP20-ASSERT':{label:'WG21 N4861 (C++20 draft) — cassert.syn',url:'https://timsong-cpp.github.io/cppwp/n4861/cassert.syn'},
  'CPP20-ODR':{label:'WG21 N4861 (C++20 draft) — basic.def.odr',url:'https://timsong-cpp.github.io/cppwp/n4861/basic.def.odr'},
  'CPP20-TU':{label:'WG21 N4861 (C++20 draft) — lex.separate',url:'https://timsong-cpp.github.io/cppwp/n4861/lex.separate'},
  'CPP20-FILE':{label:'WG21 N4861 (C++20 draft) — fstreams',url:'https://timsong-cpp.github.io/cppwp/n4861/fstreams'},
  'CPP20-ADAPTERS':{label:'WG21 N4861 (C++20 draft) — container.adaptors',url:'https://timsong-cpp.github.io/cppwp/n4861/container.adaptors'},
  'CPP20-SCOPE':{label:'WG21 N4861 (C++20 draft) — block scope',url:'https://timsong-cpp.github.io/cppwp/n4861/basic.scope.block'},
  'CPP20-LIFETIME':{label:'WG21 N4861 (C++20 draft) — object lifetime',url:'https://timsong-cpp.github.io/cppwp/n4861/basic.life'},
  'CPP20-INIT-GENERAL':{label:'WG21 N4861 (C++20 draft) — initialization',url:'https://timsong-cpp.github.io/cppwp/n4861/dcl.init'},
  'CPP20-EXPR':{label:'WG21 N4861 (C++20 draft) — expressions',url:'https://timsong-cpp.github.io/cppwp/n4861/expr'},
  'CPP20-MULTIPLICATIVE':{label:'WG21 N4861 (C++20 draft) — division and remainder',url:'https://timsong-cpp.github.io/cppwp/n4861/expr.mul'},
  'CPP20-ADDITIVE':{label:'WG21 N4861 (C++20 draft) — additive operators',url:'https://timsong-cpp.github.io/cppwp/n4861/expr.add'},
  'CPP20-BLOCK':{label:'WG21 N4861 (C++20 draft) — blocks',url:'https://timsong-cpp.github.io/cppwp/n4861/stmt.block'},
  'CPP20-ASSIGNMENT':{label:'WG21 N4861 (C++20 draft) — assignment',url:'https://timsong-cpp.github.io/cppwp/n4861/expr.ass'},
  'CPP20-CONVERSIONS':{label:'WG21 N4861 (C++20 draft) — standard conversions',url:'https://timsong-cpp.github.io/cppwp/n4861/conv'},
  'CPP20-ARITH-CONV':{label:'WG21 N4861 (C++20 draft) — usual arithmetic conversions',url:'https://timsong-cpp.github.io/cppwp/n4861/expr.arith.conv'},
  'CPP20-INTEGRAL-CONV':{label:'WG21 N4861 (C++20 draft) — integer conversions',url:'https://timsong-cpp.github.io/cppwp/n4861/conv.integral'},
  'CPP20-STATIC-CAST':{label:'WG21 N4861 (C++20 draft) — static_cast',url:'https://timsong-cpp.github.io/cppwp/n4861/expr.static.cast'},
  'CPP20-RELATIONAL':{label:'WG21 N4861 (C++20 draft) — relational operators',url:'https://timsong-cpp.github.io/cppwp/n4861/expr.rel'},
  'CPP20-EQUALITY':{label:'WG21 N4861 (C++20 draft) — equality operators',url:'https://timsong-cpp.github.io/cppwp/n4861/expr.eq'},
  'CPP20-LOGIC':{label:'WG21 N4861 (C++20 draft) — logical AND',url:'https://timsong-cpp.github.io/cppwp/n4861/expr.log.and'},
  'CPP20-BOOL':{label:'WG21 N4861 (C++20 draft) — boolean conversions',url:'https://timsong-cpp.github.io/cppwp/n4861/conv.bool'},
  'CPP20-INCREMENT':{label:'WG21 N4861 (C++20 draft) — postfix increment and decrement',url:'https://timsong-cpp.github.io/cppwp/n4861/expr.post.incr'},
  'CPP20-CONDITIONAL':{label:'WG21 N4861 (C++20 draft) — conditional operator',url:'https://timsong-cpp.github.io/cppwp/n4861/expr.cond'},
  'CPP20-SEQUENCING':{label:'WG21 N4861 (C++20 draft) — execution and sequencing',url:'https://timsong-cpp.github.io/cppwp/n4861/intro.execution'},
  'CPP20-REFERENCES':{label:'WG21 N4861 (C++20 draft) — references',url:'https://timsong-cpp.github.io/cppwp/n4861/dcl.ref'},
  'CPP20-POINTERS':{label:'WG21 N4861 (C++20 draft) — compound types',url:'https://timsong-cpp.github.io/cppwp/n4861/basic.compound'},
  'CPP20-UNARY':{label:'WG21 N4861 (C++20 draft) — address and indirection',url:'https://timsong-cpp.github.io/cppwp/n4861/expr.unary.op'},
  'CPP20-INPUT':{label:'WG21 N4861 (C++20 draft) — arithmetic extraction',url:'https://timsong-cpp.github.io/cppwp/n4861/istream.formatted.arithmetic'},
  'CPP20-STREAM-STATE':{label:'WG21 N4861 (C++20 draft) — stream state',url:'https://timsong-cpp.github.io/cppwp/n4861/basic.ios.members'},
  'CPP20-WS':{label:'WG21 N4861 (C++20 draft) — whitespace extraction',url:'https://timsong-cpp.github.io/cppwp/n4861/istream.manip'},
  'CPP20-STRING-IO':{label:'WG21 N4861 (C++20 draft) — string I/O',url:'https://timsong-cpp.github.io/cppwp/n4861/string.io'},
  'CPP20-FORMAT':{label:'WG21 N4861 (C++20 draft) — format manipulators',url:'https://timsong-cpp.github.io/cppwp/n4861/std.manip'},
  'CPP20-MAIN':{label:'WG21 N4861 (C++20 draft) — main',url:'https://timsong-cpp.github.io/cppwp/n4861/basic.start.main'},
  'CPP20-IOSTREAM':{label:'WG21 N4861 (C++20 draft) — standard streams',url:'https://timsong-cpp.github.io/cppwp/n4861/iostream.objects'},
  'CPP20-LEX':{label:'WG21 N4861 (C++20 draft) — lexical conventions',url:'https://timsong-cpp.github.io/cppwp/n4861/lex'},
  'CPP20-NAMES':{label:'WG21 N4861 (C++20 draft) — identifiers and reserved names',url:'https://timsong-cpp.github.io/cppwp/n4861/lex.name'},
  'CPP20-KEYWORDS':{label:'WG21 N4861 (C++20 draft) — keywords',url:'https://timsong-cpp.github.io/cppwp/n4861/lex.key'},
  'CPP20-COMMENTS':{label:'WG21 N4861 (C++20 draft) — comments',url:'https://timsong-cpp.github.io/cppwp/n4861/lex.comment'},
  'CPP20-LITERALS':{label:'WG21 N4861 (C++20 draft) — literals',url:'https://timsong-cpp.github.io/cppwp/n4861/lex.literal'},
  'CPP20-CONSTEXPR':{label:'WG21 N4861 (C++20 draft) — constexpr',url:'https://timsong-cpp.github.io/cppwp/n4861/dcl.constexpr'},
  'CPP20-CONST':{label:'WG21 N4861 (C++20 draft) — cv-qualifiers',url:'https://timsong-cpp.github.io/cppwp/n4861/dcl.type.cv'},
  'CPP20-TYPES':{label:'WG21 N4861 (C++20 draft) — fundamental types',url:'https://timsong-cpp.github.io/cppwp/n4861/basic.fundamental'},
  'CPP20-INIT':{label:'WG21 N4861 (C++20 draft) — list initialization',url:'https://timsong-cpp.github.io/cppwp/n4861/dcl.init.list'},
  'CPP20-LIMITS':{label:'WG21 N4861 (C++20 draft) — numeric_limits',url:'https://timsong-cpp.github.io/cppwp/n4861/numeric.limits'},
  'CPP20-SIZEOF':{label:'WG21 N4861 (C++20 draft) — sizeof',url:'https://timsong-cpp.github.io/cppwp/n4861/expr.sizeof'},
  'CPP20-AUTO':{label:'WG21 N4861 (C++20 draft) — auto',url:'https://timsong-cpp.github.io/cppwp/n4861/dcl.spec.auto'},
  'CS2023-SDF':{label:'ACM/IEEE-CS/AAAI CS2023 — Software Development Fundamentals',url:'https://csed.acm.org/knowledge-areas/'},
  'CS2023-AL':{label:'ACM/IEEE-CS/AAAI CS2023 — Algorithmic Foundations',url:'https://csed.acm.org/knowledge-areas/'},
  'ISO-CPP':{label:'ISO C++ — официальный статус стандарта',url:'https://isocpp.org/std/the-standard'},
  'CPP-GUIDELINES':{label:'C++ Core Guidelines',url:'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines'}
};
const label=(lang,ru,en)=>lang==='en'?en:ru;
function flowchartSvg(steps,index,lang){
  const active=steps[index]?.title,yes=label(lang,'Да','Yes'),no=label(lang,'Нет','No');
  const node=(key,x,y,title,decision=false)=>{
    const cls='gold-node '+(active===key?'active':'');
    return (decision?'<polygon points="'+(x+70)+','+y+' '+(x+140)+','+(y+36)+' '+(x+70)+','+(y+72)+' '+x+','+(y+36)+'" class="'+cls+'"/>':'<rect x="'+x+'" y="'+y+'" width="140" height="56" rx="18" class="'+cls+'"/>')+'<text x="'+(x+70)+'" y="'+(y+(decision?40:33))+'" text-anchor="middle" class="gold-svg-label">'+E(title)+'</text>';
  };
  const edge=(d,x,y,t)=>'<path d="'+d+'" class="gold-arrow" marker-end="url(#gold-flow-arrow)"/>'+(t?'<text x="'+x+'" y="'+y+'" class="gold-svg-label">'+E(t)+'</text>':'');
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 370" width="760" role="img" aria-label="'+E(label(lang,'Блок-схема стоимости доставки: обе ветви каждого условия подписаны','Delivery flowchart: both branches of each condition are labelled'))+'"><title>'+E(label(lang,'Проверка ввода и порога доставки','Input validation and delivery threshold'))+'</title><defs><marker id="gold-flow-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6" fill="#a1bed0"/></marker></defs>'+edge('M350 66 V99')+edge('M420 136 H550',454,126,yes)+edge('M350 172 V219',366,199,no)+edge('M280 256 H160 V299',208,245,no)+edge('M420 256 H550 V299',455,245,yes)+node(steps[0].title,280,10,steps[0].title)+node('x < 0?',280,100,'x < 0?',true)+node('invalid',550,108,'invalid')+node('x ≥ 1000?',280,220,'x ≥ 1000?',true)+node('150',90,300,'150')+node('free',480,300,'free')+'</svg>';
}
function visualSvg(steps,index,lang,kind,title){
  if(kind==='flowchart')return flowchartSvg(steps,index,lang);
  const count=steps.length,width=Math.max(770,count*158),current=Math.max(0,Math.min(index,count-1));
  const nodes=steps.map((s,i)=>{
    const x=i*158+19,y=54,active=i===current,kind=s.kind||'action';
    const shape=kind==='decision'?'<polygon points="'+(x+65)+','+y+' '+(x+130)+','+(y+39)+' '+(x+65)+','+(y+78)+' '+x+','+(y+39)+'" class="gold-node '+(active?'active':'')+'"/>':'<rect x="'+x+'" y="'+y+'" width="130" height="78" rx="14" class="gold-node '+(active?'active':'')+'"/>';
    const txt=String(s.title).slice(0,19);
    const arrow=i===0?'':'<path d="M'+(x-22)+' '+(y+39)+' h20" class="gold-arrow"/>';
    return arrow+shape+'<text x="'+(x+65)+'" y="'+(y+43)+'" text-anchor="middle" class="gold-svg-label">'+E(txt)+'</text>';
  }).join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+width+' 160" width="'+width+'" role="img" aria-label="'+E(title||label(lang,'Схема этапов алгоритма','Algorithm stages'))+'"><title>'+E(title||label(lang,'Шаги алгоритма','Algorithm trace'))+'</title><g>'+nodes+'</g></svg>';
}
export function goldVisualizationMarkup(gold){
  const lang=gold.locale,kind=gold.visualization.kind;
  const steps=goldVisualizationSteps(gold.visualization,{},lang);
  const fields=kind==='euclid'?'<label>a <input data-gold-var="a" type="number" min="0" max="100000" value="48" inputmode="numeric"></label><label>b <input data-gold-var="b" type="number" min="0" max="100000" value="18" inputmode="numeric"></label>':kind==='control-flow'?'<label>n <input data-gold-var="n" type="number" min="0" max="12" value="5" inputmode="numeric"></label>':kind==='flowchart'?'<label>x <input data-gold-var="x" type="number" min="-10000" max="10000" value="1000" inputmode="numeric"></label>':'';
  return '<section class="block glass-panel academy-gold-viz" data-gold-viz data-gold-kind="'+E(kind)+'"><header><span class="eyebrow">'+E(label(lang,'ИНТЕРАКТИВНАЯ МОДЕЛЬ','INTERACTIVE MODEL'))+'</span><h2>'+E(gold.visualization.title||label(lang,'Проследите алгоритм шаг за шагом','Trace the algorithm step by step'))+'</h2></header>'+(gold.visualization.description?'<p>'+E(gold.visualization.description)+'</p>':'')+'<div class="gold-viz-inputs">'+fields+'</div><div class="gold-svg-scroll" data-gold-graphic tabindex="0" role="region" aria-label="' + E(gold.visualization.title||label(lang,'Схема с горизонтальной прокруткой','Scrollable algorithm diagram')) + '">'+visualSvg(steps,0,lang,kind,gold.visualization.title)+'</div><div class="gold-controls"><button type="button" class="btn" data-gold-prev>'+E(label(lang,'← Назад','← Previous'))+'</button><span data-gold-index aria-live="polite">1 / '+steps.length+'</span><button type="button" class="btn" data-gold-next>'+E(label(lang,'Далее →','Next →'))+'</button></div><p class="gold-viz-explanation" data-gold-explanation role="status" aria-live="polite">'+E(steps[0].description)+'</p><p class="gold-viz-error" data-gold-error role="alert" hidden></p></section>';
}
const sourceLink=(id,lang)=>{const s=links[id];return s?'<li><a href="'+E(s.url)+'" target="_blank" rel="noopener noreferrer">'+E(lang==='en'&&id==='ISO-CPP'?'ISO C++ — standard status':s.label)+'</a></li>':''};
function goldBundleMarkup(files={},metadata={},lang){
 const entries=Object.entries(files);
 if(!entries.length&&!metadata.translationUnits?.length)return '';
 const t=(ru,en)=>label(lang,ru,en);
 return '<div data-gold-bundle><p>'+E(t('Создайте указанные файлы в отдельном проекте. Для приложения и тестового драйвера используйте отдельные сборки; не объединяйте два main.','Create the listed files in a separate project. Build the application and test driver separately; do not link two mains.'))+'</p>'+(metadata.translationUnits?.length?'<p>translationUnits: <code>'+E(metadata.translationUnits.join(', '))+'</code>; includeRoots: <code>'+E((metadata.includeRoots||[]).join(', '))+'</code></p>':'')+entries.map(([path,content])=>'<details><summary>'+E(path)+'</summary><pre><code>'+E(content)+'</code></pre><button type="button" class="btn" data-gold-copy>'+E(t('Скопировать файл','Copy file'))+'</button></details>').join('')+'</div>';
}
function goldCasesMarkup(cases,lang){
 const t=(ru,en)=>label(lang,ru,en);
 const value=(title,text)=>'<div class="gold-case-value" data-gold-copy-source><strong>'+E(title)+'</strong>'+(text===''?'<p class="gold-case-empty">'+E(t('Пустая строка: символов нет.','Empty string: no characters.'))+'</p>':'')+'<pre><code>'+E(text)+'</code></pre><button type="button" class="btn" data-gold-copy>'+E(t('Скопировать ','Copy ')+title)+'</button></div>';
 const fileGroup=(title,files)=>files===undefined?'':'<details class="gold-case-files"><summary>'+E(title)+'</summary>'+Object.entries(files).map(([name,text])=>value(name,text)).join('')+'</details>';
 return '<div class="gold-cases"><p class="gold-cases-help">'+E(t('Случаев: ','Cases: ')+cases.length+'. '+t('Раскройте нужный случай: ввод, ожидаемый результат и файлы находятся вместе.','Expand a case to see its input, expected result and files together.'))+'</p><ol class="gold-case-list">'+cases.map((c,i)=>'<li><details class="gold-case"'+(i===0?' open':'')+'><summary>'+E(t('Случай ','Case ')+(i+1)+(c.purpose?' — '+c.purpose:''))+'</summary><div class="gold-case-body"><div class="gold-case-values">'+value('stdin',c.stdin)+value('stdout',c.stdout)+'</div>'+fileGroup(t('Входные файлы','Input files'),c.files)+fileGroup(t('Ожидаемые файлы','Expected files'),c.outputFiles)+(c.fileProperties===undefined?'':'<details class="gold-case-files"><summary>'+E(t('Свойства результата для проверки','Result properties to check'))+'</summary><pre><code>'+E(JSON.stringify(c.fileProperties,null,2))+'</code></pre></details>')+'</div></details></li>').join('')+'</ol></div>';
}
function goldWorkspaceMarkup(lang,{project=false,title='',multi=false,gui=false}={}){
 const t=(ru,en)=>label(lang,ru,en);
 if(gui)return '<aside class="gold-workspace-callout" data-gold-qt-workspace><h3>'+E(t('Где выполнять работу','Where to do the work'))+'</h3><p>'+E(t('Откройте Project Studio в соседней вкладке и создайте новое приложение C++. Редактируйте src/gui.cpp и указанные файлы. Сборка Qt требует подключения. Эта вкладка сохранит условие и место чтения; обычный консольный редактор Qt не запускает.','Open Project Studio in another tab and create a new C++ application. Edit src/gui.cpp and the listed files. Qt builds require a connection. This tab retains the task and reading position; the ordinary console editor cannot run Qt.'))+'</p><a class="btn primary" href="./#view=project-studio" target="_blank" rel="noopener noreferrer">'+E(t('Открыть Project Studio','Open Project Studio'))+'</a><p>'+E(t('Перед изменением существующего проекта сохраните копию.','Save a copy before changing an existing project.'))+'</p></aside>';
 const editor='<button type="button" class="btn primary" data-gold-open-editor>'+E(t('Задание и Code Studio','Task and Code Studio'))+'</button>';
 const studio='<a class="btn" href="#view=code-studio">'+E(t('Отдельный проект в Code Studio','Separate project in Code Studio'))+'</a>';
 const instructions=project?t('Откройте рабочее окно: задание и редактор будут рядом. Итоговую работу сохраните в отдельном C++ проекте «'+title+'»: в Code Studio выберите «Новый проект» и перенесите заготовку'+(multi?' и указанные файлы':'')+'.','Open the work window to keep the task beside the editor. Save your final work in a separate C++ project “'+title+'”: choose “New project” in Code Studio and copy the starter'+(multi?' and the listed files':'')+'.'):t('Откройте рабочее окно: задание, контрольные случаи и редактор будут рядом. Скопируйте заготовку в редактор, укажите stdin и нажмите «Запустить». Закройте окно, чтобы продолжить урок с того же места.','Open the work window to keep the task, reference cases and editor together. Copy the starter into the editor, enter stdin and select “Run”. Close the window to continue the lesson from the same place.');
 return '<aside class="gold-workspace-callout"><h3>'+E(t('Где выполнять работу','Where to do the work'))+'</h3><p>'+E(instructions)+'</p><div class="gold-workspace-actions">'+editor+studio+'</div><p class="gold-workspace-note">'+E(t('Окно использует ваш текущий редактор урока. Перед заменой кода сохраните работу.','The window uses your current lesson editor. Save your work before replacing code.'))+'</p></aside>';
}
function openGoldWorkspace(root,button,gold){
 const workspace=root.querySelector('#editor')?.closest('.sandbox-block');
 const task=button.closest('[data-gold-laboratory],[data-gold-practicum]');
 if(!workspace||!task||root.querySelector('.gold-work-dialog[open]'))return;
 const lang=task.closest('[data-gold-lesson]')?.getAttribute('lang')||gold?.locale||'ru',t=(ru,en)=>label(lang,ru,en);
 const marker=document.createComment('gold-workspace-place'),host=workspace.closest('.lesson')||root.body||root,x=scrollX,y=scrollY;
 const dialog=document.createElement('dialog');dialog.className='gold-work-dialog';dialog.lang=lang;dialog.setAttribute('aria-labelledby','goldWorkTitle');dialog.setAttribute('aria-modal','true');
 dialog.innerHTML='<header class="gold-work-head"><div><span class="eyebrow">'+E(t('РАБОЧЕЕ ОКНО УРОКА','LESSON WORK WINDOW'))+'</span><h2 id="goldWorkTitle">'+E(task.querySelector('h2')?.textContent||t('Практическая работа','Practical work'))+'</h2></div><button type="button" class="btn" data-gold-work-close>'+E(t('Вернуться к заданию','Return to the task'))+'</button></header><div class="gold-work-tabs" role="tablist" aria-label="'+E(t('Задание и редактор','Task and editor'))+'"><button type="button" role="tab" id="goldWorkTaskTab" aria-controls="goldWorkTask" data-gold-work-tab="task">'+E(t('Задание','Task'))+'</button><button type="button" role="tab" id="goldWorkEditorTab" aria-controls="goldWorkEditor" data-gold-work-tab="editor">Code Studio</button></div><div class="gold-work-layout"><div id="goldWorkTask" class="gold-work-task academy-gold" data-gold-work-panel="task" aria-label="'+E(t('Условие и контрольные случаи','Task and reference cases'))+'" lang="'+E(lang)+'" data-gold-lesson="'+E(gold?.lessonId||task.closest('[data-gold-lesson]')?.dataset.goldLesson)+'"></div><div id="goldWorkEditor" class="gold-work-editor" data-gold-work-panel="editor" aria-label="Code Studio"></div></div>';
 const taskPanel=dialog.querySelector('[data-gold-work-panel="task"]'),editorPanel=dialog.querySelector('[data-gold-work-panel="editor"]'),copy=task.cloneNode(true);
 copy.removeAttribute('id');for(const n of copy.querySelectorAll('[id]'))n.removeAttribute('id');
 for(const n of copy.querySelectorAll('.gold-workspace-callout'))n.remove();
 editorPanel.lang=workspace.closest('[lang]')?.getAttribute('lang')||document.documentElement.lang||lang;
 taskPanel.append(copy);workspace.before(marker);editorPanel.append(workspace);host.append(dialog);
 bindAcademyGold(taskPanel,gold);
 const media=matchMedia('(max-width:900px)'),tabs=[...dialog.querySelectorAll('[data-gold-work-tab]')],panels=[taskPanel,editorPanel];let active='editor';
 const update=()=>{
  dialog.querySelector('.gold-work-tabs').hidden=!media.matches;
  for(const tab of tabs){const selected=tab.dataset.goldWorkTab===active;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;}
  for(const panel of panels){panel.hidden=media.matches&&panel.dataset.goldWorkPanel!==active;panel.setAttribute('role',media.matches?'tabpanel':'region');if(media.matches)panel.setAttribute('aria-labelledby',panel===taskPanel?'goldWorkTaskTab':'goldWorkEditorTab');else panel.removeAttribute('aria-labelledby');}
 };
 for(const tab of tabs){
  tab.addEventListener('click',()=>{active=tab.dataset.goldWorkTab;update();});
  tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const target=event.key==='Home'?tabs[0]:event.key==='End'?tabs[1]:tabs[1-tabs.indexOf(tab)];active=target.dataset.goldWorkTab;update();target.focus();});
 }
 media.addEventListener('change',update);update();
 let returnToTask=true,closed=false;
 const onRouteChange=()=>{returnToTask=false;dialog.close();};
 const observer=new MutationObserver(()=>{if(!dialog.isConnected){returnToTask=false;cleanup();}});
 dialog.addEventListener('click',event=>{if(event.target.closest('[data-gold-work-close]'))dialog.close();else if(event.target.closest('a[href^="#"]')){returnToTask=false;dialog.close();}});
 const cleanup=()=>{
  if(closed)return;closed=true;
  media.removeEventListener('change',update);
  removeEventListener('hashchange',onRouteChange);observer.disconnect();
  if(marker.isConnected){marker.replaceWith(workspace);}
  dialog.remove();
  if(returnToTask&&button.isConnected){button.focus({preventScroll:true});scrollTo({left:x,top:y,behavior:'instant'});}
 };
 dialog.addEventListener('close',cleanup,{once:true});addEventListener('hashchange',onRouteChange,{once:true});observer.observe(root.body||root,{childList:true,subtree:true});
 dialog.showModal();editorPanel.querySelector('#editor')?.focus({preventScroll:true});
}
function goldDeliveryMarkup(delivery,lang){
 if(!delivery)return '';
 const t=(ru,en)=>label(lang,ru,en);
 return '<section class="block glass-panel" data-gold-delivery><h2>'+E(t('Проект модуля: сдача и защита','Module project: submission and defense'))+'</h2><h3>'+E(t('Этапы','Milestones'))+'</h3>'+ordered(delivery.milestones)+'<h3>'+E(t('Материалы сдачи','Deliverables'))+'</h3>'+ordered(delivery.artifacts)+'<h3>'+E(t('Рубрика, 100 баллов','Rubric, 100 points'))+'</h3>'+ordered(delivery.rubric.map(r=>r.criterion+' — '+r.points+'. '+r.complete+' '+t('Частично: ','Partial: ')+r.partial+' '+t('Не зачтено: ','Missing: ')+r.missing))+'<p>'+E(t('Оценка расширения требует проверки преподавателем. Этот проект не заменяет отдельную итоговую аттестацию курса.','Reviewing the extension requires a teacher. This project does not replace separate course-wide assessment.'))+'</p></section>';
}
function modulePracticumMarkup(project,lang){
 if(!project)return '';
 const t=(ru,en)=>label(lang,ru,en);
 const code=(title,text)=>'<details><summary>'+E(title)+'</summary><pre><code>'+E(text)+'</code></pre><button type="button" class="btn" data-gold-copy>'+E(t('Скопировать код','Copy code'))+'</button></details>';
 const rubric=project.rubric.map(r=>'<li><h4>'+E(r.criterion)+'</h4><p><strong>2:</strong> '+E(r.complete)+'</p><p><strong>1:</strong> '+E(r.partial)+'</p><p><strong>0:</strong> '+E(r.missing)+'</p></li>').join('');
 return '<section class="block glass-panel gold-laboratory" data-gold-practicum><span class="eyebrow">'+E(project.label||t('ИТОГОВЫЙ ПРАКТИКУМ МОДУЛЯ','MODULE PROJECT'))+'</span><h2>'+E(project.title)+'</h2><p>'+E(project.challenge)+'</p><p>'+E(project.readiness)+'</p>'+goldWorkspaceMarkup(lang,{project:true,title:project.title,multi:!!Object.keys(project.starterFiles||{}).length})+'<h3>'+E(t('Какие навыки связываем','Skills you will connect'))+'</h3><ul>'+project.skills.map(s=>'<li><a href="#course=cpp&amp;lesson='+E(encodeURIComponent(s.lessonId))+'">'+E(s.title)+'</a></li>').join('')+'</ul><h3>'+E(t('Требования и контракт','Requirements and contract'))+'</h3>'+ordered(project.requirements)+'<h3>'+E(t('Этапы самостоятельной работы','Independent work milestones'))+'</h3>'+ordered(project.milestones)+'<h3>'+E(t('Опорный разбор','Reasoning guide'))+'</h3>'+project.walkthrough.map(p=>'<p>'+E(p)+'</p>').join('')+code(project.starterLabel||t('Заготовка: доработайте функции и main','Starter: complete the functions and main'),project.starterCode)+goldBundleMarkup(project.starterFiles,project.metadata||{},lang)+'<h3>'+E(t('Контрольные случаи','Reference cases'))+'</h3>'+goldCasesMarkup(project.cases,lang)+'<h3>'+E(t('Что сохранить в своём проекте','Project deliverables'))+'</h3>'+ordered(project.artifacts)+'<h3>'+E(t('Рубрика самопроверки — 0, 1 или 2 балла за критерий','Self-check rubric — 0, 1 or 2 points per criterion'))+'</h3><ol class="gold-project-rubric">'+rubric+'</ol><p class="gold-evidence-note">'+E(project.completionRule)+'</p>'+code(t('Эталон: раскройте после собственной попытки','Reference: open after your own attempt'),project.referenceCode)+goldBundleMarkup(project.referenceFiles,project.metadata||{},lang)+(project.testDriver?code(t('Отдельный тестовый драйвер: вместо main.cpp','Separate test driver: replace main.cpp'),project.testDriver):'')+'</section>';
}
export function academyGoldMarkup(gold){
  if(!gold)return'';
  const lang=gold.locale, t=(ru,en)=>label(lang,ru,en);
  const heading=(k)=>'<span class="eyebrow">'+E(k)+'</span>';
  const sections=gold.sections.map((s,i)=>'<article class="gold-theory-unit"><span class="gold-counter">'+String(i+1).padStart(2,'0')+'</span><div><h3>'+E(s.title)+'</h3>'+s.paragraphs.map(p=>'<p>'+E(p)+'</p>').join('')+'</div></article>').join('');
  const examples=gold.workedExamples.map((x,i)=>'<article class="gold-example"><div><span class="gold-counter">'+String(i+1).padStart(2,'0')+'</span><h3>'+E(x.title)+'</h3></div><p>'+E(x.purpose)+'</p>'+ordered(x.steps)+'<details><summary>'+E(t('Показать исходный код и ожидаемый вывод','Show source and expected output'))+'</summary><pre><code>'+E(x.code)+'</code></pre>'+goldBundleMarkup(x.files,x.metadata||{},lang)+'<p>'+E(t('Ввод (stdin)','Input (stdin)'))+': <code>'+E(JSON.stringify(x.stdin))+'</code></p><p>'+E(x.outputNote?t('Образец stdout для указанного target','Sample stdout for the stated target'):t('Ожидаемый stdout','Expected stdout'))+': <code>'+E(JSON.stringify(x.expectedStdout))+'</code></p>'+(x.outputNote?'<p>'+E(x.outputNote)+'</p>':'')+(x.cases?.length?'<h4>'+E(t('Дополнительные проверки','Additional checks'))+'</h4>'+goldCasesMarkup(x.cases,lang):'')+'<button type="button" class="btn" data-gold-copy>'+E(t('Скопировать код','Copy code'))+'</button></details></article>').join('');
  const activities=gold.practice.map(x=>'<article class="gold-practice-card">'+badge(lang==='en'?x.level:({basic:'Базовый',applied:'Прикладной',transfer:'Перенос навыка'}[x.level]||x.level))+'<p>'+E(x.task)+'</p><p><strong>'+E(t('Критерий','Success criterion'))+':</strong> '+E(x.criteria)+'</p><details><summary>'+E(t('Подсказка','Hint'))+'</summary><p>'+E(x.hint)+'</p></details></article>').join('');
  const diagnostics=gold.diagnostics.map(x=>'<article class="gold-error-card"><h3>'+E(x.symptom)+'</h3><p><strong>'+E(t('Причина','Cause'))+':</strong> '+E(x.cause)+'</p><p><strong>'+E(t('Исправление','Fix'))+':</strong> '+E(x.fix)+'</p></article>').join('');
  const experiments=gold.experiments.map(x=>'<article class="gold-experiment"><h3>'+E(x.title)+'</h3><p>'+E(x.action)+'</p><details><summary>'+E(t('Предсказание и проверка','Prediction and check'))+'</summary><p>'+E(x.prediction)+'</p><p>'+E(x.verification)+'</p></details></article>').join('');
  const lab=gold.laboratory;
  const tests=lab.target==='qt-wasm'?'<ol class="gold-case-list">'+lab.cases.map((c,i)=>'<li><details class="gold-case"'+(i===0?' open':'')+'><summary>'+E(c.purpose)+'</summary>'+ordered(c.actions)+'<p>'+E(c.expected)+'</p></details></li>').join('')+'</ol>':goldCasesMarkup(lab.cases,lang);
  const questions=(items,group)=>items.map((q,i)=>'<article class="gold-question" data-gold-question data-gold-answer="'+Number(q.correctIndex)+'" data-gold-explanation="'+E(q.explanation)+'"><h3>'+String(i+1)+'. '+E(q.question)+'</h3>'+q.answers.map((a,j)=>'<label><input type="radio" name="gold-q-'+E(gold.lessonId)+'-'+group+'-'+i+'" value="'+j+'"><span>'+E(a)+'</span></label>').join('')+'<button type="button" class="btn" data-gold-check>'+E(t('Проверить ответ','Check answer'))+'</button><p data-gold-feedback role="status" aria-live="polite"></p></article>').join('');

  const quiz=questions(gold.assessment,'assessment');
  const readiness=gold.readinessCheck?'<section class="block glass-panel" data-gold-readiness><h2>'+E((gold.moduleId==='cpp.section.visual-programming'?t('Перед началом: восстановите опоры Module 1–5','Before you start: recall Modules 1–5'):gold.moduleId==='cpp.section.oop'?t('Перед началом: восстановите опоры Module 1–4','Before you start: recall Modules 1–4'):gold.moduleId==='cpp.section.classic-algorithms'?t('Перед началом: восстановите опоры Module 1–3','Before you start: recall Modules 1–3'):gold.moduleId==='cpp.section.structured-programming'?t('Перед началом: восстановите опоры Module 1–2','Before you start: recall Modules 1–2'):t('Перед началом: восстановите опоры Module 1','Before you start: recall Module 1')))+'</h2>'+questions(gold.readinessCheck,'readiness')+'</section>':'';
  const negatives=gold.diagnosticExamples?.length?'<section class="block glass-panel" data-gold-negatives><h2>'+E(t('Намеренные ошибки: сборка должна отказать','Intentional errors: the build should fail'))+'</h2><p>'+E(t('Эти примеры служат диагностике. Рабочее решение лабораторной должно собираться успешно.','These examples teach diagnosis. The working laboratory solution must build successfully.'))+'</p>'+gold.diagnosticExamples.map(x=>'<details><summary>'+E(x.title)+'</summary><p>'+E(x.explanation)+'</p><pre><code>'+E(x.code)+'</code></pre><button type="button" class="btn" data-gold-copy>'+E(t('Скопировать код','Copy code'))+'</button></details>').join('')+'</section>':'';  return '<div class="academy-gold" data-gold-lesson="'+E(gold.lessonId)+'" lang="'+E(lang)+'"><section class="block glass-panel gold-overview">'+heading('ACADEMY GOLD STANDARD 1.1')+'<h2>'+E(gold.title)+'</h2><p>'+E(gold.why)+'</p><div class="gold-overview-columns"><div><h3>'+E(t('После занятия сможете','Learning outcomes'))+'</h3>'+ordered(gold.objectives)+'</div><div><h3>'+E(t('Перед началом','Prerequisites'))+'</h3>'+ordered(gold.prerequisites)+'</div></div></section>'+readiness+'<section class="block glass-panel gold-theory">'+heading(t('ОСНОВАТЕЛЬНАЯ ТЕОРИЯ','FOUNDATIONAL THEORY'))+'<h2>'+E(t('Разбираемся в причинах и связях','Explain the reasons, not only the rules'))+'</h2>'+sections+'</section>'+goldVisualizationMarkup(gold)+'<section class="block glass-panel">'+heading(t('РАЗОБРАННЫЕ ПРИМЕРЫ','WORKED EXAMPLES'))+'<h2>'+E(t('От задачи к работающему коду','From problem to working code'))+'</h2><div class="gold-example-grid">'+examples+'</div></section><section class="block glass-panel">'+heading(t('УПРАВЛЯЕМЫЕ ЭКСПЕРИМЕНТЫ','GUIDED EXPERIMENTS'))+experiments+'</section><section class="block glass-panel">'+heading(t('ТИПИЧНЫЕ ОШИБКИ','DIAGNOSTICS'))+diagnostics+'</section>'+negatives+'<section class="block glass-panel">'+heading(t('САМОСТОЯТЕЛЬНАЯ ПРАКТИКА','INDEPENDENT PRACTICE'))+activities+'</section><section class="block glass-panel gold-laboratory" id="cppLab" data-gold-laboratory>'+heading(t('ЛАБОРАТОРНАЯ РАБОТА','LABORATORY'))+'<h2>'+E(lab.title)+'</h2><p>'+E(lab.challenge)+'</p>'+goldWorkspaceMarkup(lang,{gui:lab.target==='qt-wasm'})+'<h3>'+E(t('Порядок работы','Work steps'))+'</h3>'+ordered(lab.steps)+'<details><summary>'+E(t('Заготовка для самостоятельной работы','Starter for independent work'))+'</summary><pre><code>'+E(lab.starterCode)+'</code></pre>'+goldBundleMarkup(lab.starterFiles,lab.metadata||{},lang)+'<button type="button" class="btn" data-gold-copy>'+E(t('Скопировать код','Copy code'))+'</button></details><h3>'+E(t('Контрольные сценарии для сравнения вывода','Reference cases for comparing output'))+'</h3>'+tests+'<p><strong>'+E(t('Доказательства выполнения','Completion evidence'))+':</strong> '+E(t('Сохранённый исходник и материалы по критериям ниже','Saved source and the deliverables in the criteria below'))+'</p>'+ordered(lab.rubric)+'<details><summary>'+E(t('Эталонное решение (по запросу)','Reference solution (on request)'))+'</summary><pre><code>'+E(lab.referenceCode)+'</code></pre>'+goldBundleMarkup(lab.referenceFiles,lab.metadata||{},lang)+'<button type="button" class="btn" data-gold-copy>'+E(t('Скопировать код','Copy code'))+'</button></details><p class="gold-evidence-note">'+E(lab.target==='qt-wasm'?t('Проверка: настоящая сборка Qt, сценарии Preview и тесты модели в Project Studio. Базовые серверные тесты не оценивают произвольное расширение; нужны рубрика и защита.','Verification: a real Qt build, Preview scenarios and model tests in Project Studio. Baseline server tests do not assess every extension; a rubric and defense are required.'):t('Проверка в этом кандидате: запуск в Code Studio и ручное сравнение stdout с указанными случаями. Автоматическая оценка решения ученика не заявляется.','In this candidate: run in Code Studio and compare stdout with the listed cases. Automatic grading of learner submissions is not claimed.'))+'</p></section>'+goldDeliveryMarkup(lab.delivery,lang)+modulePracticumMarkup(gold.blockPracticum,lang)+modulePracticumMarkup(gold.modulePracticum,lang)+'<section class="block glass-panel">'+heading(t('КОНТРОЛЬ ПОНИМАНИЯ','KNOWLEDGE CHECK'))+quiz+'<h3>'+E(t('Объясните своими словами','Explain in your own words'))+'</h3>'+ordered(gold.reflection)+'</section><section class="block glass-panel">'+heading(t('ИТОГ И ДАЛЬШЕ','SUMMARY AND NEXT'))+'<p>'+E(gold.bridge)+'</p><h3>'+E(t('Справочные источники','Reference sources'))+'</h3><ul>'+gold.sourceRefs.map(id=>sourceLink(id,lang)).join('')+'</ul></section></div>';
}
export function bindAcademyGold(root=document,gold){
  for(const button of root.querySelectorAll('[data-gold-open-editor]')){
    button.addEventListener('click',()=>openGoldWorkspace(root,button,gold));
  }
  for(const card of root.querySelectorAll('[data-gold-question]')){
    const button=card.querySelector('[data-gold-check]'),feedback=card.querySelector('[data-gold-feedback]');
    button?.addEventListener('click',()=>{
      const picked=card.querySelector('input[type="radio"]:checked');
      const english=card.closest('[data-gold-lesson]')?.getAttribute('lang')==='en';
      if(!picked){feedback.textContent=english?'Choose an answer.':'Выберите ответ.';return}
      const correct=Number(picked.value)===Number(card.dataset.goldAnswer);
      feedback.textContent=(correct?(english?'Correct. ':'Верно. '):(english?'Try again. ':'Попробуйте ещё раз. '))+(card.dataset.goldExplanation||'');
      feedback.dataset.result=correct?'correct':'incorrect';
    });
  }
  for(const button of root.querySelectorAll('[data-gold-copy]')){
    button.addEventListener('click',async()=>{
      const source=(button.closest('[data-gold-copy-source]')||button.closest('details'))?.querySelector('pre code');
      if(!source)return;
      const text=source.textContent;
      try{
        if(!globalThis.navigator?.clipboard?.writeText)throw Error('CLIPBOARD_UNAVAILABLE');
        await navigator.clipboard.writeText(text);
        button.textContent=button.closest('[data-gold-lesson]')?.getAttribute('lang')==='en'?'Copied':'Скопировано';
      }catch{
        button.textContent=button.closest('[data-gold-lesson]')?.getAttribute('lang')==='en'?'Select the visible code to copy':'Выделите видимый код для копирования';
      }
    });
  }
  for(const card of root.querySelectorAll('[data-gold-viz]')){
    const v=card.closest('[data-gold-lesson]'),english=v?.getAttribute('lang')==='en';
    const kind=card.dataset.goldKind,fields=[...card.querySelectorAll('[data-gold-var]')],graphic=card.querySelector('[data-gold-graphic]'),exp=card.querySelector('[data-gold-explanation]'),err=card.querySelector('[data-gold-error]'),indexEl=card.querySelector('[data-gold-index]'),prev=card.querySelector('[data-gold-prev]'),next=card.querySelector('[data-gold-next]');
    const parsed=gold?.lessonId===v?.dataset.goldLesson?gold.visualization:null;
    if(!parsed)continue;
    let steps=[],index=0;
    const centerActive=()=>{const active=graphic.querySelector('.gold-node.active');if(active){const box=active.getBBox();graphic.scrollLeft=Math.max(0,box.x+box.width/2-graphic.clientWidth/2);}};
    if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(()=>{if(!card.isConnected){observer.disconnect();return}centerActive();});observer.observe(graphic);}
    const update=()=>{
      const values=Object.fromEntries(fields.map(f=>[f.dataset.goldVar,f.value]));
      try{
        steps=goldVisualizationSteps(parsed,values,english?'en':'ru');index=Math.max(0,Math.min(index,steps.length-1));
        err.hidden=true;err.textContent='';
        graphic.innerHTML=visualSvg(steps,index,english?'en':'ru',kind,parsed.title);
        centerActive();
        indexEl.textContent=(index+1)+' / '+steps.length;
        exp.textContent=steps[index]?.description||'';
        prev.disabled=index===0;next.disabled=index===steps.length-1;
      }catch(e){
        err.hidden=false;err.textContent=e.message==='GCD_ZERO_ZERO'?(english?'At least one input must be positive.':'Хотя бы одно число должно быть положительным.'):(english?'Enter whole numbers within the displayed limits.':'Введите целые числа в указанных границах.');
        steps=[];prev.disabled=true;next.disabled=true;
      }
    };
    fields.forEach(f=>f.addEventListener('input',()=>{index=0;update()}));
    prev?.addEventListener('click',()=>{index=Math.max(0,index-1);update()});
    next?.addEventListener('click',()=>{index=Math.min(steps.length-1,index+1);update()});
    update();
  }
}
let stylesReady;
export function ensureGoldStyles(){
  if(typeof document==='undefined')return Promise.resolve();
  if(stylesReady)return stylesReady;
  let link=document.querySelector('link[data-academy-gold-css]');
  if(link?.sheet)return Promise.resolve();
  stylesReady=new Promise((resolve,reject)=>{
    const fresh=!link;
    if(fresh){link=document.createElement('link');link.rel='stylesheet';link.dataset.academyGoldCss='';link.href=new URL('../styles/academy-gold.css',import.meta.url).href;}
    link.addEventListener('load',()=>resolve(),{once:true});
    link.addEventListener('error',()=>{link.remove();stylesReady=null;reject(Error('GOLD_STYLES_UNAVAILABLE'));},{once:true});
    if(fresh)document.head.appendChild(link);
  });
  return stylesReady;
}
