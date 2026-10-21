const esc=value=>String(value??'').replace(/\r/g,'');

export function cppCourseProjectTemplate(def){
  if(!def?.id)throw new Error('C++ course project definition is required.');
  const entryFile='src/main.cpp';
  const files=[
    {path:entryFile,content:esc(def.starter||''),languageId:'cpp'},
    {path:'include/project.hpp',content:'#pragma once\n\n// Общие объявления проекта можно переносить сюда по мере роста архитектуры.\n',languageId:'cpp'},
    {path:'tests/project_tests.cpp',content:'// Nexus Tests foundation.\n// Автоматические тесты проекта будут подключены отдельным этапом.\n',languageId:'cpp'}
  ];
  return{
    templateKey:`cpp-course:${def.id}`,
    title:def.title,
    description:def.pitch||'',
    languageId:'cpp',
    entryFile,
    files,
    origin:{kind:'course-project',courseId:'cpp',projectId:def.id,courseProjectMilestones:(def.milestones||[]).length},
    manifest:{sourceRoots:['src'],includeRoots:['include'],testRoots:['tests']},
    courseProject:def
  };
}

export function blankCppProjectTemplate(title='Новый C++ проект'){
  return{title,description:'Самостоятельный C++ проект в Nexus Project Studio.',languageId:'cpp',entryFile:'src/main.cpp',files:[
    {path:'src/main.cpp',content:'#include <iostream>\n\nint main() {\n    std::cout << "Nexus Project Studio\\n";\n    return 0;\n}\n',languageId:'cpp'},
    {path:'include/project.hpp',content:'#pragma once\n\n// Public project declarations.\n',languageId:'cpp'},
    {path:'tests/project_tests.cpp',content:'// Nexus Tests foundation.\n',languageId:'cpp'}
  ],origin:{kind:'user'}};
}
