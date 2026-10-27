// Ограниченный запасной поиск внутри уже разрешённого текущего урока.
// Источники не переписываются; нет сети, доступа к файлам и новых полномочий.
const STOP=new Set(('а без в во для до и из или как к ко на о об от по при с со у что это ли же но если ' +
 'можно нельзя почему когда чем после любой любого любом все всё мои мой моем мне я этом эту этот этой ' +
 'покажи пример маленький небольшой дай объясни пожалуйста простыми словами действительно означает пользоваться ' +
 'the a an and or to of in on at is are with how what why when can cannot i my me does did be ' +
 'after before it its this that any all give show small simple simply explain please would should').split(' '));
const rawWords=s=>s.normalize('NFKC').match(/[\p{L}\p{N}_]+(?:\+\+|#)?/gu)||[];
const normalize=s=>s.toLowerCase().replace(/ё/g,'е');
function stem(w){
 if(/^[а-я]{5,}$/u.test(w))return w.replace(/(иями|ями|ами|ией|ого|ему|ому|ими|ыми|его|ов|ев|ам|ям|ах|ях|ой|ый|ий|ая|яя|ое|ее|ые|ие|ую|юю|а|я|ы|и|у|ю|е|о)$/u,'').replace(/ь$/u,'');
 return /^[a-z]{5,}s$/u.test(w)&&!w.endsWith('ss')?w.slice(0,-1):w;
}
function terms(s){
 const out=rawWords(s).map(normalize).filter(w=>w.length>1&&!STOP.has(w)).map(stem);
 // Выражения сложности сохраняем как буквальные термины, не regex пользователя.
 for(const m of s.matchAll(/\b[Oo]\(\s*[A-Za-z0-9+*^²³\s]{1,24}\)/gu))out.push(normalize(m[0]).replace(/\s/g,''));
 return [...new Set(out)];
}
export function findTutorEvidence(index,query,{locale,lessonId=null}={}){
 const exact=index.search(query,{locale,limit:3});
 if(exact.length||!lessonId||typeof index.getLesson!=='function')return exact;
 const queryTerms=terms(query).slice(0,24);if(!queryTerms.length)return [];
 const distinct=new Set(rawWords(query).filter(w=>/^[A-Z][A-Z0-9_]{2,}$/u.test(w)||/^[A-Za-z][A-Za-z0-9]*_[A-Za-z0-9_]+$/u.test(w)).map(w=>stem(normalize(w))));
 for(const term of queryTerms)if(/^o\(/u.test(term))distinct.add(term);
 const hits=[];
 for(const r of index.getLesson(lessonId,locale)){
  if(r.lessonId!==lessonId||r.locale!==locale)continue;
  const body=new Set(terms(r.text)),head=new Set(terms(r.text.split('\n')[0]));
  const matched=queryTerms.filter(t=>body.has(t));
  // Одного общего слова недостаточно; допускается точный отличимый идентификатор.
  if(matched.length<2&&!matched.some(t=>distinct.has(t)))continue;
  const score=matched.reduce((sum,t)=>sum+4+(head.has(t)?4:0),0)+(r.section==='theory'?2:0);
  hits.push({record:r,score});
 }
 hits.sort((a,b)=>b.score-a.score||a.record.sourceId.localeCompare(b.record.sourceId));
 return hits.slice(0,3).map(x=>x.record);
}
