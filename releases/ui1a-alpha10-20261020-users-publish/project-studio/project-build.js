const normalize=value=>String(value||'').trim().replace(/\\/g,'/').replace(/^\/+/, '').replace(/\/+$/,'');
const isSource=(path,languageId='cpp')=>String(languageId).toLowerCase()==='c'?/\.c$/i.test(path):/\.(?:cc|cpp|cxx|c\+\+)$/i.test(path);
const underRoot=(path,root)=>{const p=normalize(path),r=normalize(root);return !!r&&(p===r||p.startsWith(`${r}/`))};
const unique=values=>[...new Set(values.filter(Boolean))];

export function createProjectBuildPlan(project={},mode='run'){
  const manifest=project.manifest||{};
  const workspace=project.workspace||{};
  const languageId=project.languageId||manifest.languageId||workspace.languageId||'cpp';
  const entryFile=normalize(manifest.entryFile||workspace.entryFile||(languageId==='c'?'main.c':'main.cpp'));
  const files=Array.isArray(workspace.files)?workspace.files:[];
  const sourceRoots=unique((manifest.sourceRoots||['src']).map(normalize));
  const includeRoots=unique((manifest.includeRoots||['include']).map(normalize));
  const testRoots=unique((manifest.testRoots||['tests']).map(normalize));
  const fileMap=Object.fromEntries(files.map(file=>[normalize(file.path),String(file.content??'')]).filter(([path])=>path));
  const sourceFiles=Object.keys(fileMap).filter(path=>isSource(path,languageId));
  const production=sourceFiles.filter(path=>sourceRoots.some(root=>underRoot(path,root))&&!testRoots.some(root=>underRoot(path,root)));
  if(isSource(entryFile,languageId)&&fileMap[entryFile]!==undefined&&!production.includes(entryFile))production.unshift(entryFile);
  const tests=sourceFiles.filter(path=>testRoots.some(root=>underRoot(path,root)));
  const translationUnits=mode==='tests'?unique([...production.filter(path=>path!==entryFile),...tests]):unique(production);
  return{mode,languageId,entryFile,sourceRoots,includeRoots,testRoots,translationUnits,files:fileMap};
}

export function projectRuntimeRequest(studio,project,stdin='',mode='run'){
  const base=studio?.runtimeRequest?.(stdin)||{};
  const liveFiles=base.files&&typeof base.files==='object'
    ?Object.entries(base.files).map(([path,content])=>({path,content,languageId:project?.languageId||base.languageId||'cpp'}))
    :project?.workspace?.files||[];
  const liveProject={...project,workspace:{...(project?.workspace||{}),entryFile:base.entryFile||project?.workspace?.entryFile,files:liveFiles}};
  const plan=createProjectBuildPlan(liveProject,mode);
  return{
    ...base,
    languageId:plan.languageId,
    source:String(plan.files[plan.entryFile]??base.source??''),
    files:plan.files,
    entryFile:plan.entryFile,
    metadata:{...(base.metadata||{}),origin:'project-studio',buildMode:mode,translationUnits:plan.translationUnits,includeRoots:plan.includeRoots,sourceRoots:plan.sourceRoots,testRoots:plan.testRoots}
  };
}
