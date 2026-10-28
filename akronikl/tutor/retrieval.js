// Мягкий лексический поиск ТОЛЬКО для Tutor; контракт строгого поиска Core не меняется.
// Используются только уже подготовленные публичные records. Нет сети/модели/storage.
import {completeExcerpt} from './evidence.js';
const STOP = new Set(('а без в во для до и из или как к ко на о об от по при с со у что это ' +
  'я мы вы мой моя мои наше наш наши мне меня у тебя тебе последний последнем занятие преподаватель ' +
  'почему когда можно нельзя ли чем чтобы после все просто же не но ещё еще уже если всегда любой ' +
  'объясни объясните покажи расскажи пожалуйста такое простой простыми словами примеру пример маленький ' +
  'дай пока решение нужно происходит означает требуется этому эту этой этот функции программа ' +
  'the a an and or to of in on at is are with how what why when can cannot i me my we our your you ' +
  'do does did it its be being been this that these those than from then all any every not without ' +
  'explain simply please show give small example exercise yet just automatically after before ' +
  'use using need require always different difference differs differ').split(/\s+/u));
function normalize(value){return value.normalize('NFKC').toLowerCase().replaceAll('ё','е');}
function stem(word){
  if(/^[а-я]{5,}$/u.test(word))return word.replace(/(иями|ями|ами|ией|ого|ему|ому|ими|ыми|его|ов|ев|ам|ям|ах|ях|ой|ый|ий|ая|яя|ое|ее|ые|ие|ую|юю|а|я|ы|и|у|ю|е|о)$/u,'').replace(/ь$/u,'');
  if(/^[a-z]{4,}$/u.test(word)){
    let base=word.replace(/(?:ing|ed)$/u,'');
    if(base.endsWith('s')&&!base.endsWith('ss'))base=base.slice(0,-1);
    if(base.endsWith('e')&&base.length>3)base=base.slice(0,-1);
    return base.replace(/i$/u,'y');
  }
  return word;
}
function terms(value){return [...new Set((normalize(value).match(/[\p{L}\p{N}_]+(?:\+\+|#)?/gu)||[]).filter(w=>w.length>1&&!STOP.has(w)).map(stem))];}
const cached=new WeakMap();
function documents(index){
  let value=cached.get(index);if(value)return value;
  const source=index.getSources();if(!Array.isArray(source)||source.length>900)throw Error('TUTOR_INDEX_INVALID');
  const docs=source.map(record=>({record,title:new Set(terms(record.title)),heading:new Set(terms(record.text.split('\n')[0])),body:new Set(terms(completeExcerpt(record.text).text))}));
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
      matched++;score+=Math.log(1+docs.length/(frequency.get(token)+1))*((inTitle?0.4:0)+(inBody?1:0)+(inHeading?2:0));
    }
    if(!matched)continue;
    // Маршрут сам по себе не источник ответа: нужен лексический контакт.
    score*=matched/known.length;
    if(d.record.section==='theory')score*=1.08;
    matches.push({record:d.record,score,matched});
  }
  matches.sort((a,b)=>b.score-a.score||b.matched-a.matched||a.record.sourceId.localeCompare(b.record.sourceId));
  return matches.slice(0,limit).map(x=>x.record);
}
