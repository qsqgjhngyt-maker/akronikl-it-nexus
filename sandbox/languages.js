const LANGUAGE_DEFINITIONS=[
  {id:'c',title:{ru:'C',en:'C'},family:'systems',extensions:['.c','.h'],entryFile:'main.c'},
  {id:'cpp',title:{ru:'C++',en:'C++'},family:'systems',extensions:['.cpp','.cc','.cxx','.hpp','.h'],entryFile:'main.cpp',reference:true},
  {id:'rust',title:{ru:'Rust',en:'Rust'},family:'systems',extensions:['.rs'],entryFile:'main.rs'},
  {id:'python',title:{ru:'Python',en:'Python'},family:'general',extensions:['.py'],entryFile:'main.py'},
  {id:'java',title:{ru:'Java',en:'Java'},family:'general',extensions:['.java'],entryFile:'Main.java'},
  {id:'csharp',title:{ru:'C#',en:'C#'},family:'general',aliases:['cs','c#'],extensions:['.cs'],entryFile:'Program.cs'},
  {id:'go',title:{ru:'Go',en:'Go'},family:'general',extensions:['.go'],entryFile:'main.go'},
  {id:'javascript',title:{ru:'JavaScript',en:'JavaScript'},family:'web',aliases:['js'],extensions:['.js','.mjs'],entryFile:'main.js'},
  {id:'typescript',title:{ru:'TypeScript',en:'TypeScript'},family:'web',aliases:['ts'],extensions:['.ts'],entryFile:'main.ts'},
  {id:'kotlin',title:{ru:'Kotlin',en:'Kotlin'},family:'mobile',extensions:['.kt','.kts'],entryFile:'Main.kt'},
  {id:'swift',title:{ru:'Swift',en:'Swift'},family:'mobile',extensions:['.swift'],entryFile:'main.swift'},
  {id:'dart',title:{ru:'Dart',en:'Dart'},family:'mobile',extensions:['.dart'],entryFile:'main.dart'},
  {id:'php',title:{ru:'PHP',en:'PHP'},family:'web',extensions:['.php'],entryFile:'main.php'},
  {id:'ruby',title:{ru:'Ruby',en:'Ruby'},family:'web',extensions:['.rb'],entryFile:'main.rb'},
  {id:'scala',title:{ru:'Scala',en:'Scala'},family:'general',extensions:['.scala'],entryFile:'Main.scala'},
  {id:'bash',title:{ru:'Bash',en:'Bash'},family:'automation',aliases:['shell','sh'],extensions:['.sh'],entryFile:'main.sh'},
  {id:'powershell',title:{ru:'PowerShell',en:'PowerShell'},family:'automation',aliases:['pwsh','ps1'],extensions:['.ps1'],entryFile:'main.ps1'},
  {id:'r',title:{ru:'R',en:'R'},family:'data',extensions:['.r','.R'],entryFile:'main.R'},
  {id:'julia',title:{ru:'Julia',en:'Julia'},family:'data',extensions:['.jl'],entryFile:'main.jl'},
  {id:'lua',title:{ru:'Lua',en:'Lua'},family:'embedded',extensions:['.lua'],entryFile:'main.lua'},
  {id:'onec',title:{ru:'1С:Предприятие',en:'1C:Enterprise'},family:'enterprise',aliases:['1c','bsl'],extensions:['.bsl','.os'],entryFile:'Module.bsl'},
  {id:'assembly',title:{ru:'Assembly',en:'Assembly'},family:'systems',aliases:['asm'],extensions:['.asm','.s'],entryFile:'main.s'},
  {id:'fortran',title:{ru:'Fortran',en:'Fortran'},family:'scientific',extensions:['.f90','.f95','.f'],entryFile:'main.f90'},
  {id:'perl',title:{ru:'Perl',en:'Perl'},family:'automation',extensions:['.pl','.pm'],entryFile:'main.pl'}
];

const frozen=LANGUAGE_DEFINITIONS.map(item=>Object.freeze({status:item.id==='cpp'?'available-alpha':'planned',aliases:[],...item}));
const byId=new Map();
for(const language of frozen){
  byId.set(language.id,language);
  for(const alias of language.aliases||[])byId.set(String(alias).toLowerCase(),language);
}

export const programmingLanguages=Object.freeze(frozen);

export function resolveLanguage(id='cpp'){
  return byId.get(String(id||'cpp').toLowerCase())||null;
}

export function languageLabel(id='cpp',locale='ru'){
  const language=resolveLanguage(id);
  if(!language)return String(id||'').toUpperCase();
  return language.title?.[locale]||language.title?.ru||language.id;
}

export function languageEntryFile(id='cpp'){
  return resolveLanguage(id)?.entryFile||'main.txt';
}
