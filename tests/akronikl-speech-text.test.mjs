import test from 'node:test';import assert from 'node:assert/strict';
import {prepareSpeechText,codeSpeech,phraseChunks} from '../akronikl/experience/speech-text.js';
import {pronunciationIds} from '../akronikl/experience/piper-pronunciation.js';
import {PIPER_PRONUNCIATIONS} from '../akronikl/experience/piper-pronunciation-data.js';
test('C++ code preserves operations and literal boundaries instead of feeding punctuation to TTS',()=>{
 const spoken=prepareSpeechText('Пример C++ и API:\n```cpp\nstd::vector<int> values;\nif (x != 10 && y <= 3) { return "OK"; }\n```');
 assert.match(spoken,/си плюс плюс и эй пи ай/u);assert.match(spoken,/эс ти ди два двоеточия вектор открыть угловую скобку инт закрыть угловую скобку вэльюз точка с запятой/u);
 assert.match(spoken,/икс не равно 10 логическое и игрек меньше или равно 3/u);assert.match(spoken,/строка, оу кей, конец строки/u);
 assert.doesNotMatch(spoken,/```|std::|&&/u);
});
test('Python, identifiers and inline code are spoken without executing or losing comparison signs',()=>{
 const spoken=prepareSpeechText('**Проверка** `userId != 2`: [справка](https://example.invalid/).\n```python\ndef f(x):\n    return x ** 2\n```');
 assert.match(spoken,/ю эс и ар ай ди не равно 2/u);assert.match(spoken,/дэф эф открыть круглую скобку икс/u);assert.match(spoken,/возведение в степень/u);assert.doesNotMatch(spoken,/https:|\*\*|`/u);
 assert.match(codeSpeech('// API\nx >= 1;'),/Комментарий: эй пи ай/u);
});
test('language-specific comments do not swallow Python integer division or literal punctuation',()=>{
 assert.match(prepareSpeechText('```python\nreturn x // 2 # result\n```'),/ретёрн икс целочисленное деление 2 Комментарий:/u);
 const literal=codeSpeech('"a*b*c"; "x != 2"');assert.match(literal,/эй звёздочка би звёздочка си/u);assert.match(literal,/икс восклицательный знак знак равно 2/u);
});
test('sentence/paragraph chunks are lossless, bounded and never split a surrogate pair',()=>{
 const sentence='Сначала проверяем условие, затем освобождаем ресурс. ';
 const text=sentence.repeat(30),chunks=phraseChunks(text);assert.equal(chunks.join(''),text);assert.ok(chunks.every(c=>c.length<=240));assert.ok(chunks.slice(0,-1).every(c=>/[.!?]\s*$/u.test(c)));
 for(const value of ['🎧'.repeat(280),'безпробелов'.repeat(80),'A'.repeat(239)+'🎧'.repeat(5)]){const c=phraseChunks(value);assert.equal(c.join(''),value);assert.ok(c.every(s=>s.length<=240&&!/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/u.test(s)));}
});
test('real dictionary corrections use whole phonetic words, exact input terms and verified padding',()=>{
 const row=PIPER_PRONUNCIATIONS.find(r=>r.word==='сериализация'),symbols=new Set(['^','_','$',...row.from,...row.to]);let i=0;const map=Object.fromEntries([...symbols].map(c=>[c,[i++]]));
 const encode=p=>[...map['^'],...map['_'],...[...p].flatMap(c=>[...map[c],...map['_']]),...map['$']],payload={phonemes:[...row.from],phoneme_ids:encode(row.from)};
 assert.deepEqual(pronunciationIds('Сериализация',payload,map),encode(row.to));assert.deepEqual(pronunciationIds('Другой термин',payload,map),payload.phoneme_ids);
 assert.throws(()=>pronunciationIds('Сериализация',{...payload,phoneme_ids:[1,2]},map),/LAYOUT_CHANGED/u);
});
test('explicit homograph stresses survive real sentence ID boundaries and a narrow progress context',()=>{
 const pair=PIPER_PRONUNCIATIONS.filter(r=>r.word==='замок'),already=PIPER_PRONUNCIATIONS.filter(r=>r.word==='уже');
 const all=new Set(['^','_','$',' ','.',...pair.flatMap(r=>[...r.from,...r.to]),...already.flatMap(r=>[...r.from,...r.to])]);let n=0;const map=Object.fromEntries([...all].map(c=>[c,[n++]]));
 const word=s=>[...s].flatMap(c=>[...map[c],...map['_']]),sentence=s=>[...map['^'],...map['_'],...word(s),...map['$']];
 const base=pair[0].from+'.',payload={phonemes:[...base,...base],phoneme_ids:[...sentence(base),...sentence(base)]};
 assert.deepEqual(pronunciationIds('за́мок. замо́к.',payload,map),[...sentence(pair.find(r=>r.accent==='за́мок').to+'.'),...sentence(pair.find(r=>r.accent==='замо́к').to+'.')]);
 assert.deepEqual(pronunciationIds('замок. замок.',payload,map),payload.phoneme_ids);
 const p={phonemes:[...already[0].from],phoneme_ids:sentence(already[0].from)};assert.deepEqual(pronunciationIds('Вы уже справились',p,map),sentence(already.find(r=>r.accent==='уже́').to));
});
