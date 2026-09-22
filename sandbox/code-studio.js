import {createCodeWorkspace} from './code-workspace.js';

const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
const CPP_KEYWORDS=new Set('alignas alignof and and_eq asm atomic_cancel atomic_commit atomic_noexcept auto bitand bitor bool break case catch char char8_t char16_t char32_t class compl concept const consteval constexpr constinit const_cast continue co_await co_return co_yield decltype default delete do double dynamic_cast else enum explicit export extern false float for friend goto if inline int long mutable namespace new noexcept not not_eq nullptr operator or or_eq private protected public register reinterpret_cast requires return short signed sizeof static static_assert static_cast struct switch template this thread_local throw true try typedef typeid typename union unsigned using virtual void volatile wchar_t while xor xor_eq override final'.split(' '));
const CPP_TYPES=new Set('std string vector array map unordered_map set unordered_set deque list forward_list queue priority_queue stack unique_ptr shared_ptr weak_ptr optional variant tuple pair size_t ptrdiff_t uint8_t uint16_t uint32_t uint64_t int8_t int16_t int32_t int64_t'.split(' '));
const BRACKET_OPEN={'(':')','[':']','{':'}'};
const BRACKET_CLOSE={')':'(',']':'[','}':'{'};

function bracketPair(source,caret){
  const positions=[caret-1,caret].filter(i=>i>=0&&i<source.length&&'()[]{}'.includes(source[i]));
  for(const pos of positions){
    const ch=source[pos];
    if(BRACKET_OPEN[ch]){
      let depth=0;for(let i=pos;i<source.length;i++){
        if(source[i]===ch)depth++;else if(source[i]===BRACKET_OPEN[ch]){depth--;if(depth===0)return[pos,i]}
      }
    }else if(BRACKET_CLOSE[ch]){
      const open=BRACKET_CLOSE[ch];let depth=0;for(let i=pos;i>=0;i--){
        if(source[i]===ch)depth++;else if(source[i]===open){depth--;if(depth===0)return[i,pos]}
      }
    }
  }
  return null;
}

