import test from 'node:test';import assert from 'node:assert/strict';
import {mathSpeech,proseMathSpeech} from '../akronikl/experience/math-speech.js';
import {prepareSpeechText,phraseChunks} from '../akronikl/experience/speech-text.js';

test('fractions, functions and nested grouping preserve mathematical meaning',()=>{
 assert.equal(mathSpeech('1/2',{strict:true}),'одна вторая');assert.equal(mathSpeech('2/3',{strict:true}),'две третьих');
 assert.equal(mathSpeech('log_2(8)',{strict:true}),'логарифм по основанию два от восьми');
 assert.equal(mathSpeech('cos(x)',{strict:true}),'косинус от икс');
 const fraction=mathSpeech('\\frac{x+1}{\\sqrt{y}}',{strict:true});
 assert.match(fraction,/числитель: икс плюс один, знаменатель: квадратный корень из игрек, конец корня, конец дроби/u);
 assert.equal(mathSpeech('x² + x₁',{strict:true}),'икс в квадрате плюс икс с индексом один');
 assert.match(mathSpeech('x(x+1)',{strict:true}),/икс умножить на открыть скобку, икс плюс один, закрыть скобку/u);
 assert.notEqual(mathSpeech('(x+1)/2',{strict:true}),mathSpeech('x+1/2',{strict:true}));
 assert.equal(mathSpeech('x_i^2',{strict:true}),mathSpeech('x^2_i',{strict:true}));
 assert.match(mathSpeech('x^2^3'),/^Формула/u);
 assert.notEqual(mathSpeech('\\sin^2(x)',{strict:true}),mathSpeech('\\sin(x^2)',{strict:true}));
 assert.match(mathSpeech('sin(x+1)',{strict:true}),/от выражения: икс плюс один, конец аргумента/u);
 assert.notEqual(mathSpeech('f(x+y)',{strict:true}),mathSpeech('f(x)+y',{strict:true}));
 assert.notEqual(mathSpeech('f(x)^2',{strict:true}),mathSpeech('f(x^2)',{strict:true}));
 assert.equal(mathSpeech('\\operatorname{log}_2(8)',{strict:true}),mathSpeech('log_2(8)',{strict:true}));
 assert.equal(mathSpeech('\\operatorname{rank}(A)',{strict:true}),'ранг от а');
 assert.equal(mathSpeech('cos(α)',{strict:true}),'косинус от альфы');assert.equal(mathSpeech('\\Delta',{strict:true}),'дельта');
});
test('matrices retain row/column order and calculus retains bounds and differentials',()=>{
 const matrix=mathSpeech('\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}',{strict:true});
 assert.match(matrix,/две строки и два столбца\. Строка один: один; два\. Строка два: три; четыре/u);
 assert.equal(matrix,mathSpeech('[[1,2],[3,4]]',{strict:true}));
 assert.match(mathSpeech('\\sum_{i=1}^n a_i',{strict:true}),/нижний предел: и равно один, верхний предел: эн.*а с индексом и/u);
 assert.match(mathSpeech('\\int_0^1 x^2 dx',{strict:true}),/нижний предел: ноль, верхний предел: один.*икс в квадрате по икс/u);
 assert.match(mathSpeech('\\lim_{x\\to0}\\frac{sin(x)}{x}',{strict:true}),/предел при икс стремится к нулю/u);
 assert.match(mathSpeech('\\sum_{i=1}^n a_i+b',{strict:true}),/конец выражения плюс бэ/u);
 assert.match(mathSpeech('\\int_0^1 x dx=1/2',{strict:true}),/икс по икс, конец выражения равно одна вторая/u);
 assert.match(mathSpeech('\\int_0^1 f(x) dx + 2',{strict:true}),/эф от икс по икс, конец выражения плюс два/u);
 assert.match(mathSpeech('\\int_0^1 (x+1) \\mathrm{d}x + 2',{strict:true}),/по икс, конец выражения плюс два/u);
 assert.equal(mathSpeech('\\frac{\\partial f}{\\partial x}',{strict:true}),'частная производная эф по икс');
 assert.equal(mathSpeech('dy/dx',{strict:true}),'производная игрек по икс');
 for(const [n,label] of [[1,'одна строка и один столбец'],[2,'две строки и два столбца'],[3,'три строки и три столбца'],[5,'пять строк и пять столбцов'],[11,'одиннадцать строк и одиннадцать столбцов'],[12,'двенадцать строк и двенадцать столбцов']]){
  const cells=Array.from({length:n},()=>`[${Array(n).fill('1').join(',')}]`).join(',');assert.ok(mathSpeech(`[${cells}]`,{strict:true}).startsWith('матрица: '+label+'.'));
 }
 assert.match(mathSpeech('[[1]]',{language:'en',strict:true}),/one row and one column/u);
});
test('unsupported or malformed notation is announced rather than silently omitted',()=>{
 for(const value of ['\\unknown{x}','\\frac{1}','[[1,2],[3]]']){
  assert.throws(()=>mathSpeech(value,{strict:true}));assert.match(mathSpeech(value),/^Формула, запись по символам:/u);
 }
 assert.throws(()=>mathSpeech('a'.repeat(4001)),/INVALID/u);
 assert.match(mathSpeech('('.repeat(65)+'x'+')'.repeat(65)),/^Формула/u);
 assert.match(mathSpeech('x @ 2'),/символ юникод 64/u);
});
test('only spoken math changes; dates, URLs and programming division keep their roles',()=>{
 const source='Дробь 1/2. $\\cos(x)$. Дата 2026/10/30. https://example.invalid?q=1/2';
 const spoken=prepareSpeechText(source);assert.match(spoken,/одна вторая.*косинус от икс/u);
 assert.match(spoken,/2026\/10\/30/u);assert.match(spoken,/https:\/\/example.invalid\?q=1\/2/u);
 assert.match(prepareSpeechText('```cpp\nint x = 1 / 2;\n```'),/1 делить 2/u);
 assert.equal(prepareSpeechText('`1/2`'),'одна вторая');assert.match(prepareSpeechText('```math\n\\sqrt{x}\n```'),/квадратный корень/u);
 assert.equal(proseMathSpeech('Просто текст без формул.'),'Просто текст без формул.');
 assert.doesNotMatch(proseMathSpeech('Доля 1/2.5 и 0.5/2.'),/вторая\.5|0\.пять/u);
 assert.match(proseMathSpeech('Доля 1/2.5 и 0.5/2.'),/знаменатель: 2 запятая 5.*числитель: 0 запятая 5/u);
 assert.equal(source,'Дробь 1/2. $\\cos(x)$. Дата 2026/10/30. https://example.invalid?q=1/2');
 assert.equal(phraseChunks(spoken.repeat(20)).join(''),spoken.repeat(20));
});
test('English scientific text and formulas never acquire Russian substitutions',()=>{
 const value='The CPU processes API requests in Python.';assert.equal(prepareSpeechText(value),value);
 const spoken=prepareSpeechText('One example: $\\frac{1}{2} + \\cos(x)$, then $\\log_2(8)$.',{language:'en'});
 assert.match(spoken,/one half plus cosine of x/u);assert.match(spoken,/logarithm base two of eight/u);assert.doesNotMatch(spoken,/[а-яё]/iu);
 const code=prepareSpeechText('```python\nreturn x // 2 # result\n```',{language:'en'});
 assert.match(code,/return x integer division 2 Comment: result/u);assert.doesNotMatch(code,/[а-яё]/iu);
 assert.doesNotMatch(prepareSpeechText('One example: $1/2$ and cos(x) are useful.'),/[а-яё]/iu);
 assert.doesNotMatch(prepareSpeechText('Here is the formula:\n```math\n1/2\n```'),/[а-яё]/iu);
 assert.match(prepareSpeechText('Дробь $1/2$.',{language:'en'}),/одна вторая/u);
 assert.match(prepareSpeechText('Русское введение.\nThe formula is $\\frac{1}{2}$.'),/The formula is one half/u);
});
