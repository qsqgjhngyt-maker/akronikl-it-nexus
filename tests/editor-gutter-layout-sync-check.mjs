import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const assert=(value,message)=>{if(!value)throw new Error(message)};
const studio=fs.readFileSync(new URL('sandbox/code-studio.js',root),'utf8');
const css=fs.readFileSync(new URL('styles/app.css',root),'utf8');
for(const token of [
  "editorShell=stage?.closest('.code-studio-editor')",
  "editorShell.style.height=`${height}px`",
  "gutter.style.height=`${height}px`",
  "gutter.style.maxHeight=`${height}px`",
  "gutter.style.overflow='hidden'",
  "if(gutter)gutter.scrollTop=editor.scrollTop"
])assert(studio.includes(token),`Editor/gutter layout sync token missing: ${token}`);
for(const token of [
  '/* v0.1.7-alpha.1.3.2 · Code Studio gutter/layout sync hotfix */',
  '.code-studio-editor{overflow:hidden;align-items:stretch}',
  '.code-studio-editor>.editor-lines{height:100%;min-height:0;max-height:100%;overflow:hidden;align-self:stretch}'
])assert(css.includes(token),`Editor/gutter CSS containment missing: ${token}`);
console.log('EDITOR_GUTTER_LAYOUT_SYNC_PASS');
