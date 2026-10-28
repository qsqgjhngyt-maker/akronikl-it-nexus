// Мягкий лексический поиск ТОЛЬКО для Tutor; контракт строгого поиска Core не меняется.
// Используются только уже подготовленные публичные records. Нет сети/модели/storage.
import {completeExcerpt} from './evidence.js';
const STOP = new Set(('а без в во для до и из или как к ко на о об от по при с со у что это ' +
  'я мы вы мой моя мои наше наш наши мне меня у тебя тебе последний последнем занятие преподаватель ' +
  'почему когда можно нельзя ли чем чтобы после все просто же не но ещё еще уже если всегда любой ' +
  'объясни объясните покажи расскажи пожалуйста такое простой простыми словами примеру пример маленький ' +
  'дай пока решение нужно нужен нужна действительно происходит означает требуется этому эту этой этот функции программа ' +
  'the a an and or to of in on at is are with how what why when can cannot i me my we our your you ' +
  'do does did it its be being been this that these those than from then all any every not without ' +
  'explain simply please show give small example exercise yet just automatically after before ' +
  'use using need require always different difference differs differ').split(/\s+/u));
function normalize(value){return value.normalize('NFKC').toLowerCase().replaceAll('ё','е');}
function stem(word){
  // C++ terminology/inflection aliases, not corpus IDs or answer templates.
  if(/^(?:с?копир|копи[яюией]|cop(?:y|ies|ied|ying))/u.test(word))return 'copy';
  if(/^(?:перемещ|mov(?:e|es|ed|ing|able))/u.test(word))return 'move';
  if(/^(?:деструктор|destructor)/u.test(word))return 'destructor';
  if(/^(?:исключен|отказ|неуспех|exception|throw|threw|thrown|fail)/u.test(word))return 'exception';
  if(/^(?:изменен|состоян|chang|state)/u.test(word))return 'state';
  if(/^(?:индекс|index|indices)/u.test(word))return 'index';
  if(/^(?:сортир|упорядоч|order|sort)/u.test(word))return 'ordering';
  if(/^(?:откат|отмен|undo|rollback|revert)/u.test(word))return 'rollback';
  if(/^[а-я]{5,}$/u.test(word))return word.replace(/(иями|ями|ами|ией|ого|ему|ому|ими|ыми|его|ов|ев|ам|ям|ах|ях|ой|ый|ий|ая|яя|ое|ее|ые|ие|ую|юю|а|я|ы|и|у|ю|е|о)$/u,'').replace(/ь$/u,'').slice(0,7);
  if(word==='indices')return 'index';
  if(/^[a-z]{4,}$/u.test(word)){
    let base=word.replace(/(?:ing|ed)$/u,'');
    if(base.endsWith('s')&&!base.endsWith('ss'))base=base.slice(0,-1);
    if(base.endsWith('e')&&base.length>3)base=base.slice(0,-1);
    return base.replace(/i$/u,'y');
  }
  return word;
}
function terms(value){return [...new Set((normalize(value).replace(/\broll\s+back\b/gu,'rollback').replace(/\bo\s*\(([^)]+)\)/gu,' bigo $1 ').match(/[\p{L}\p{N}_]+(?:\+\+|#)?/gu)||[]).filter(w=>w.length>1&&!STOP.has(w)).map(stem))];}
const weight=t=>t==='bigo'?0.2:t==='log'?4:1;
const coverage=(value,wanted)=>terms(value).filter(t=>wanted.has(t)).reduce((n,t)=>n+weight(t),0);
export function rankTutorQuotes(quotes,query){
  const wanted=new Set(terms(query));
  return quotes.map((text,order)=>({text,score:coverage(text,wanted),order})).sort((a,b)=>b.score-a.score||a.order-b.order);
}
function contentScore(record,wanted){
  const direct=coverage(record.text,wanted);
  const focus=Math.max(0,...record.text.split('\n').map(line=>coverage(line.split(/\s+/u).slice(0,8).join(' '),wanted)));
  return direct+focus/10+(record.section==='theory'?0.02:record.section==='overview'?-1.5:0);
}

// Return an exact contiguous span, never a rewritten/reference answer. Search
// full paragraphs so a relevant second paragraph is not lost before ranking.
export function tutorExcerpt(value,query,limit=500,definitionContext=false){
  const fallback=completeExcerpt(value,limit),wanted=new Set(terms(query));
  if(value.length<=limit)return fallback; // Keep adjacent qualifications, even without repeated query tokens.
  if(!wanted.size)return fallback;
  // Paragraph starts retain subjects and conditions. Sliding into the middle
  // of a paragraph had detached "after" from the preceding while/do contrast.
  const boundaries=[0];for(const m of value.matchAll(/\n+/gu))boundaries.push(m.index+m[0].length);
  if(boundaries.at(-1)!==value.length)boundaries.push(value.length);
  let best=null;
  for(let i=0;i<boundaries.length-1;i++)for(let j=i+1;j<boundaries.length;j++){
    if(j>i+1&&boundaries[j]-boundaries[i]>limit)break;
    const text=completeExcerpt(value.slice(boundaries[i],boundaries[j]).trim(),limit).text;if(text.length<50)continue;
    const found=terms(text).filter(t=>wanted.has(t));
    const score=found.reduce((n,t)=>n+weight(t),0)*10-i/1000+(definitionContext?1:-1)*(j-i)/10000;
    if(found.length&&(!best||score>best.score))best={text,score};
  }
  return best?Object.freeze({text:best.text,truncated:best.text!==value}):fallback;
}
export function selectTutorSource(records,query){
  const wanted=new Set(terms(query));
  const compare=/(?:отлич|разниц|\bdiffer(?:ent|ence|s)?\b)/iu.test(query);
  return records.filter(record=>record.section!=='overview').map(record=>({record,score:contentScore(record,wanted)+(compare&&record.section==='glossary'?1:0)}))
    .sort((a,b)=>b.score-a.score)[0]?.record??null;
}
// Definitions alone omit preconditions. Add relevant explanatory/qualifying
// paragraphs from the SAME verified lesson, never a prepared/reference answer.
export function selectTeachingContext(index,matches,query,limit=2){
  const primary=selectTutorSource(matches,query);if(!primary)return [];
  const wanted=new Set(terms(query)),original=new Set(wanted),selected=[primary];
  if(primary.section==='glossary')for(const line of primary.text.split('\n')){const [heading]=line.split(':');if(coverage(heading,original)>0)for(const token of terms(line))wanted.add(token);}
  const candidates=index.getLesson(primary.lessonId,primary.locale).filter(r=>r.section==='theory'&&r.sourceId!==primary.sourceId);
  const qualifiers=/(?:контракт|гаранти|предуслов|только|нельзя|если|не следует|не означает|зависит|contract|guarantee|precondition|only|must|unless|cannot|depends|not always|not necessarily)/giu;
  const conditionHeading=/(?:предуслов|контракт|после|состояни|сортиров|precondition|contract|after|state|sorting|partition)/iu;
  const ranked=candidates.map(r=>({record:r,condition:conditionHeading.test(r.text.split('\n')[0]),score:contentScore(r,wanted)+coverage(r.text.split('\n')[0],wanted)*3+Math.min(12,(r.text.match(qualifiers)||[]).length)*.35})).sort((a,b)=>b.score-a.score);
  const condition=ranked.find(x=>x.condition&&coverage(x.record.text,original)>0);if(condition&&selected.length<limit)selected.push(condition.record);
  // Cover distinct query concepts in headings before spending the budget on
  // another paragraph which merely repeats both words incidentally.
  const covered=new Set(selected.slice(1).flatMap(r=>terms(r.text.split('\n')[0])));for(const x of ranked){if(selected.length>=limit)break;if(selected.includes(x.record))continue;const focus=terms(x.record.text.split('\n')[0]).filter(t=>original.has(t)&&!covered.has(t));if(focus.length){selected.push(x.record);for(const t of focus)covered.add(t);}}
  for(const x of ranked){if(selected.length>=limit)break;if(!selected.includes(x.record)&&coverage(x.record.text,wanted)>0)selected.push(x.record);}
  return selected;
}
const cached=new WeakMap();
function documents(index){
  let value=cached.get(index);if(value)return value;
  const source=index.getSources();if(!Array.isArray(source)||source.length>900)throw Error('TUTOR_INDEX_INVALID');
  const docs=source.map(record=>({record,title:new Set(terms(record.title)),heading:new Set(terms(record.text.split('\n')[0])),body:new Set(terms(record.text))}));
  const frequency=new Map();for(const d of docs)for(const token of new Set([...d.title,...d.body]))frequency.set(token,(frequency.get(token)||0)+1);
  value={docs,frequency};cached.set(index,value);return value;
}
export function retrieveTutorEvidence(index,{query,locale,route={},limit=3}={}){
  if(!index||typeof index.search!=='function'||typeof index.getLesson!=='function'||typeof index.getSources!=='function'||typeof query!=='string'||query.length>2000||!['ru','en'].includes(locale)||index.stats?.locale!==locale||!Number.isInteger(limit)||limit<1||limit>3)throw Error('TUTOR_RETRIEVAL_INVALID');
  const currentLesson=route.courseId==='cpp'&&typeof route.lessonId==='string'?route.lessonId:null;
  if(/^(этот урок|текущий урок|this lesson)$/iu.test(query.trim()))return currentLesson?index.getLesson(currentLesson,locale).slice(0,limit):[];
  const strict=index.search(query,{locale,limit});if(strict.length)return strict;
  // Без разрешённого урока не расширяем строгий поиск: нет подбора случайной
  // публичной статьи в ответ на просьбу узнать личные данные или выполнить действие.
  if(!currentLesson)return [];
  const tokens=terms(query);if(!tokens.length||tokens.length>24)return [];
  const {docs,frequency}=documents(index);const matches=[];
  const known=tokens.filter(token=>frequency.has(token));if(!known.length)return [];
  for(const d of docs){
    if(d.record.locale!==locale||d.record.courseId!=='cpp'||d.record.lessonId!==currentLesson)continue;
    let matched=0,score=0;
    for(const token of known){
      const inTitle=d.title.has(token),inHeading=d.heading.has(token),inBody=d.body.has(token);if(!inTitle&&!inBody&&!inHeading)continue;
      matched++;score+=Math.log(1+docs.length/(frequency.get(token)+1))*((inTitle?0.1:0)+(inBody?1:0)+(inHeading?1:0));
    }
    if(!matched)continue;
    // Маршрут сам по себе не источник ответа: нужен лексический контакт.
    score*=matched/known.length;
    if(d.record.section==='theory')score*=1.08;
    matches.push({record:d.record,score,matched,content:contentScore(d.record,new Set(known))+(/(?:отлич|разниц|\bdiffer(?:ent|ence|s)?\b)/iu.test(query)&&d.record.section==='glossary'?1:0)});
  }
  matches.sort((a,b)=>b.content-a.content||b.score-a.score||b.matched-a.matched||a.record.sourceId.localeCompare(b.record.sourceId));
  return matches.slice(0,limit).map(x=>x.record);
}
