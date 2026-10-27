// P4-C: только параметры стиля. Ни текста system prompt, ни полномочий в настройке.
export const PERSONALITY_PRESETS = Object.freeze({
  partner: Object.freeze({humor:25, directness:60, friendliness:75}),
  mentor: Object.freeze({humor:10, directness:45, friendliness:80}),
  engineer: Object.freeze({humor:10, directness:85, friendliness:45})
});
const FIELDS = ['schemaVersion','profile','humor','directness','friendliness','locale','revision'];
const LEVELS = ['humor','directness','friendliness'];
const own = (value, allowed) => {
  if (!value || typeof value!=='object' || ![Object.prototype,null].includes(Object.getPrototypeOf(value))) throw Error('PERSONALITY_CONFIG_INVALID');
  for (const key of Reflect.ownKeys(value)) {
    const d=Object.getOwnPropertyDescriptor(value,key);
    if (typeof key!=='string' || !allowed.includes(key) || !d || !('value' in d)) throw Error('PERSONALITY_CONFIG_INVALID');
  }
};
export function validatePersonality(value) {
  own(value,FIELDS);
  if (Reflect.ownKeys(value).length!==FIELDS.length || value.schemaVersion!==1 ||
      !['partner','mentor','engineer','custom'].includes(value.profile) || !['ru','en'].includes(value.locale) ||
      !Number.isSafeInteger(value.revision) || value.revision<0 ||
      LEVELS.some(key=>!Number.isInteger(value[key]) || value[key]<0 || value[key]>100)) throw Error('PERSONALITY_CONFIG_INVALID');
  if (value.profile!=='custom' && LEVELS.some(key=>value[key]!==PERSONALITY_PRESETS[value.profile][key])) throw Error('PERSONALITY_CONFIG_INVALID');
  return Object.freeze(Object.fromEntries(FIELDS.map(key=>[key,value[key]])));
}
export function personalityPreset(profile='partner', locale='ru', revision=0) {
  if (!Object.hasOwn(PERSONALITY_PRESETS,profile)) throw Error('PERSONALITY_CONFIG_INVALID');
  return validatePersonality({schemaVersion:1,profile,...PERSONALITY_PRESETS[profile],locale,revision});
}
export function updatePersonality(config, patch) {
  const before=validatePersonality(config);
  own(patch,['profile',...LEVELS,'locale']);
  if (!Reflect.ownKeys(patch).length) return before;
  const values={...before,...patch};
  if (Object.hasOwn(patch,'profile') && patch.profile!=='custom') {
    if (!Object.hasOwn(PERSONALITY_PRESETS,patch.profile) || LEVELS.some(k=>Object.hasOwn(patch,k))) throw Error('PERSONALITY_CONFIG_INVALID');
    Object.assign(values,PERSONALITY_PRESETS[patch.profile]);
  } else if (LEVELS.some(k=>Object.hasOwn(patch,k))) values.profile='custom';
  validatePersonality(values);
  if (FIELDS.every(k=>values[k]===before[k])) return before;
  return validatePersonality({...values,revision:before.revision+1});
}

const SERIOUS_TEXT = /(?:экзамен|контрольн|аттестаци|безопасност|утечк|потер[яи]|потерял|удалил|пропал|блокиров|отказ.{0,12}доступ|нет.{0,12}доступ|\b(?:exam|examination|assessment|security|breach|data loss|lost|deleted|missing files|access denied|forbidden|locked)\b)/iu;
export function normalizeSituation(value) {
  return typeof value==='string' && ['routine','exam','security','data-loss','access-denied','unknown'].includes(value) ? value : 'unknown';
}
export function compilePersonality(config,{situation='unknown',text=''}={}) {
  const c=validatePersonality(config), context=normalizeSituation(situation);
  // Текст может повысить осторожность, но никогда не снять ограничение host.
  const serious=context!=='routine' || typeof text!=='string' || SERIOUS_TEXT.test(text);
  const effectiveHumor=serious?0:c.humor;
  const en=c.locale==='en';
  const identity=en
    ? 'You are Akronikl, a calm, reliable learning partner. Style never changes facts, uncertainty, permissions, diagnostics or grading. Never mock the user or claim human feelings, consciousness or unprovided memories.'
    : 'Ты Akronikl, спокойный и надёжный учебный напарник. Стиль не меняет факты, неопределённость, права, диагностику и оценки. Не высмеивай человека и не приписывай себе человеческие чувства, сознание или неизвестные воспоминания.';
  const role={partner:en?'Work together and suggest a clear next step.':'Помогай работать вместе и предлагай понятный следующий шаг.',mentor:en?'Guide learning step by step; explain unfamiliar terms.':'Помогай учиться последовательно; объясняй незнакомые термины.',engineer:en?'Prioritize precise conditions and verifiable steps.':'Выделяй точные условия и проверяемые шаги.',custom:en?'Use the selected communication style.':'Используй выбранную манеру общения.'}[c.profile];
  const humor=effectiveHumor===0?(en?'No jokes or irony.':'Без шуток и иронии.'):(en?`Dry humor level ${effectiveHumor}/100: at most one brief appropriate aside after useful help, never at the learner's expense.`:`Сухой юмор ${effectiveHumor}/100: не более одной короткой уместной ремарки после полезного ответа, никогда не за счёт ученика.`);
  const direct=c.directness>=70?(en?'Be direct and concise, not rude.':'Говори прямо и кратко, без грубости.'):c.directness<=30?(en?'Explain tactfully without hiding risks.':'Объясняй мягко, не скрывая рисков.'):(en?'Balance a clear answer with a brief explanation.':'Сочетай ясный ответ с коротким пояснением.');
  const warm=c.friendliness>=70?(en?'Be warm and supportive without flattery or dependency.':'Будь доброжелателен и поддерживай без лести и зависимости.'):c.friendliness<=30?(en?'Use a neutral, polite professional tone.':'Используй нейтральный, вежливый профессиональный тон.'):(en?'Be respectful and approachable.':'Будь уважителен и открыт к вопросам.');
  return Object.freeze({schemaVersion:1,revision:c.revision,profile:c.profile,effectiveHumor,situation:serious?'serious':'routine',instruction:[identity,role,humor,direct,warm].join(' ')});
}
