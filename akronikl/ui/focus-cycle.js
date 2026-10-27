// Явный цикл клавиатурного фокуса для native dialog. Не перехватывает другие клавиши.
function visibleInDetails(node){
 for(let parent=node.parentElement;parent;parent=parent.parentElement){
  if(parent.tagName!=='DETAILS'||parent.open)continue;
  const summary=[...parent.children].find(child=>child.tagName==='SUMMARY');
  if(node!==summary&&!summary?.contains?.(node))return false;
 }
 return true;
}
export function bindDialogFocusCycle(dialog){
 const controller=new AbortController();
 dialog.addEventListener('keydown',event=>{
  if(event.key!=='Tab'||event.defaultPrevented)return;
  const view=dialog.ownerDocument.defaultView;
  const items=[...dialog.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]')].filter(n=>
   visibleInDetails(n)&&n.tabIndex>=0&&!n.disabled&&!n.closest('[inert]')&&n.getClientRects().length&&view.getComputedStyle(n).visibility!=='hidden');
  if(!items.length){event.preventDefault();dialog.tabIndex=-1;dialog.focus();return;}
  const active=dialog.ownerDocument.activeElement,first=items[0],last=items.at(-1);
  if(event.shiftKey&&(active===first||!items.includes(active))){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&(active===last||!items.includes(active))){event.preventDefault();first.focus();}
 },{capture:true,signal:controller.signal});
 return ()=>controller.abort();
}
