// Только сокращение фактических источников. Не создаёт новые объяснения/факты.
// В предыдущем контексте RAII слово «деструкторе» обрывалось.
export function completeExcerpt(value, limit = 400) {
  if (typeof value !== 'string' || !Number.isSafeInteger(limit) || limit < 1) throw Error('TUTOR_EXCERPT_INVALID');
  if (value.length <= limit) return Object.freeze({text:value, truncated:false});
  const head=value.slice(0,limit);
  // Предпочитаем границу исходного абзаца; заголовок без текста не подходит.
  const lines=[...head.matchAll(/\n+/g)].filter(m=>m.index>=Math.min(80,limit/2));
  let end=lines.length?lines.at(-1).index:0;
  if (!end) {
    const sentences=[...value.matchAll(/[.!?。！？](?=\s|$)/gu)].filter(m=>m.index<limit);
    end=sentences.length?sentences.at(-1).index+1:0;
  }
  // Если законченного фрагмента нет, не создаём обрывок. Режим источников
  // сможет сообщить отсутствие пригодной выдержки; модель не получает домысел.
  return Object.freeze({text:end?value.slice(0,end):'',truncated:true});
}

export function previousCompleteTurn(history, followUp) {
  if (!followUp || !history.length) return [];
  const last=history.at(-1);
  // История остаётся ограниченной, но предыдущий ответ либо целиком, либо
  // отсутствует. Урезанный «освобождение при д» не передаётся как факт.
  if (typeof last.question!=='string'||typeof last.answer!=='string'||last.question.length>1500||last.answer.length>1200) return [];
  return [{role:'user',content:last.question},{role:'assistant',content:last.answer}];
}
