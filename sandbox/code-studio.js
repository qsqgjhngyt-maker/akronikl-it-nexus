import {createCodeWorkspace,normalizeWorkspacePath} from './code-workspace.js';

const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
const CPP_KEYWORDS=new Set('alignas alignof and and_eq asm atomic_cancel atomic_commit atomic_noexcept auto bitand bitor bool break case catch char char8_t char16_t char32_t class compl concept const consteval constexpr constinit const_cast continue co_await co_return co_yield decltype default delete do double dynamic_cast else enum explicit export extern false float for friend goto if inline int long mutable namespace new noexcept not not_eq nullptr operator or or_eq private protected public register reinterpret_cast requires return short signed sizeof static_assert static_cast struct switch template this thread_local throw true try typedef typeid typename union unsigned using virtual void volatile wchar_t while xor xor_eq override final'.split(' '));
const CPP_TYPES=new Set('std string vector array map unordered_map set unordered_set deque list forward_list queue priority_queue stack unique_ptr shared_ptr weak_ptr optional variant tuple pair size_t ptrdiff_t uint8_t uint16_t uint32_t uint64_t int8_t int16_t int32_t int64_t'.split(' '));
const BRACKET_OPEN={'(':')','[':']','{':'}'};
const BRACKET_CLOSE={')':'(',']':'[','}':'{'};

export const MULTI_FILE_CPP_DEMO=Object.freeze([
  {path:'main.cpp',content:'#include <iostream>\n#include <memory>\n#include "Printer.h"\n\nint main() {\n    std::unique_ptr<Device> device = std::make_unique<Printer>();\n    std::cout << device->name() << \'\\n\';\n    return 0;\n}\n'},
  {path:'Device.h',content:'#pragma once\n\n#include <string>\n\nclass Device {\npublic:\n    virtual ~Device() = default;\n    virtual std::string name() const = 0;\n};\n'},
  {path:'Printer.h',content:'#pragma once\n\n#include "Device.h"\n\nclass Printer final : public Device {\npublic:\n    std::string name() const override;\n};\n'},
  {path:'Printer.cpp',content:'#include "Printer.h"\n\nstd::string Printer::name() const {\n    return "Printer";\n}\n'}
]);

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

const fileIcon=path=>/\.(?:h|hpp|hh|hxx)$/i.test(path)?'H':/\.(?:c|cc|cpp|cxx|c\+\+)$/i.test(path)?'C++':'•';
const seedFiles=({source='',files=null,entryFile='main.cpp'}={})=>{
  if(Array.isArray(files)&&files.length)return files.map(file=>({...file,content:String(file?.content??'')}));
  return[{path:entryFile,content:String(source??''),languageId:'cpp'}];
};