function cppHighlight(source,matched=[]){
  const matchSet=new Set(matched||[]);let i=0;let lineStart=true;const out=[];
  const push=(text,cls='',start=i)=>{
    if(!text)return;
    if(text.length===1&&matchSet.has(start))out.push(`<span class="tok-bracket-match${cls?' '+cls:''}">${escapeHtml(text)}</span>`);
    else out.push(cls?`<span class="${cls}">${escapeHtml(text)}</span>`:escapeHtml(text));
  };
  while(i<source.length){
    const start=i,ch=source[i],next=source[i+1];
    if(ch==='\n'){push(ch,'',start);i++;lineStart=true;continue}
    if(lineStart&&/[ \t]/.test(ch)){let j=i;while(j<source.length&&/[ \t]/.test(source[j]))j++;push(source.slice(i,j),'',i);i=j;continue}
    if(lineStart&&ch==='#'){let j=i;while(j<source.length&&source[j]!=='\n')j++;push(source.slice(i,j),'tok-preprocessor',i);i=j;lineStart=false;continue}
    lineStart=false;
    if(ch==='/'&&next==='/'){let j=i+2;while(j<source.length&&source[j]!=='\n')j++;push(source.slice(i,j),'tok-comment',i);i=j;continue}
    if(ch==='/'&&next==='*'){let j=i+2;while(j<source.length-1&&!(source[j]==='*'&&source[j+1]==='/'))j++;j=Math.min(source.length,j+2);push(source.slice(i,j),'tok-comment',i);lineStart=source.slice(i,j).endsWith('\n');i=j;continue}
    if(ch==='"'||ch==="'"){
      const quote=ch;let j=i+1,escaped=false;while(j<source.length){const c=source[j];if(c==='\n'&&!escaped)break;if(!escaped&&c===quote){j++;break}escaped=!escaped&&c==='\\';if(c!=='\\')escaped=false;j++}push(source.slice(i,j),quote==='"'?'tok-string':'tok-char',i);i=j;continue
    }
    if(/[0-9]/.test(ch)){let j=i+1;while(j<source.length&&/[0-9A-Fa-fxXbB._'uUlLfF]/.test(source[j]))j++;push(source.slice(i,j),'tok-number',i);i=j;continue}
    if(/[A-Za-z_]/.test(ch)){let j=i+1;while(j<source.length&&/[A-Za-z0-9_]/.test(source[j]))j++;const word=source.slice(i,j);push(word,CPP_KEYWORDS.has(word)?'tok-keyword':CPP_TYPES.has(word)?'tok-type':'tok-identifier',i);i=j;continue}
    if('()[]{}'.includes(ch)){push(ch,'tok-bracket',i);i++;continue}
    if('+-*/%=!<>?:&|^~.,;'.includes(ch)){let j=i+1;while(j<source.length&&'+-*/%=!<>?:&|^~'.includes(source[j])&&j-i<3)j++;push(source.slice(i,j),'tok-operator',i);i=j;continue}
    push(ch,'',i);i++;
  }
  return out.join('')+(source.endsWith('\n')?' ':'');
}

function genericHighlight(source,matched=[]){
  const matchSet=new Set(matched||[]);return [...String(source)].map((ch,i)=>matchSet.has(i)?`<span class="tok-bracket-match">${escapeHtml(ch)}</span>`:escapeHtml(ch)).join('');
}

function sourceIndexAtLineColumn(source,line=1,column=1){
  const lines=String(source).split('\n');let index=0;const target=Math.max(1,Math.min(Number(line)||1,lines.length));for(let i=1;i<target;i++)index+=lines[i-1].length+1;return Math.min(String(source).length,index+Math.max(0,(Number(column)||1)-1));
}

export function codeStudioMarkup({source='',locale='ru',languageId='cpp'}={}){
  const en=locale==='en';
  return `<div class="code-studio" id="codeStudio" data-language="${escapeHtml(languageId)}"><div class="code-studio-toolbar"><div class="code-studio-left"><span class="code-studio-mark">⌘</span><strong>${en?'CODE STUDIO':'CODE STUDIO'}</strong><span class="code-studio-mode">${en?'single-file foundation':'один файл · foundation'}</span></div><div class="code-studio-actions"><button type="button" class="studio-icon-btn" id="codeUndo" title="${en?'Undo (Ctrl+Z)':'Отменить (Ctrl+Z)'}" aria-label="${en?'Undo':'Отменить'}">↶</button><button type="button" class="studio-icon-btn" id="codeRedo" title="${en?'Redo (Ctrl+Y)':'Повторить (Ctrl+Y)'}" aria-label="${en?'Redo':'Повторить'}">↷</button><button type="button" class="studio-icon-btn wide" id="codeSearch" title="${en?'Find (Ctrl+F)':'Поиск (Ctrl+F)'}">⌕ <span>${en?'Find':'Поиск'}</span></button><span class="code-cursor" id="codeCursor">Ln 1, Col 1</span></div></div><div class="code-searchbar" id="codeSearchbar" hidden><input id="codeSearchInput" type="search" autocomplete="off" spellcheck="false" placeholder="${en?'Find in main.cpp':'Найти в main.cpp'}"><span id="codeSearchCount">0/0</span><button type="button" id="codeSearchPrev" aria-label="${en?'Previous match':'Предыдущее совпадение'}">↑</button><button type="button" id="codeSearchNext" aria-label="${en?'Next match':'Следующее совпадение'}">↓</button><button type="button" id="codeSearchClose" aria-label="${en?'Close find':'Закрыть поиск'}">×</button></div><div class="editor-shell code-studio-editor"><pre class="editor-lines" id="editorLines" aria-hidden="true"></pre><div class="code-editor-stage"><pre class="editor-highlight" id="editorHighlight" aria-hidden="true"><code>${escapeHtml(source)}</code></pre><textarea id="editor" class="editor code-input" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" aria-label="${en?'Source code editor':'Редактор исходного кода'}">${escapeHtml(source)}</textarea></div></div><section class="code-problems" id="codeStudioProblems" hidden><header><div><strong>${en?'Problems':'Проблемы'}</strong><span id="codeProblemsCount">0</span></div><small>${en?'Click a diagnostic to jump to line and column':'Нажмите на диагностику для перехода к строке и столбцу'}</small></header><div id="codeProblemsList" class="code-problems-list"></div></section></div>`;
}

export function bindCodeStudio({editor,locale='ru',languageId='cpp',fileName='main.cpp'}={}){
  if(!editor)return null;const en=locale==='en';
  const root=editor.closest('.code-studio');if(!root)return null;
  const highlight=root.querySelector('#editorHighlight'),gutter=root.querySelector('#editorLines'),cursorEl=root.querySelector('#codeCursor');
  const searchbar=root.querySelector('#codeSearchbar'),searchInput=root.querySelector('#codeSearchInput'),searchCount=root.querySelector('#codeSearchCount');
  const problems=root.querySelector('#codeStudioProblems'),problemsList=root.querySelector('#codeProblemsList'),problemsCount=root.querySelector('#codeProblemsCount');
  const workspace=createCodeWorkspace({languageId,entryFile:fileName,files:[{path:fileName,content:editor.value,languageId}]});
  let history=[editor.value],historyIndex=0,historyTimer=null,applyingHistory=false,staticDiagnostics=[],runtimeDiagnostics=[],searchIndex=-1;
  const syncWorkspace=()=>{try{workspace.setActiveContent(editor.value)}catch{}}
  const renderGutter=()=>{if(!gutter)return;const lines=editor.value.split('\n').length;const levels=new Map();for(const item of [...staticDiagnostics,...runtimeDiagnostics]){if(!item?.line)continue;const current=levels.get(Number(item.line));const next=item.providerLimit?'limit':item.level==='warning'?'warning':'error';if(!current||next==='error'||(next==='warning'&&current==='limit'))levels.set(Number(item.line),next)}gutter.innerHTML=Array.from({length:lines},(_,i)=>{const level=levels.get(i+1)||'';return `<span class="${level?`problem-line ${level}`:''}">${i+1}</span>`}).join('')};
  const renderHighlight=()=>{if(!highlight)return;const pair=bracketPair(editor.value,editor.selectionStart);highlight.innerHTML=`<code>${languageId==='cpp'?cppHighlight(editor.value,pair):genericHighlight(editor.value,pair)}</code>`;highlight.scrollTop=editor.scrollTop;highlight.scrollLeft=editor.scrollLeft};
  const renderCursor=()=>{if(!cursorEl)return;const pos=editor.selectionStart;const before=editor.value.slice(0,pos);const lines=before.split('\n');const line=lines.length,col=lines.at(-1).length+1;cursorEl.textContent=`Ln ${line}, Col ${col}`};
  const syncVisuals=()=>{renderGutter();renderHighlight();renderCursor();if(gutter)gutter.scrollTop=editor.scrollTop};
  const pushHistory=()=>{if(applyingHistory)return;const value=editor.value;if(history[historyIndex]===value)return;history=history.slice(0,historyIndex+1);history.push(value);if(history.length>150)history.shift();else historyIndex++;};
  const scheduleHistory=()=>{clearTimeout(historyTimer);historyTimer=setTimeout(pushHistory,220)};
  const emitInput=(inputType='insertText')=>editor.dispatchEvent(new InputEvent('input',{bubbles:true,inputType,data:null}));
  const applyValue=(value,selectionStart=null,selectionEnd=null,{emit=true,record=true}={})=>{applyingHistory=true;editor.value=String(value??'');const start=selectionStart==null?editor.value.length:Math.max(0,Math.min(selectionStart,editor.value.length));const end=selectionEnd==null?start:Math.max(start,Math.min(selectionEnd,editor.value.length));editor.setSelectionRange(start,end);applyingHistory=false;if(record)pushHistory();syncWorkspace();syncVisuals();if(emit)emitInput('insertReplacementText')};
  const undo=()=>{clearTimeout(historyTimer);pushHistory();if(historyIndex<=0)return;historyIndex--;applyingHistory=true;editor.value=history[historyIndex];editor.setSelectionRange(editor.value.length,editor.value.length);applyingHistory=false;syncWorkspace();syncVisuals();emitInput('historyUndo')};
  const redo=()=>{clearTimeout(historyTimer);if(historyIndex>=history.length-1)return;historyIndex++;applyingHistory=true;editor.value=history[historyIndex];editor.setSelectionRange(editor.value.length,editor.value.length);applyingHistory=false;syncWorkspace();syncVisuals();emitInput('historyRedo')};
  const searchMatches=()=>{const q=searchInput?.value||'';if(!q)return[];const hay=editor.value.toLocaleLowerCase(),needle=q.toLocaleLowerCase(),out=[];let p=0;while((p=hay.indexOf(needle,p))!==-1){out.push(p);p+=Math.max(1,needle.length)}return out};
  const selectSearch=(delta=1,reset=false)=>{const matches=searchMatches(),q=searchInput?.value||'';if(!matches.length){searchIndex=-1;if(searchCount)searchCount.textContent='0/0';return}if(reset)searchIndex=matches.findIndex(p=>p>=editor.selectionStart);if(searchIndex<0)searchIndex=delta<0?matches.length-1:0;else searchIndex=(searchIndex+delta+matches.length)%matches.length;const pos=matches[searchIndex];editor.focus();editor.setSelectionRange(pos,pos+q.length);if(searchCount)searchCount.textContent=`${searchIndex+1}/${matches.length}`;scrollCaretIntoView();syncVisuals()};
  const openSearch=()=>{if(!searchbar)return;searchbar.hidden=false;searchInput?.focus();searchInput?.select();selectSearch(0,true)};
  const closeSearch=()=>{if(searchbar)searchbar.hidden=true;editor.focus()};
  const scrollCaretIntoView=()=>{const before=editor.value.slice(0,editor.selectionStart),line=before.split('\n').length;const style=getComputedStyle(editor),lineHeight=parseFloat(style.lineHeight)||22;const target=Math.max(0,(line-4)*lineHeight);if(editor.scrollTop>target+lineHeight*7||editor.scrollTop<target)editor.scrollTop=target;syncVisuals()};
  const jumpTo=(line=1,column=1)=>{const index=sourceIndexAtLineColumn(editor.value,line,column);editor.focus();editor.setSelectionRange(index,index);scrollCaretIntoView();return index};
  const renderProblems=()=>{const all=[...runtimeDiagnostics,...staticDiagnostics];if(!problems||!problemsList)return;problems.hidden=all.length===0;if(problemsCount)problemsCount.textContent=String(all.length);problemsList.innerHTML=all.map((item,i)=>{const level=item.providerLimit?'limit':item.level==='warning'?'warning':'error';const where=item.line?`${en?'Ln':'Стр'} ${item.line}${item.column?`, ${en?'Col':'Ст'} ${item.column}`:''}`:'';return `<button type="button" class="problem-row ${level}" data-problem-index="${i}" ${item.line?'':'disabled'}><span class="problem-icon">${level==='error'?'×':level==='warning'?'▲':'◆'}</span><span class="problem-copy"><strong>${escapeHtml(item.title||item.message||'Diagnostic')}</strong><small>${escapeHtml(item.explanation||item.message||'')}</small></span><span class="problem-where">${escapeHtml(where)}</span></button>`}).join('');problemsList.querySelectorAll('[data-problem-index]').forEach(btn=>btn.addEventListener('click',()=>{const item=all[Number(btn.dataset.problemIndex)];if(item?.line)jumpTo(item.line,item.column||1)}))};
  const setStaticDiagnostics=items=>{staticDiagnostics=(items||[]).map(item=>({...item,title:item.level==='warning'?(en?'Static analysis warning':'Предупреждение статического анализа'):(en?'Static analysis issue':'Ошибка статического анализа'),explanation:item.message,column:item.column||1}));renderGutter();renderProblems()};
  const setRuntimeDiagnostics=items=>{runtimeDiagnostics=(items||[]).map(item=>({...item,level:item.providerLimit?'provider-limit':'error'}));renderGutter();renderProblems()};
  const clearRuntimeDiagnostics=()=>{runtimeDiagnostics=[];renderGutter();renderProblems()};
  const insertText=(text,start=editor.selectionStart,end=editor.selectionEnd)=>{editor.setRangeText(text,start,end,'end');syncWorkspace();syncVisuals();scheduleHistory();emitInput('insertText')};
  editor.addEventListener('input',()=>{syncWorkspace();syncVisuals();scheduleHistory()});
  editor.addEventListener('scroll',()=>{if(highlight){highlight.scrollTop=editor.scrollTop;highlight.scrollLeft=editor.scrollLeft}if(gutter)gutter.scrollTop=editor.scrollTop});
  ['keyup','click','select','focus'].forEach(type=>editor.addEventListener(type,()=>{renderCursor();renderHighlight()}));
  editor.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='f'){event.preventDefault();openSearch();return}
    if(event.key==='F3'){event.preventDefault();selectSearch(event.shiftKey?-1:1);return}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?redo():undo();return}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='y'){event.preventDefault();redo();return}
    if(event.key==='Tab'){
      event.preventDefault();const start=editor.selectionStart,end=editor.selectionEnd;
      if(start===end){insertText('  ',start,end);return}
      const lineStart=editor.value.lastIndexOf('\n',start-1)+1;const blockEnd=editor.value.indexOf('\n',end);const stop=blockEnd===-1?editor.value.length:blockEnd;const block=editor.value.slice(lineStart,stop);const lines=block.split('\n');const next=event.shiftKey?lines.map(x=>x.startsWith('  ')?x.slice(2):x.startsWith('\t')?x.slice(1):x).join('\n'):lines.map(x=>'  '+x).join('\n');editor.setRangeText(next,lineStart,stop,'select');syncWorkspace();syncVisuals();scheduleHistory();emitInput('insertText');return
    }
    if(event.key==='Enter'){
      event.preventDefault();const start=editor.selectionStart,end=editor.selectionEnd;const before=editor.value.slice(0,start);const after=editor.value.slice(end);const line=before.slice(before.lastIndexOf('\n')+1);const indent=(line.match(/^\s*/)||[''])[0];const opens=/\{\s*$/.test(line),closes=/^\s*\}/.test(after);let text=`\n${indent}${opens?'  ':''}`,caretOffset=text.length;if(opens&&closes){text+=`\n${indent}`;caretOffset=`\n${indent}  `.length}editor.setRangeText(text,start,end,'end');const caret=start+caretOffset;editor.setSelectionRange(caret,caret);syncWorkspace();syncVisuals();scheduleHistory();emitInput('insertLineBreak');return
    }
  });
  root.querySelector('#codeUndo')?.addEventListener('click',undo);root.querySelector('#codeRedo')?.addEventListener('click',redo);root.querySelector('#codeSearch')?.addEventListener('click',openSearch);root.querySelector('#codeSearchClose')?.addEventListener('click',closeSearch);root.querySelector('#codeSearchNext')?.addEventListener('click',()=>selectSearch(1));root.querySelector('#codeSearchPrev')?.addEventListener('click',()=>selectSearch(-1));
  searchInput?.addEventListener('input',()=>{searchIndex=-1;selectSearch(1)});searchInput?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();selectSearch(event.shiftKey?-1:1)}else if(event.key==='Escape'){event.preventDefault();closeSearch()}});
  const api={workspace,sync:syncVisuals,jumpTo,setStaticDiagnostics,setRuntimeDiagnostics,clearRuntimeDiagnostics,setValue:(value,options={})=>applyValue(value,null,null,options),undo,redo,openSearch,closeSearch};editor.__nexusCodeStudio=api;syncWorkspace();syncVisuals();renderProblems();return api;
}
