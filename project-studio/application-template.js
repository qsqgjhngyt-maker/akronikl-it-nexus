import{APPLICATION_GPL_V3}from'./application-license.js';
// Учебный стартовый проект; все файлы включены в обычный переносимый экспорт.
const header=String.raw`#pragma once
#include <string>
#include <vector>
#include <iosfwd>
struct Task { int id; std::string title; bool done=false; };
class TaskModel {
  std::vector<Task> tasks_; int next_=1;
public:
  int add(std::string title);
  void complete(int id);
  const std::vector<Task>& tasks()const noexcept{return tasks_;}
  void save(std::ostream&)const;
  void load(std::istream&);
};
`;
const model=String.raw`#include "task_model.hpp"
#include <stdexcept>
#include <algorithm>
#include <iomanip>
#include <istream>
#include <ostream>
namespace { bool valid(const std::string&s){return !s.empty()&&s.size()<=256&&s.find_first_not_of(" \t")!=std::string::npos&&s.find_first_of("\r\n")==std::string::npos;} }
int TaskModel::add(std::string title){
  if(!valid(title))throw std::invalid_argument("Enter a non-empty title (up to 256 bytes)");
  if(tasks_.size()>=200)throw std::length_error("Task limit reached");
  if(next_>1000000)throw std::length_error("ID limit reached");
  tasks_.push_back({next_,std::move(title),false});return next_++;
}
void TaskModel::complete(int id){auto it=std::find_if(tasks_.begin(),tasks_.end(),[id](const Task&t){return t.id==id;});if(it==tasks_.end())throw std::out_of_range("Task not found");it->done=true;}
void TaskModel::save(std::ostream&out)const{out<<"NXTF1 "<<next_<<' '<<tasks_.size()<<'\n';for(const auto&t:tasks_)out<<t.id<<' '<<t.done<<' '<<std::quoted(t.title)<<'\n';if(!out)throw std::runtime_error("Cannot save tasks");}
void TaskModel::load(std::istream&in){
  std::string version;int next=0,count=0;if(!(in>>version>>next>>count)||version!="NXTF1"||next<1||next>1000001||count<0||count>200)throw std::runtime_error("Unsupported or invalid task file");
  std::vector<Task> candidate;for(int i=0;i<count;++i){Task t;int done=-1;if(!(in>>t.id>>done>>std::quoted(t.title))||t.id<1||t.id>=next||done<0||done>1||!valid(t.title)||std::any_of(candidate.begin(),candidate.end(),[&](const Task&x){return x.id==t.id;}))throw std::runtime_error("Invalid task record");t.done=done;candidate.push_back(std::move(t));}
  in>>std::ws;if(!in.eof())throw std::runtime_error("Unexpected task data");tasks_=std::move(candidate);next_=next;
}
`;
const cli=String.raw`#include "task_model.hpp"
#include <iostream>
#include <stdexcept>
int main(){TaskModel model;std::string title;while(std::getline(std::cin,title)){try{int id=model.add(title);std::cout<<id<<": "<<model.tasks().back().title<<'\n';}catch(const std::exception&e){std::cout<<"error: "<<e.what()<<'\n';}}return 0;}
`;
const tests=String.raw`#include "task_model.hpp"
#include <sstream>
#include <iostream>
#include <stdexcept>
void require(bool value){if(!value)throw std::runtime_error("test failed");}
int main(){try{
 TaskModel m;require(m.tasks().empty());require(m.add("learn C++")==1);m.complete(1);require(m.tasks()[0].done);
 bool caught=false;try{m.add("   ");}catch(const std::invalid_argument&){caught=true;}require(caught&&m.tasks().size()==1);
 caught=false;try{m.complete(999);}catch(const std::out_of_range&){caught=true;}require(caught);
 std::ostringstream out;m.save(out);TaskModel copy;std::istringstream in(out.str());copy.load(in);require(copy.tasks().size()==1&&copy.tasks()[0].title=="learn C++"&&copy.tasks()[0].done);require(copy.add("next")==2);
 for(const char*bad:{"NXTF2 2 1\n1 0 \"x\"\n","NXTF1 3 2\n1 0 \"x\"\n1 0 \"y\"\n","NXTF1 2 1\n1 3 \"x\"\n","NXTF1 1 0 extra"}){caught=false;try{std::istringstream invalid(bad);copy.load(invalid);}catch(const std::runtime_error&){caught=true;}require(caught&&copy.tasks().size()==2);}
 std::cout<<"TaskFlow tests: PASS\n";return 0;
 }catch(const std::exception&e){std::cerr<<e.what()<<'\n';return 1;}}
`;
const gui=String.raw`#include "task_model.hpp"
#include <QApplication>
#include <QAccessible>
#include <QWidget>
#include <QVBoxLayout>
#include <QLineEdit>
#include <QPushButton>
#include <QListWidget>
#include <QLabel>
#include <QFile>
#include <memory>
#include <sstream>
#include <iostream>
class TaskWindow:public QWidget {
 TaskModel model_;QLineEdit*input_;QListWidget*list_;QLabel*status_;
 void refresh(){list_->clear();for(const auto&t:model_.tasks()) {auto*item=new QListWidgetItem(QString(t.done?"[done] ":"[ ] ")+QString::fromUtf8(t.title.data(),int(t.title.size())),list_);item->setData(Qt::UserRole,t.id);}std::cout<<"NEXUS_TASKS "<<model_.tasks().size()<<std::endl;}
 void add(){try{const auto text=input_->text().toUtf8();model_.add(std::string(text.constData(),std::size_t(text.size())));input_->clear();status_->setText("Saved in the running application");refresh();}catch(const std::exception&e){status_->setText(QString::fromUtf8(e.what()));}}
public:
 TaskWindow(){setWindowTitle("TaskFlow — C++ in Nexus");resize(460,420);auto*layout=new QVBoxLayout(this);layout->addWidget(new QLabel("TaskFlow",this));input_=new QLineEdit(this);input_->setPlaceholderText("Enter a task");input_->setAccessibleName("Task title");layout->addWidget(input_);auto*button=new QPushButton("Add task",this);layout->addWidget(button);list_=new QListWidget(this);layout->addWidget(list_);status_=new QLabel("Ready",this);status_->setWordWrap(true);layout->addWidget(status_);
  connect(button,&QPushButton::clicked,this,[this]{add();});connect(input_,&QLineEdit::returnPressed,this,[this]{add();});
  auto*done=new QPushButton("Complete selected",this);layout->addWidget(done);connect(done,&QPushButton::clicked,this,[this]{try{if(!list_->currentItem())throw std::runtime_error("Select a task");model_.complete(list_->currentItem()->data(Qt::UserRole).toInt());refresh();}catch(const std::exception&e){status_->setText(QString::fromUtf8(e.what()));}});
  auto*save=new QPushButton("Save application data",this);layout->addWidget(save);connect(save,&QPushButton::clicked,this,[this]{try{std::ostringstream out;model_.save(out);QFile f("/taskflow.txt");if(!f.open(QIODevice::WriteOnly)||f.write(QByteArray::fromStdString(out.str()))<0)throw std::runtime_error("Cannot write data");status_->setText("Application data saved");}catch(const std::exception&e){status_->setText(QString::fromUtf8(e.what()));}});
  QFile f("/taskflow.txt");if(f.open(QIODevice::ReadOnly)){try{const auto bytes=f.read(65537);if(bytes.size()>65536)throw std::runtime_error("Data file is too large");std::istringstream in(bytes.toStdString());model_.load(in);}catch(const std::exception&e){status_->setText(QString::fromUtf8(e.what()));}}refresh();input_->setFocus();
 }
};
int main(int argc,char**argv){static auto app=std::make_unique<QApplication>(argc,argv);
#ifdef __EMSCRIPTEN__
 QAccessible::setActive(true);
#endif
 static auto window=std::make_unique<TaskWindow>();window->show();QAccessible::setRootObject(window.get());
#ifndef __EMSCRIPTEN__
 return app->exec();
#else
 return 0;
#endif
}
`;
const cmake=String.raw`cmake_minimum_required(VERSION 3.16)
project(TaskFlow LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
add_library(task_model src/task_model.cpp)
target_include_directories(task_model PUBLIC include)
if(EMSCRIPTEN)
 target_compile_options(task_model PUBLIC -fexceptions)
 target_link_options(task_model INTERFACE -fexceptions)
endif()
add_executable(taskflow_cli src/main.cpp)
target_link_libraries(taskflow_cli PRIVATE task_model)
enable_testing()
add_executable(taskflow_tests tests/task_model_test.cpp)
target_link_libraries(taskflow_tests PRIVATE task_model)
add_test(NAME task_model COMMAND taskflow_tests)
option(NEXUS_GUI "Build the Qt GUI" OFF)
if(EMSCRIPTEN)
 set(NEXUS_GUI ON)
endif()
if(NEXUS_GUI)
 find_package(Qt6 6.8 REQUIRED COMPONENTS Widgets)
 qt_add_executable(program MANUAL_FINALIZATION src/gui.cpp)
 target_link_libraries(program PRIVATE task_model Qt6::Widgets)
 if(EMSCRIPTEN)
  target_compile_options(program PRIVATE -fexceptions)
  target_link_options(program PRIVATE -fexceptions -sDISABLE_EXCEPTION_CATCHING=0 -sDYNAMIC_EXECUTION=0 "-sEXPORTED_RUNTIME_METHODS=['FS']" -sALLOW_MEMORY_GROWTH=1)
 endif()
 qt_finalize_executable(program)
endif()
`;
const readme=`# TaskFlow — переносимый учебный проект C++20

В Nexus: редактируйте, собирайте, запускайте приложение, выполняйте тесты и сдавайте работу внутри Project Studio. Этот стартовый пример демонстрирует архитектуру; итоговое задание потребует самостоятельного расширения.

Дополнительная внешняя сборка модели, CLI и тестов (Qt не требуется):

    cmake -S . -B build -DNEXUS_GUI=OFF
    cmake --build build
    ctest --test-dir build --output-on-failure

Графический target требует Qt6.8.3; для WebAssembly — соответствующего Emscripten3.1.56. Обычная desktop Qt сборка: добавьте -DNEXUS_GUI=ON и CMAKE_PREFIX_PATH вашего Qt. В Nexus toolchain выбирается средой.

Исходники, тесты и данные проекта не требуют Nexus-сессии для внешней сборки. Файл taskflow.txt имеет версию NXTF1; ошибки загрузки сохраняют текущую модель. Не заменяйте существующие личные работы при импорте — создайте отдельный проект.
`;
export function taskFlowApplicationTemplate(){return{title:'TaskFlow — приложение C++',description:'Переносимая модель, тесты и графический интерфейс.',languageId:'cpp',entryFile:'src/main.cpp',sourceRoots:['src'],includeRoots:['include'],testRoots:['tests'],files:Object.entries({'include/task_model.hpp':header,'src/task_model.cpp':model,'src/main.cpp':cli,'src/gui.cpp':gui,'tests/task_model_test.cpp':tests,'CMakeLists.txt':cmake,'README.md':readme+'\n## Лицензия / License\n\nНовый учебный GUI-шаблон — GPL-3.0-only; полный текст в COPYING.txt. При передаче приложения получателям предоставляются соответствующие исходники и права GPLv3. Личные работы автоматически в GitHub не публикуются. / This new educational GUI template is GPL-3.0-only; see COPYING.txt. Provide corresponding source and GPLv3 rights when conveying the application. Private student work is not automatically published.\n','COPYING.txt':APPLICATION_GPL_V3,'nexus-application.json':JSON.stringify({schemaVersion:1,target:'qt-wasm',outputDataFiles:['taskflow.txt'],targets:{gui:['src/gui.cpp','src/task_model.cpp'],console:['src/main.cpp','src/task_model.cpp'],tests:['tests/task_model_test.cpp','src/task_model.cpp']}},null,2)+'\n'}).map(([path,content])=>({path,content,languageId:'cpp'})),manifest:{application:{schemaVersion:1,target:'qt-wasm',outputDataFiles:['taskflow.txt']},sourceRoots:['src'],includeRoots:['include'],testRoots:['tests']}};}