export function codeStudioMarkup({source='',locale='ru',languageId='cpp',files=null,entryFile='main.cpp',activeFile=null}={}){
  const en=locale==='en';const seed=seedFiles({source,files,entryFile});const active=normalizeWorkspacePath(activeFile||entryFile);const activeSeed=seed.find(file=>normalizeWorkspacePath(file.path)===active)||seed.find(file=>normalizeWorkspacePath(file.path)===normalizeWorkspacePath(entryFile))||seed[0];const initial=String(activeSeed?.content??source);
  return `<div class="code-studio" id="codeStudio" data-language="${escapeHtml(languageId)}"><div class="code-studio-toolbar"><div class="code-studio-left"><span class="code-studio-mark">⌘</span><strong>CODE STUDIO</strong><span class="code-studio-mode">${en?'multi-file workspace':'multi-file · workspace'}</span></div><div class="code-studio-actions"><button type="button" class="studio-icon-btn" id="codeUndo" title="${en?'Undo (Ctrl+Z)':'Отменить (Ctrl+Z)'}" aria-label="${en?'Undo':'Отменить'}">↶</button><button type="button" class="studio-icon-btn" id="codeRedo" title="${en?'Redo (Ctrl+Y)':'Повторить (Ctrl+Y)'}" aria-label="${en?'Redo':'Повторить'}">↷</button><button type="button" class="studio-icon-btn wide" id="codeSearch" title="${en?'Find (Ctrl+F)':'Поиск (Ctrl+F)'}">⌕ <span>${en?'Find':'Поиск'}</span></button><span class="code-cursor" id="codeCursor">Ln 1, Col 1</span></div></div><div class="code-searchbar" id="codeSearchbar" hidden><input id="codeSearchInput" type="search" autocomplete="off" spellcheck="false" placeholder="${en?'Find in file':'Найти в файле'}"><span id="codeSearchCount">0/0</span><button type="button" id="codeSearchPrev" aria-label="${en?'Previous match':'Предыдущее совпадение'}">↑</button><button type="button" id="codeSearchNext" aria-label="${en?'Next match':'Следующее совпадение'}">↓</button><button type="button" id="codeSearchClose" aria-label="${en?'Close find':'Закрыть поиск'}">×</button></div><div class="code-workspace-shell"><aside class="code-file-tree" id="codeFileTree"><header><strong>${en?'FILES':'ФАЙЛЫ'}</strong><div><button type="button" id="codeLoadDemo" title="${en?'Load 4-file C++ demo':'Загрузить C++ демо из 4 файлов'}">◇</button><button type="button" id="codeAddFile" title="${en?'New file':'Новый файл'}">＋</button></div></header><div class="code-file-tree-list" id="codeFileTreeList"></div></aside><div class="code-editor-pane"><div class="code-file-tabs" id="codeFileTabs"></div><div class="editor-shell code-studio-editor"><pre class="editor-lines" id="editorLines" aria-hidden="true"></pre><div class="code-editor-stage"><pre class="editor-highlight" id="editorHighlight" aria-hidden="true"><code>${escapeHtml(initial)}</code></pre><textarea id="editor" class="editor code-input" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" aria-label="${en?'Source code editor':'Редактор исходного кода'}">${escapeHtml(initial)}</textarea></div></div></div></div><section class="code-problems" id="codeStudioProblems" hidden><header><div><strong>${en?'Problems':'Проблемы'}</strong><span id="codeProblemsCount">0</span></div><small>${en?'Click a diagnostic to open its file and location':'Нажмите на диагностику, чтобы открыть файл и позицию'}</small></header><div id="codeProblemsList" class="code-problems-list"></div></section></div>`;
}

