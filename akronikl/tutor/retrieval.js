// Лексический fallback для естественного вопроса. Не меняет строгий Core search.
// Только подготовленные источники, без сети, генерации текста и новых полномочий.
const STOP=new Set(('а без в во для до и из или как к ко на о об от по при с со у что это почему когда чем можно ли нельзя не после если все всегда действительно просто уже мне мы мой мои эту этот такое такой который его им them the a an and or to of in on at is are with how what why when can cannot do does did i my me you your we our it its be been by from for after before every any all always simply please explain show give tell require').split(' '));
const norm=x=>x.normalize('NFKC').toLowerCase().replace(/ё/g,'е');
export function questionTerms(value){
  return [...new Set((norm(value).match(/[\p{L}\p{N}_]+(?:\+\+)?/gu)||[]).filter(w=>w.length>1&&!STOP.has(w)).map(w=>/^[а-я]{5,}$/.test(w)?w.replace(/(иями|ями|ами|ией|ого|ему|ому|ими|ыми|его|ов|ев|ам|ям|ах|ях|ой|ый|ий|ая|яя|ое|ее|ые|ие|ую|юю|а|я|ы|и|у|ю|е|о)$/u,'').replace(/ь$/u,''):/^[a-z]{5,}s$/.test(w)&&!w.endsWith('ss')?w.slice(0,-1):w))];
}
export function retrieveTutorMaterials(index,query,{locale,courseId=null,lessonId=null,limit=3}={}){
  if(typeof query!=='string'||query.length>1500||!['ru','en'].includes(locale)||!Number.isInteger(limit)||limit<1||limit>5)throw Error('TUTOR_RETRIEVAL_INVALID');
  if(index?.stats?.locale!==locale)throw Error('TUTOR_RETRIEVAL_LOCALE');
  const exact=index.search(query,{locale,limit});if(exact.length)return exact;
  // Fallback ограничен уроком, подтверждённым host и индексом. Без урока — прежний строгий поиск.
  if(!courseId||!lessonId)return [];
  const terms=questionTerms(query);if(!terms.length||terms.length>24)return [];
  const records=index.getLesson(lessonId,locale).filter(r=>r.locale===locale&&(!courseId||r.courseId===courseId));
  const docs=records.map(record=>({record,body:new Set(questionTerms(record.text)),title:new Set(questionTerms(record.title))}));
  const frequency=new Map(terms.map(t=>[t,docs.filter(d=>d.body.has(t)||d.title.has(t)).length]));
  const matches=[];
  for(const d of docs){
    const hits=terms.filter(t=>d.body.has(t)||d.title.has(t));
    if(hits.length<Math.min(2,terms.length)&&!hits.some(t=>t.includes('_')||['raii','while','for','switch','const','virtual','nullptr','vector','class','struct','sizeof'].includes(t)))continue;
    const weight=t=>Math.log(1+docs.length/(1+(frequency.get(t)||0)));
    const score=hits.reduce((s,t)=>s+weight(t)*(d.title.has(t)?2:1),0);
    // Контекст урока только повышает рейтинг фактического совпадения, не даёт ответ на любой вопрос.
    const scoped=!!lessonId&&d.record.lessonId===lessonId&&d.record.courseId===courseId;
    matches.push({record:d.record,score:score*(scoped?2:1)+(d.record.section==='theory'?0.2:0)});
  }
  matches.sort((a,b)=>b.score-a.score||a.record.sourceId.localeCompare(b.record.sourceId));
  return matches.slice(0,limit).map(x=>x.record);
}
