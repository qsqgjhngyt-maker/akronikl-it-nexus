const STRINGS={
 ru:{profile:'Профиль общения',partner:'Напарник',mentor:'Наставник',engineer:'Инженер',custom:'Настроенный',humor:'Юмор',directness:'Прямолинейность',friendliness:'Дружелюбие',note:'Меняет манеру речи, но не факты и разрешения. Настройки действуют в этом окне; модель может соблюдать их не полностью.',serious:'В серьёзной или неопределённой ситуации — без юмора. Без модели настройки не создают свободный разговор.',applied:'Стиль обновлён. Предыдущий запрос остановлен.',error:'Настройка не принята.'},
 en:{profile:'Communication profile',partner:'Partner',mentor:'Mentor',engineer:'Engineer',custom:'Custom',humor:'Humor',directness:'Directness',friendliness:'Friendliness',note:'Changes tone, not facts or permissions. Settings apply to this window; a model may not follow them reliably.',serious:'Serious or unknown situations use no humor. Settings do not create free conversation without a model.',applied:'Style updated. Previous request stopped.',error:'Setting was not accepted.'}
};
export function mountPersonalityPanel({parent,documentRef:doc,controller,locale='ru'}={}) {
  const root=doc.createElement('div');root.dataset.akPersonality='';parent.append(root);
  const labels=[],fields={};let language=locale==='en'?'en':'ru';const t=k=>STRINGS[language][k];
  function el(tag,p,text){const n=doc.createElement(tag);p.append(n);if(text)n.textContent=text;return n;}
  function caption(node,key){labels.push([node,key]);node.textContent=t(key);return node;}
  const profileLabel=el('label',root);profileLabel.className='ak-setting-label';caption(el('span',profileLabel),'profile');
  const profile=el('select',profileLabel);profile.dataset.akPersonalityProfile='';
  for(const key of ['partner','mentor','engineer','custom']){const o=caption(el('option',profile),key);o.value=key;}
  for(const key of ['humor','directness','friendliness']){
    const l=el('label',root);l.className='ak-personality-range';caption(el('span',l),key);
    const output=el('span',l);output.setAttribute('aria-hidden','true');
    const input=el('input',l);input.type='range';input.min='0';input.max='100';input.step='1';input.dataset.akPersonalityValue=key;
    fields[key]={input,output};input.addEventListener('input',()=>apply({[key]:Number(input.value)}));
  }
  caption(el('p',root),'note');caption(el('p',root),'serious');
  const status=el('p',root);status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  function refresh(){const c=controller.snapshot();profile.value=c.profile;for(const [key,{input,output}] of Object.entries(fields)){input.value=String(c[key]);input.setAttribute('aria-valuetext',`${c[key]}%`);output.textContent=`${c[key]}%`;}}
  function apply(patch){try{controller.update(patch);refresh();status.textContent=t('applied');}catch{status.textContent=t('error');try{refresh();}catch{}}}
  profile.addEventListener('change',()=>apply({profile:profile.value}));refresh();
  return Object.freeze({setLocale(value){language=value==='en'?'en':'ru';for(const [n,key] of labels)n.textContent=t(key);status.textContent='';refresh();},dispose(){root.remove();}});
}
