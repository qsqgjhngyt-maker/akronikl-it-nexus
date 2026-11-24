import assert from 'node:assert/strict';

export function c17Program(program, fixture = {}) {
  const entryFile = program.metadata?.entryFile ?? 'main.c';
  const sourceFiles = Array.isArray(program.files)
    ? Object.fromEntries(program.files.map(file => [file.path, file.content ?? file.source]))
    : program.files ?? {};
  const source = program.source ?? sourceFiles[entryFile];
  assert.equal(typeof source, 'string', entryFile);
  const files = fixture.inputFiles === undefined ? {...sourceFiles} :
    {...Object.fromEntries(Object.entries(sourceFiles).filter(([name]) => /\.(?:c|h)$/i.test(name))),
      ...fixture.inputFiles};
  files[entryFile] = source;
  for (const [name, content] of Object.entries(files)) {
    assert.match(name, /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/);
    assert.ok(name.split('/').every(part => part !== '.' && part !== '..'), name);
    assert.equal(typeof content, 'string', name);
  }
  return {languageId:'c', entryFile, source, files:Object.fromEntries(Object.entries(files).sort(([a],[b])=>a.localeCompare(b)))};
}

export function c17Vectors(edition) {
  const result = [];
  const add = (kind, id, program, vector) => {
    result.push({kind,id,program,fixture:{
      inputFiles:vector.inputFiles, outputFiles:vector.outputFiles, stdin:vector.input ?? vector.stdin ?? '',
      stdout:vector.output ?? vector.expectedStdout ?? '', stderr:vector.stderr,
      exitCode:kind === 'diagnostic' ? vector.expectedExitCode : vector.exitCode ?? 0,
      phase:vector.phase, stderrIncludes:vector.stderrIncludes,
    }});
  };
  const examples = edition.sections.filter(section => section.code);
  assert.ok(examples.length > 0, edition.id);
  for(const {id,code} of examples){
    add('example',id,code,code);
    for(const [index,vector] of (code.cases ?? []).entries()) add('example',id+':'+(index+1),code,vector);
  }
  const {cases,referenceSolution} = edition.practice;
  assert.ok(cases.length && referenceSolution,edition.id);
  for(const [index,item] of cases.entries()) add('reference',(index+1)+': '+item.label,referenceSolution,item);
  for(const [index,item] of (edition.diagnosticExercises ?? []).entries()) add('diagnostic',String(index+1),item,item);
  return result;
}
