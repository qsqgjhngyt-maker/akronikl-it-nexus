import {PIPER_PRONUNCIATIONS} from './piper-pronunciation-data.js';
export const pronunciationText=text=>text.normalize('NFC').replaceAll('\u0301','');
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&');
const stressVowel=phonemes=>[...phonemes.slice(0,phonemes.indexOf('ˈ'))].filter(c=>/[aeiouyɑɐɒɛɜɞɪɔɵœøʊʌɨɯɤə]/u.test(c)).length;
const changed=PIPER_PRONUNCIATIONS.filter(r=>r.automatic&&r.from!==r.to&&stressVowel(r.from)!==stressVowel(r.to));
const ambiguous=new Map();for(const row of PIPER_PRONUNCIATIONS)if(!row.automatic){const rows=ambiguous.get(row.word)??[];rows.push(row);ambiguous.set(row.word,rows);}
const contextualStress=text=>text.replace(/(?<![а-яё\u0301])уже(?=\s+(?:справились|справился|справилась|освоили|освоил|освоила|сделали|сделал|сделала|готово|готовы|готов|готова)(?![а-яё]))/giu,'уже́');
export function pronunciationIds(text,payload,map){
 if(!Array.isArray(payload?.phonemes)||!Array.isArray(payload?.phoneme_ids))throw Error('PIPER_PHONEMES_INVALID');
 const rawWords=contextualStress(text.normalize('NFC')).toLowerCase().match(/[а-яё\u0301]+/gu)??[],words=new Set(rawWords.map(pronunciationText));
 let ids=payload.phoneme_ids.slice();
 const same=(values,at,pattern)=>pattern.every((n,i)=>values[at+i]===n);
 function encode(word){return [...word].flatMap(c=>{if(!Array.isArray(map?.[c])||!Array.isArray(map?.['_']))throw Error('PIPER_UNKNOWN_PHONEME');return [...map[c],...map['_']];});}
 const boundaries=['^','$',' ','.',',',':',';','?','!'].map(c=>map?.[c]).filter(v=>Array.isArray(v));
 const isBoundary=(at,length)=>boundaries.some(b=>same(ids,at-b.length-map['_'].length,b)&&same(ids,at-map['_'].length,map['_']))&&boundaries.some(b=>same(ids,at+length,b));
 for(const [word,variants] of ambiguous){
  const occurrences=rawWords.filter(w=>pronunciationText(w)===word);
  if(!occurrences.some(w=>w.includes('\u0301')))continue;
  const from=encode(variants[0].from),positions=[];
  for(let at=0;at<=ids.length-from.length;at++)if(same(ids,at,from)&&isBoundary(at,from.length)){positions.push(at);at+=from.length-1;}
  // Explicit known homographs only. No guesses about the meaning of an unaccented word.
  if(positions.length!==occurrences.length)continue;
  for(let i=positions.length-1;i>=0;i--){const row=variants.find(v=>v.accent===occurrences[i]);if(row)ids.splice(positions[i],from.length,...encode(row.to));}
 }
 for(const row of changed){
  if(!words.has(row.word))continue;
  // Full phonetic words only. Never replace a suffix inside another word.
  const expected=[...payload.phonemes.join('').matchAll(new RegExp('(^|[ ,.:;?!])'+escape(row.from)+'(?=$|[ ,.:;?!])','gu'))].length;
  if(!expected)continue;
  const from=encode(row.from),to=encode(row.to);let replaced=0;
  for(let at=0;at<=ids.length-from.length;at++){
   if(!same(ids,at,from))continue;
   if(isBoundary(at,from.length)){ids.splice(at,from.length,...to);at+=to.length-1;replaced++;}
  }
  // Preserve the runtime's actual sentence boundaries/BOS/EOS, including multi-sentence input.
  if(replaced!==expected)throw Error('PIPER_PHONEME_LAYOUT_CHANGED');
 }
 return ids;
}
