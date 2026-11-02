// Выбор только публичной темы. Текст сообщения не предоставляет доступ к работе ученика.
const ids=new Set(['onec','1c-enterprise']);
const normalize=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/ё/g,'е');
export function onecAssistantIntent(query){
 const q=normalize(query),onec=/(?<![\p{L}\p{N}])1\s*[сc](?![\p{L}\p{N}])|1c-enterprise|(?<![\p{L}\p{N}])onec(?![\p{L}\p{N}])/u.test(q),cpp=/c\+\+|с\+\+|(?<![\p{L}\p{N}])cpp(?![\p{L}\p{N}])/u.test(q);
 const applied=/1c-enterprise|конфигурирован|использовани|configur|application course/.test(q),programming=/(?<![\p{L}\p{N}])onec(?![\p{L}\p{N}])|программирован|professional|programming|\bbsl\b/.test(q);
 const directionId=applied!==programming?(applied?'1c-enterprise':'onec'):null;return{mentioned:onec,otherCourse:cpp&&!onec,directionId,courseId:onec?directionId:null,followUp:/разбер|разбор|объясн|давай|пример|дальше|урок|тем[ауеы]|попроще|не понял|explain|discuss|example|next|lesson|topic|simpler/.test(q)};
}
export function previousOnecReference(nodes=[]){
 for(const node of [...nodes].reverse())if(node.role==='assistant'){if(node.badge==='course'&&/^(?:В Nexus два курса 1С:|Nexus has two 1C courses:)/.test(node.text||''))return{needsCourse:true};for(const s of node.sources||[])if(ids.has(s.courseId)&&typeof s.lessonId==='string'&&s.lessonId.startsWith(s.courseId+'.'))return{courseId:s.courseId,topicId:s.lessonId,sectionId:s.sectionId||'overview'};}
 return null;
}
function topicNumber(query){
 const q=normalize(query),digits=/(\d{1,2})(?:-?(?:ю|ую|й|я|ая|ой|ое|ый|го|му|st|nd|rd|th))?\s*(?:тем[ауеы]|урок|topic|lesson)|(?:тем[ауеы]|урок|topic|lesson)\s*(?:№\s*)?(\d{1,2})(?!\d)/u.exec(q);if(digits)return Number(digits[1]||digits[2]);
 const words=[['перв','first'],['втор','second'],['трет','third'],['четверт','fourth'],['пят','fifth']];for(const[i,parts]of words.entries())if(new RegExp('(?:'+parts[0]+'[а-я]*|'+parts[1]+')\\s+(?:тем[ауеы]|урок|topic|lesson)|(?:тем[ауеы]|урок|topic|lesson)\\s+(?:'+parts[0]+'[а-я]*|'+parts[1]+')','u').test(q))return i+1;return null;
}
export function resolveOnecAssistantTarget({guide,raw=null,query='',previous=null}={}){
 const intent=onecAssistantIntent(query);if(intent.otherCourse)return null;
 const current=ids.has(raw?.courseId)?raw:null,prior=intent.followUp&&ids.has(previous?.courseId)?previous:null;
 const courseId=intent.courseId??(previous?.needsCourse?intent.directionId:null)??current?.courseId??(intent.mentioned||intent.followUp?prior?.courseId:null);if(!courseId)return intent.mentioned?{needsCourse:true}:null;
 const lessons=guide.outline(courseId).flatMap(m=>m.lessons);let number=topicNumber(query);if(number===null&&/(?:следующ[а-я]*\s+(?:тем|урок)|next\s+(?:topic|lesson))/.test(normalize(query))){const priorId=current?.courseId===courseId?current.topicId:prior?.courseId===courseId?prior.topicId:null;number=priorId?lessons.findIndex(l=>l.topicId===priorId)+2:1;}if(number!==null&&(!Number.isSafeInteger(number)||number<1||number>lessons.length))return{courseId,topicMissing:true,requestedNumber:number,total:lessons.length};
 let chosen=number!==null?lessons[number-1]:current?.courseId===courseId&&current.topicId?lessons.find(l=>l.topicId===current.topicId):prior?.courseId===courseId?lessons.find(l=>l.topicId===prior.topicId):lessons[0];
 if(number===null){const q=normalize(query),exact=lessons.find(l=>l.title.length>3&&q.includes(normalize(l.title))||q.includes(l.topicId));if(exact)chosen=exact;else if(intent.mentioned||intent.followUp){const tokens=(q.match(/[\p{L}\p{N}]+/gu)||[]).filter(t=>t.length>2&&!/^(?:давай|разбер|объяс|прошу|пожалуй|тему|тема|темы|урок|курс|конфигурирован|программирован|использован|предприяти|основ|onec|bsl|what|please|discuss|explain|first|next|example|lesson|topic|course|configuration|programming|enterprise|the|this|use)/u.test(t));if(tokens.length){const match=guide.search(courseId,tokens.join(' ').slice(0,200))[0];if(match&&tokens.some(t=>normalize(match.title).includes(t)))chosen=match;}}}
 if(!chosen)return{courseId,topicMissing:true,total:lessons.length};
 return{courseId,topicId:chosen.topicId,sectionId:current?.courseId===courseId&&current.topicId===chosen.topicId?current.sectionId||'overview':prior?.courseId===courseId&&prior.topicId===chosen.topicId?prior.sectionId||'overview':'overview',number:lessons.findIndex(l=>l.topicId===chosen.topicId)+1};
}
