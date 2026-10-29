// SPDX-License-Identifier: GPL-3.0-only
// Универсальный runtime. Исходники учащегося собираются отдельно в его браузере.
#include <QtPlugin>
#include <dlfcn.h>
#include <emscripten.h>
#include <cstdio>
Q_IMPORT_PLUGIN(QWasmIntegrationPlugin)
extern "C" EMSCRIPTEN_KEEPALIVE int nexus_load_student(){
 void* module=dlopen("/student.wasm",RTLD_NOW|RTLD_GLOBAL);
 if(!module){std::printf("Qt link error: %s\n",dlerror());return 1;}
 auto entry=reinterpret_cast<int(*)(int,char**)>(dlsym(module,"__main_argc_argv"));
 if(!entry){
  auto zero=reinterpret_cast<int(*)()>(dlsym(module,"__main_void"));
  if(!zero)zero=reinterpret_cast<int(*)()>(dlsym(module,"__original_main"));
  if(zero)return zero();
  std::puts("Qt entry error: a supported main function is required");return 2;
 }
 static char name[]="student";static char*argv[]={name,nullptr};return entry(1,argv);
}
int main(){return 0;}
