// Узкий регрессионный экран RAII, не универсальная оценка фактов или педагогики.
// Основание: courses/cpp/gold/structured/lifetime-ownership.ru.json, теория RAII.
// PASS здесь требует ручного просмотра и не является разрешением на публикацию.
export function screenRaiiAnswer(answer, {simpler=false}={}) {
  const text=String(answer).normalize('NFKC').toLowerCase().replace(/ё/g,'е');
  const violations=[];
  if (simpler && /resource acquisition is initialization/iu.test(text)) violations.push('ACRONYM_EXPANSION_NOT_SIMPLIFIED');
  if (!/ресурс/u.test(text)) violations.push('RESOURCE_NOT_MENTIONED');
  if (!/деструктор|разруш|уничтож|конец.{0,20}жизни|заверш.{0,30}жизни|перестает.{0,20}существ|выход.{0,40}област/iu.test(text)) violations.push('RELEASE_LIFETIME_NOT_EXPLAINED');
  for (const sentence of text.split(/[.!?\n]+/u)) {
    const wrong=/освобож[а-я]*[^.!?]{0,90}при\s+(?:инициализац|создани|конструирован)/u.exec(sentence);
    if (wrong && !/\b(?:not)\b|не\s+освобож|не\s+при|получ|захват|приобрет/u.test(wrong[0]) && !/не\s+освобож/u.test(sentence)) violations.push('RELEASE_AT_INITIALIZATION');
  }
  if (/я\s+(?:запустил|скомпилировал|выполнил)\s+(?:код|программ)/u.test(text)) violations.push('UNPERFORMED_EXECUTION_CLAIM');
  return {status:violations.length?'FAIL':'AUTOMATED_SCREEN_PASS',violations,manualReviewRequired:true,representativeQualityAcceptance:false};
}
