// Общие клавиатура/ARIA/tabs без чтения Account и без записи прогресса.
export function bindCppLearningPath({root=globalThis.document,onSelect=()=>{}}={}){
  const path=root.querySelector('[data-cpp-learning-path]');
  if(!path)return;
  const tabs=[...path.querySelectorAll('[role="tab"]')];
  const panels=[...path.querySelectorAll('[role="tabpanel"]')];
  const select=(tab,focus=false)=>{
    onSelect(tab.dataset.learningFilter);
    tabs.forEach(item=>{const selected=item===tab;item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1});
    panels.forEach(panel=>{panel.hidden=panel.id!==tab.getAttribute('aria-controls')});
    if(focus)tab.focus();
  };
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>select(tab));
    tab.addEventListener('keydown',event=>{
      let next;
      if(event.key==='ArrowRight')next=(index+1)%tabs.length;
      else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;
      else if(event.key==='Home')next=0;
      else if(event.key==='End')next=tabs.length-1;
      else return;
      event.preventDefault();select(tabs[next],true);
    });
  });
}
