import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {c17Program,c17Vectors} from './helpers/c17-vectors.mjs';

const course = new URL('../courses/c/', import.meta.url);
const read = name => JSON.parse(readFileSync(new URL(name, course), 'utf8'));
const manifest = read('manifest.json');
const compiler = process.argv[2] ?? 'clang';
const workspace = mkdtempSync(join(tmpdir(), 'nexus-c17-'));
const executable = join(workspace, process.platform === 'win32' ? 'program.exe' : 'program');
const totals = {editions: 0, examples: 0, practiceCases: 0, rejectedBuilds: 0};

function execute(command,args,cwd=workspace,input=''){
  const result=spawnSync(command,args,{cwd,input,encoding:'utf8',timeout:10_000});
  assert.ifError(result.error);
  return result;
}

function build(program, fixture, strict, context){
  const {files}=c17Program(program,fixture);
  const dir=mkdtempSync(join(workspace,'case-'));
  for(const [name,content] of Object.entries(files)){
    const destination=join(dir,name);
    mkdirSync(dirname(destination),{recursive:true});
    writeFileSync(destination,content);
  }
  const units=Object.keys(files).filter(name=>name.endsWith('.c')).map(name=>'./'+name);
  const flags=['-std=c17','-Wall','-Wextra','-Wpedantic','-I.'];
  if(strict)flags.push('-Werror');
  if(fixture.phase==='link'){
    const compile=execute(compiler,[...flags,'-fsyntax-only',...units],dir);
    assert.equal(compile.status,0,context+' / syntax before link / '+compile.stderr);
  }
  return {dir,files,result:execute(compiler,[...flags,...units,'-o',executable],dir)};
}

function readFiles(root,relative=''){
  return Object.fromEntries(readdirSync(join(root,relative),{withFileTypes:true}).flatMap(item=>{
    const name=relative?relative+'/'+item.name:item.name;
    return item.isDirectory()?Object.entries(readFiles(root,name)):[[name,readFileSync(join(root,name))]];
  }));
}

function checkEdition(lesson){
  const edition=lesson.id+' / '+lesson.locale;
  const starter=lesson.practice.files.find(file=>file.path==='main.c').content;
  if(!(lesson.diagnosticExercises??[]).some(item=>item.source===starter)){
    const check=build({files:lesson.practice.files},{},false,edition);
    assert.equal(check.result.status,0,edition+' / starter / '+check.result.stderr);
    rmSync(check.dir,{recursive:true});
  }
  for(const {kind,id,program,fixture} of c17Vectors(lesson)){
    const label=edition+' / '+kind+' / '+id;
    const {dir,files,result}=build(program,fixture,true,label);
    if(kind==='diagnostic'){
      assert.ok(result.status>0,label+' / expected '+fixture.phase+' rejection');
      assert.equal(result.stdout,fixture.stdout,label);
      for(const fragment of fixture.stderrIncludes??[])assert.ok(result.stderr.includes(fragment),label+' / '+result.stderr);
      totals.rejectedBuilds++;
    } else {
      assert.equal(result.status,0,label+' / '+result.stderr);
      const run=execute(executable,[],dir,fixture.stdin);
      assert.equal(run.status,fixture.exitCode,label+' / exit status');
      assert.equal(run.stdout,fixture.stdout,label+' / stdout');
      assert.equal(run.stderr,fixture.nativeStderr??fixture.stderr,label+' / stderr');
      if(fixture.outputFiles!==undefined){
        const after=readFiles(dir);
        for(const name of Object.keys(files))assert.ok(Object.hasOwn(after,name),label+' / original path lost '+name);
        const delta=Object.fromEntries(Object.entries(after).filter(([name,bytes])=>
          !Object.hasOwn(files,name)||!bytes.equals(Buffer.from(files[name]))));
        const expected=Object.fromEntries(Object.entries(fixture.outputFiles).map(([name,content])=>[name,Buffer.from(content)]));
        assert.deepEqual(delta,expected,label+' / exact file bytes');
      }
      totals[kind==='example'?'examples':'practiceCases']++;
    }
    rmSync(dir,{recursive:true});
  }
  totals.editions++;
}

try{
  const version=execute(compiler,['--version']);
  assert.equal(version.status,0,'Could not identify the native C17 compiler');
  console.log(version.stdout.split('\n')[0]);
  for(const id of manifest.availableTopicIds)for(const locale of manifest.availableLocales)checkEdition(read('lessons/'+id+'.'+locale+'.json'));
  console.log(JSON.stringify(totals));
}finally{
  rmSync(workspace,{recursive:true,force:true});
}