export function bindCodeStudio({editor,locale='ru',languageId='cpp',fileName='main.cpp',files=null,activeFile=null,viewState=null,onWorkspaceChange=()=>{}}={}){
  if(!editor)return null;const en=locale==='en';
  const root=editor.closest('.code-studio');if(!root)return null;
  const initialFiles=seedFiles({source:editor.value,files,entryFile:fileName});
  const workspace=createCodeWorkspace({languageId,entryFile:fileName,files:initialFiles,activeFile:activeFile||fileName});
  const activeInitial=workspace.getFile();if(activeInitial)editor.value=activeInitial.content;
  const highlight=root.querySelector('#editorHighlight'),gutter=root.querySelector('#editorLines'),cursorEl=root.querySelector('#codeCursor');
  const searchbar=root.querySelector('#codeSearchbar'),searchInput=root.querySelector('#codeSearchInput'),searchCount=root.querySelector('#codeSearchCount');
  const problems=root.querySelector('#codeStudioProblems'),problemsList=root.querySelector('#codeProblemsList'),problemsCount=root.querySelector('#codeProblemsCount');
  const treeList=root.querySelector('#codeFileTreeList'),tabs=root.querySelector('#codeFileTabs');
  const histories=new Map();const fileViews=new Map();let historyTimer=null,viewTimer=null,applyingHistory=false,staticDiagnostics=[],runtimeDiagnostics=[],searchIndex=-1;
  const sanitizeView=(value={},sourceLength=Number.MAX_SAFE_INTEGER)=>({selectionStart:Math.max(0,Math.min(Number(value.selectionStart)||0,sourceLength)),selectionEnd:Math.max(0,Math.min(Number(value.selectionEnd??value.selectionStart)||0,sourceLength)),scrollTop:Math.max(0,Number(value.scrollTop)||0),scrollLeft:Math.max(0,Number(value.scrollLeft)||0)});
  for(const [path,value] of Object.entries(viewState?.files||{})){const safe=normalizeWorkspacePath(path),length=workspace.getFile(safe)?.content?.length;if(workspace.hasFile(safe))fileViews.set(safe,sanitizeView(value,length??0))}
  const currentEditorView=()=>sanitizeView({selectionStart:editor.selectionStart,selectionEnd:editor.selectionEnd,scrollTop:editor.scrollTop,scrollLeft:editor.scrollLeft},editor.value.length);
  const rememberView=(path=workspace.activeFile)=>{const safe=normalizeWorkspacePath(path);if(workspace.hasFile(safe))fileViews.set(safe,currentEditorView());return fileViews.get(safe)||null};
  const serializedViewState=()=>({version:1,files:Object.fromEntries([...fileViews.entries()].filter(([path])=>workspace.hasFile(path)).map(([path,value])=>[path,{...value}]))});
  const studioSnapshot=()=>({...workspace.snapshot(),viewState:serializedViewState()});
  const notifyWorkspaceChange=type=>onWorkspaceChange(studioSnapshot(),type);
  const scheduleViewPersistence=()=>{clearTimeout(viewTimer);viewTimer=setTimeout(()=>{rememberView();notifyWorkspaceChange('view-state')},180)};
  const restoreEditorView=(path=workspace.activeFile)=>{const safe=normalizeWorkspacePath(path),saved=fileViews.get(safe),length=editor.value.length;if(!saved){editor.setSelectionRange(0,0);editor.scrollTop=0;editor.scrollLeft=0;return}const view=sanitizeView(saved,length);editor.setSelectionRange(view.selectionStart,view.selectionEnd);editor.scrollTop=view.scrollTop;editor.scrollLeft=view.scrollLeft};
  const historyFor=path=>{const safe=normalizeWorkspacePath(path);if(!histories.has(safe)){const content=workspace.getFile(safe)?.content??'';histories.set(safe,{values:[content],index:0})}return histories.get(safe)};
  const activeHistory=()=>historyFor(workspace.activeFile);
  const externalFileLabel=()=>document.querySelector('#codeFileLabel');
  const allDiagnostics=()=>[...runtimeDiagnostics,...staticDiagnostics];
  const activeDiagnostics=()=>allDiagnostics().filter(item=>!item?.file||normalizeWorkspacePath(item.file)===workspace.activeFile);
  const updateFileLabels=()=>{const label=externalFileLabel();if(label)label.textContent=workspace.activeFile;if(searchInput)searchInput.placeholder=en?`Find in ${workspace.activeFile}`:`Найти в ${workspace.activeFile}`};
  const renderFileChrome=()=>{
    const list=workspace.listFiles();
    if(treeList)treeList.innerHTML=list.map(file=>`<div class="code-file-row ${file.path===workspace.activeFile?'active':''}" data-file-row="${escapeHtml(file.path)}"><button type="button" class="code-file-open" data-open-file="${escapeHtml(file.path)}"><span class="code-file-icon">${escapeHtml(fileIcon(file.path))}</span><span>${escapeHtml(file.path)}</span>${file.path===workspace.entryFile?`<small>${en?'entry':'entry'}</small>`:''}</button><div class="code-file-actions">${file.path!==workspace.entryFile?`<button type="button" data-rename-file="${escapeHtml(file.path)}" title="${en?'Rename':'Переименовать'}">✎</button><button type="button" data-remove-file="${escapeHtml(file.path)}" title="${en?'Delete':'Удалить'}">×</button>`:''}</div></div>`).join('');
    if(tabs)tabs.innerHTML=list.map(file=>`<button type="button" class="code-file-tab ${file.path===workspace.activeFile?'active':''}" data-open-file="${escapeHtml(file.path)}"><span>${escapeHtml(file.path)}</span>${file.path===workspace.entryFile?'<i>●</i>':''}</button>`).join('');
    root.querySelectorAll('[data-open-file]').forEach(btn=>btn.addEventListener('click',()=>switchFile(btn.dataset.openFile)));
    root.querySelectorAll('[data-rename-file]').forEach(btn=>btn.addEventListener('click',event=>{event.stopPropagation();renameFile(btn.dataset.renameFile)}));
    root.querySelectorAll('[data-remove-file]').forEach(btn=>btn.addEventListener('click',event=>{event.stopPropagation();removeFile(btn.dataset.removeFile)}));
    updateFileLabels();
  };
  const renderGutter=()=>{if(!gutter)return;const lines=editor.value.split('\n').length;const levels=new Map();for(const item of activeDiagnostics()){if(!item?.line)continue;const current=levels.get(Number(item.line));const next=item.providerLimit?'limit':item.level==='warning'?'warning':'error';if(!current||next==='error'||(next==='warning'&&current==='limit'))levels.set(Number(item.line),next)}gutter.innerHTML=Array.from({length:lines},(_,i)=>{const level=levels.get(i+1)||'';return `<span class="${level?`problem-line ${level}`:''}">${i+1}</span>`}).join('')};
  const renderHighlight=()=>{if(!highlight)return;const pair=bracketPair(editor.value,editor.selectionStart);highlight.innerHTML=`<code>${languageId==='cpp'?cppHighlight(editor.value,pair):genericHighlight(editor.value,pair)}</code>`;highlight.scrollTop=editor.scrollTop;highlight.scrollLeft=editor.scrollLeft};
  const renderCursor=()=>{if(!cursorEl)return;const pos=editor.selectionStart;const before=editor.value.slice(0,pos);const lines=before.split('\n');const line=lines.length,col=lines.at(-1).length+1;cursorEl.textContent=`Ln ${line}, Col ${col}`};
  const syncVisuals=()=>{renderGutter();renderHighlight();renderCursor();if(gutter)gutter.scrollTop=editor.scrollTop};
  const syncWorkspace=()=>{try{workspace.setActiveContent(editor.value)}catch{}};
  const pushHistory=(path=workspace.activeFile)=>{if(applyingHistory)return;const safe=normalizeWorkspacePath(path);const h=historyFor(safe);const value=workspace.getFile(safe)?.content??(safe===workspace.activeFile?editor.value:'');if(h.values[h.index]===value)return;h.values=h.values.slice(0,h.index+1);h.values.push(value);if(h.values.length>150)h.values.shift();else h.index++};
  const scheduleHistory=()=>{clearTimeout(historyTimer);historyTimer=setTimeout(()=>{syncWorkspace();pushHistory()},220)};
  const emitInput=(inputType='insertText')=>editor.dispatchEvent(new InputEvent('input',{bubbles:true,inputType,data:null}));
  const applyEditorValue=(value,selectionStart=null,selectionEnd=null,{emit=true,record=true}={})=>{applyingHistory=true;editor.value=String(value??'');const start=selectionStart==null?editor.value.length:Math.max(0,Math.min(selectionStart,editor.value.length));const end=selectionEnd==null?start:Math.max(start,Math.min(selectionEnd,editor.value.length));editor.setSelectionRange(start,end);applyingHistory=false;syncWorkspace();if(record)pushHistory();syncVisuals();if(emit)emitInput('insertReplacementText')};
  const undo=()=>{clearTimeout(historyTimer);syncWorkspace();pushHistory();const h=activeHistory();if(h.index<=0)return;h.index--;applyingHistory=true;editor.value=h.values[h.index];editor.setSelectionRange(editor.value.length,editor.value.length);applyingHistory=false;syncWorkspace();syncVisuals();emitInput('historyUndo')};
  const redo=()=>{clearTimeout(historyTimer);const h=activeHistory();if(h.index>=h.values.length-1)return;h.index++;applyingHistory=true;editor.value=h.values[h.index];editor.setSelectionRange(editor.value.length,editor.value.length);applyingHistory=false;syncWorkspace();syncVisuals();emitInput('historyRedo')};
  const searchMatches=()=>{const q=searchInput?.value||'';if(!q)return[];const hay=editor.value.toLocaleLowerCase(),needle=q.toLocaleLowerCase(),out=[];let p=0;while((p=hay.indexOf(needle,p))!==-1){out.push(p);p+=Math.max(1,needle.length)}return out};
  const selectSearch=(delta=1,reset=false)=>{const matches=searchMatches(),q=searchInput?.value||'';if(!matches.length){searchIndex=-1;if(searchCount)searchCount.textContent='0/0';return}if(reset)searchIndex=matches.findIndex(p=>p>=editor.selectionStart);if(searchIndex<0)searchIndex=delta<0?matches.length-1:0;else searchIndex=(searchIndex+delta+matches.length)%matches.length;const pos=matches[searchIndex];editor.focus();editor.setSelectionRange(pos,pos+q.length);if(searchCount)searchCount.textContent=`${searchIndex+1}/${matches.length}`;scrollCaretIntoView();syncVisuals()};
  const openSearch=()=>{if(!searchbar)return;searchbar.hidden=false;searchInput?.focus();searchInput?.select();selectSearch(0,true)};
  const closeSearch=()=>{if(searchbar)searchbar.hidden=true;editor.focus()};
  const scrollCaretIntoView=()=>{const before=editor.value.slice(0,editor.selectionStart),line=before.split('\n').length;const style=getComputedStyle(editor),lineHeight=parseFloat(style.lineHeight)||22;const target=Math.max(0,(line-4)*lineHeight);if(editor.scrollTop>target+lineHeight*7||editor.scrollTop<target)editor.scrollTop=target;syncVisuals()};
  const switchFile=(path,{focus=true,emit=true,syncCurrent=true}={})=>{
    const safe=normalizeWorkspacePath(path);if(!workspace.hasFile(safe))return null;
    clearTimeout(historyTimer);clearTimeout(viewTimer);
    if(syncCurrent){rememberView();syncWorkspace();pushHistory()}
    workspace.setActiveFile(safe);const file=workspace.getFile(safe);historyFor(safe);applyingHistory=true;editor.value=file?.content??'';applyingHistory=false;restoreEditorView(safe);searchIndex=-1;if(searchCount)searchCount.textContent='0/0';renderFileChrome();syncVisuals();if(focus)editor.focus();if(emit)editor.dispatchEvent(new CustomEvent('nexus-workspace-active',{bubbles:true,detail:{path:safe}}));scheduleViewPersistence();return file;
  };
  const jumpTo=(fileOrLine=1,lineOrColumn=1,columnMaybe=1)=>{let file=workspace.activeFile,line=fileOrLine,column=lineOrColumn;if(typeof fileOrLine==='string'){file=normalizeWorkspacePath(fileOrLine);line=lineOrColumn;column=columnMaybe;if(workspace.hasFile(file)&&file!==workspace.activeFile)switchFile(file,{focus:false,emit:false})}const index=sourceIndexAtLineColumn(editor.value,line,column);editor.focus();editor.setSelectionRange(index,index);scrollCaretIntoView();return index};
  const renderProblems=()=>{const all=allDiagnostics();if(!problems||!problemsList)return;problems.hidden=all.length===0;if(problemsCount)problemsCount.textContent=String(all.length);problemsList.innerHTML=all.map((item,i)=>{const level=item.providerLimit?'limit':item.level==='warning'?'warning':'error';const file=item.file||workspace.activeFile;const where=item.line?`${file} · ${en?'Ln':'Стр'} ${item.line}${item.column?`, ${en?'Col':'Ст'} ${item.column}`:''}`:file||'';return `<button type="button" class="problem-row ${level}" data-problem-index="${i}" ${item.line?'':'disabled'}><span class="problem-icon">${level==='error'?'×':level==='warning'?'▲':'◆'}</span><span class="problem-copy"><strong>${escapeHtml(item.title||item.message||'Diagnostic')}</strong><small>${escapeHtml(item.explanation||item.message||'')}</small></span><span class="problem-where">${escapeHtml(where)}</span></button>`}).join('');problemsList.querySelectorAll('[data-problem-index]').forEach(btn=>btn.addEventListener('click',()=>{const item=all[Number(btn.dataset.problemIndex)];if(item?.line)jumpTo(item.file||workspace.activeFile,item.line,item.column||1)}))};
  const setStaticDiagnostics=items=>{staticDiagnostics=(items||[]).map(item=>({...item,file:item.file||workspace.entryFile,title:item.level==='warning'?(en?'Static analysis warning':'Предупреждение статического анализа'):(en?'Static analysis issue':'Ошибка статического анализа'),explanation:item.message,column:item.column||1}));renderGutter();renderProblems()};
  const setRuntimeDiagnostics=items=>{runtimeDiagnostics=(items||[]).map(item=>({...item,file:item.file||workspace.activeFile,level:item.providerLimit?'provider-limit':'error'}));renderGutter();renderProblems()};
  const clearRuntimeDiagnostics=()=>{runtimeDiagnostics=[];renderGutter();renderProblems()};
  const insertText=(text,start=editor.selectionStart,end=editor.selectionEnd)=>{editor.setRangeText(text,start,end,'end');syncWorkspace();syncVisuals();scheduleHistory();emitInput('insertText')};
  const addFile=()=>{const name=prompt(en?'New file name':'Имя нового файла','NewFile.cpp');if(!name)return;try{const safe=normalizeWorkspacePath(name);const initial=/\.(?:h|hpp|hh|hxx)$/i.test(safe)?'#pragma once\n':'';workspace.addFile(safe,initial);histories.delete(safe);fileViews.delete(safe);switchFile(safe)}catch(error){alert(error.message)}};
  const renameFile=path=>{const next=prompt(en?'Rename file':'Новое имя файла',path);if(!next||next===path)return;const safe=normalizeWorkspacePath(path),target=normalizeWorkspacePath(next);try{clearTimeout(historyTimer);clearTimeout(viewTimer);rememberView();syncWorkspace();const oldView=fileViews.get(safe);if(oldView){fileViews.set(target,oldView);fileViews.delete(safe)}try{workspace.renameFile(safe,target)}catch(error){if(oldView){fileViews.set(safe,oldView);fileViews.delete(target)}throw error}const oldHistory=histories.get(safe);histories.delete(safe);if(oldHistory)histories.set(target,oldHistory);renderFileChrome();syncVisuals();scheduleViewPersistence()}catch(error){alert(error.message)}};
  const removeFile=path=>{if(!confirm(en?`Delete ${path}?`:`Удалить ${path}?`))return;const safe=normalizeWorkspacePath(path);try{clearTimeout(historyTimer);clearTimeout(viewTimer);rememberView();syncWorkspace();const wasActive=workspace.activeFile===safe;fileViews.delete(safe);workspace.removeFile(safe);histories.delete(safe);if(wasActive)switchFile(workspace.activeFile,{emit:false,syncCurrent:false});renderFileChrome();syncVisuals();notifyWorkspaceChange('file-removed-ui');editor.dispatchEvent(new CustomEvent('nexus-workspace-active',{bubbles:true,detail:{path:workspace.activeFile}}))}catch(error){alert(error.message)}};
  const resetWorkspace=(nextFiles,nextActive=workspace.entryFile,{emit=true}={})=>{clearTimeout(historyTimer);clearTimeout(viewTimer);histories.clear();fileViews.clear();staticDiagnostics=[];runtimeDiagnostics=[];workspace.replaceFiles(nextFiles,{activeFile:nextActive});const file=workspace.getFile();applyingHistory=true;editor.value=file?.content??'';applyingHistory=false;restoreEditorView(workspace.activeFile);historyFor(workspace.activeFile);renderFileChrome();syncVisuals();renderProblems();if(emit)emitInput('insertReplacementText');return studioSnapshot()};
  const loadDemoProject=()=>{if(!confirm(en?'Replace the current workspace with the 4-file C++ demo?':'Заменить текущий workspace C++ демо-проектом из 4 файлов?'))return;resetWorkspace(MULTI_FILE_CPP_DEMO.map(x=>({...x})), 'main.cpp')};
  editor.addEventListener('input',()=>{syncWorkspace();syncVisuals();scheduleHistory();scheduleViewPersistence()});
  editor.addEventListener('scroll',()=>{if(highlight){highlight.scrollTop=editor.scrollTop;highlight.scrollLeft=editor.scrollLeft}if(gutter)gutter.scrollTop=editor.scrollTop;scheduleViewPersistence()});
  ['keyup','click','select'].forEach(type=>editor.addEventListener(type,()=>{renderCursor();renderHighlight();scheduleViewPersistence()}));editor.addEventListener('focus',()=>{renderCursor();renderHighlight()});
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
  root.querySelector('#codeUndo')?.addEventListener('click',undo);root.querySelector('#codeRedo')?.addEventListener('click',redo);root.querySelector('#codeSearch')?.addEventListener('click',openSearch);root.querySelector('#codeSearchClose')?.addEventListener('click',closeSearch);root.querySelector('#codeSearchNext')?.addEventListener('click',()=>selectSearch(1));root.querySelector('#codeSearchPrev')?.addEventListener('click',()=>selectSearch(-1));root.querySelector('#codeAddFile')?.addEventListener('click',addFile);root.querySelector('#codeLoadDemo')?.addEventListener('click',loadDemoProject);
  searchInput?.addEventListener('input',()=>{searchIndex=-1;selectSearch(1)});searchInput?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();selectSearch(event.shiftKey?-1:1)}else if(event.key==='Escape'){event.preventDefault();closeSearch()}});
  workspace.subscribe(({type})=>{if(type!=='file-updated')renderFileChrome();notifyWorkspaceChange(type)});
  const api={workspace,sync:syncVisuals,jumpTo,setStaticDiagnostics,setRuntimeDiagnostics,clearRuntimeDiagnostics,setValue:(value,options={})=>applyEditorValue(value,null,null,options),setWorkspace:resetWorkspace,loadDemoProject,switchFile,undo,redo,openSearch,closeSearch,runtimeRequest:stdin=>workspace.runtimeRequest(stdin),getFiles:()=>workspace.runtimeFiles(),getEntrySource:()=>workspace.getFile(workspace.entryFile)?.content??'',getActiveFile:()=>workspace.activeFile,getSnapshot:()=>studioSnapshot()};editor.__nexusCodeStudio=api;historyFor(workspace.activeFile);restoreEditorView(workspace.activeFile);renderFileChrome();syncVisuals();renderProblems();notifyWorkspaceChange('init');return api;
}
