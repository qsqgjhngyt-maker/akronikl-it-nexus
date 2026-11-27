import assert from 'node:assert/strict';
import test from 'node:test';
import {authoredHelp, lessonHelpRoute} from '../akronikl/experience/lesson-help.js';

test('Учебная помощь разрешает только текущую тему известного курса', () => {
  assert.equal(lessonHelpRoute({course:'c',lesson:'cpp.data-types'},'ru'),null);
  assert.equal(lessonHelpRoute({course:'c',lesson:'c/../secret'},'ru'),null);
  assert.equal(lessonHelpRoute({course:'python',lesson:'python.types'},'ru'),null);
  assert.equal(lessonHelpRoute({course:'cpp',lesson:'cpp.data-types'},'de'),null);
  assert.deepEqual(lessonHelpRoute({courseId:'onec',lessonId:'onec.p2.topic-1',sectionId:'lab'},'ru'),
    {course:'onec',lesson:'onec.p2.topic-1',locale:'ru',stage:'practice'});
});

test('Наводящая помощь использует материал нужной редакции и не включает поля ответов', () => {
  const route = lessonHelpRoute({course:'c',lesson:'c.read-input',stage:'selfcheck'},'en');
  const lesson = {
    id:'c.read-input',courseId:'c',locale:'en',title:'Read input',
    teaching:{
      predict:{prompt:'Predict the accepted integer.',answer:'PREDICTION_SOLUTION'},
      syntax:{explanation:'Check the tail of the record.'},
      apply:{prompt:'Try a value with a different tail.',answer:'TRANSFER_SOLUTION'},
      practice:{strategy:'Look at one decision first.',diagnosis:'Check where parsing stopped.'},
    },
    selfcheck:[{id:'choice-1',prompt:'Which rule applies?'},{id:'c-predict',prompt:'Compare these two records.'}],
    practice:{referenceSolution:{source:'REFERENCE_SOLUTION'}},
  };
  const guide = authoredHelp(lesson,route,'en');
  assert.equal(guide.title,'Read input');
  assert.deepEqual(guide.help.map(item=>item.text),[
    'Compare these two records.','Check the tail of the record.','Look at one decision first.',
    'Try a value with a different tail.','Check where parsing stopped.',
  ]);
  assert.doesNotMatch(JSON.stringify(guide),/SOLUTION/);
  assert.equal(authoredHelp({...lesson,locale:'ru'},route,'en'),null);
  assert.equal(authoredHelp(lesson,{...route,stage:'explanation'},'en').help[0].text,'Predict the accepted integer.');
  assert.notEqual(authoredHelp(lesson,{...route,stage:'practice'},'en').help[0].text,guide.help[0].text);
  const mixed = authoredHelp(lesson,{...route,stage:'practice'},'ru');
  assert.equal(mixed.help[0].lang,'ru');
  assert.equal(mixed.help[1].lang,'en');
});
