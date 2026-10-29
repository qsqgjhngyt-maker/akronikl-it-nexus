cmake_minimum_required(VERSION 3.16)
project(NexusBrowserQtHost LANGUAGES CXX)
set(SDK /opt/qt/6.8.3/wasm_singlethread)
if(EXISTS /input/export-generator.txt)
 execute_process(COMMAND python3 /input/export-generator.txt ${SDK} ${CMAKE_BINARY_DIR}/exports.txt ${CMAKE_BINARY_DIR}/program.data RESULT_VARIABLE GENERATED)
 if(NOT GENERATED EQUAL 0)
  message(FATAL_ERROR "Qt export generation failed")
 endif()
else()
 configure_file(/input/exports.txt ${CMAKE_BINARY_DIR}/exports.txt COPYONLY)
endif()
file(GLOB_RECURSE RESOURCE_OBJECTS "${SDK}/lib/objects-Release/Widgets_resources_*/*.o" "${SDK}/lib/objects-Release/Gui_resources_*/*.o" "${SDK}/lib/objects-Release/QWasmIntegrationPlugin_resources_*/*.o")
add_custom_command(OUTPUT program.js program.wasm
 COMMAND em++ /input/host.cpp -std=c++20 -O0 -g0 -fexceptions
  -I${SDK}/include -I${SDK}/include/QtCore -I${SDK}/mkspecs/wasm-emscripten -DQT_CORE_LIB
  ${RESOURCE_OBJECTS}
  ${SDK}/lib/libQt6Widgets.a ${SDK}/lib/libQt6Gui.a ${SDK}/lib/libQt6Core.a
  ${SDK}/plugins/platforms/libqwasm.a ${SDK}/lib/libQt6OpenGL.a
  ${SDK}/lib/libQt6BundledHarfbuzz.a ${SDK}/lib/libQt6BundledFreetype.a
  ${SDK}/lib/libQt6BundledLibpng.a ${SDK}/lib/libQt6BundledLibjpeg.a ${SDK}/lib/libQt6BundledZLIB.a ${SDK}/lib/libQt6BundledPcre2.a
  --bind -sMAIN_MODULE=1 -sWASM_BIGINT=1 -sDECLARE_ASM_MODULE_EXPORTS=0
  -sDISABLE_EXCEPTION_CATCHING=0 -sDYNAMIC_EXECUTION=0 "-sEXPORTED_RUNTIME_METHODS=['UTF16ToString','stringToUTF16','JSEvents','specialHTMLTargets','FS','callMain']"
  -Wl,@${CMAKE_BINARY_DIR}/exports.txt
  -sALLOW_MEMORY_GROWTH=1 -sINITIAL_MEMORY=52428800 -sMAXIMUM_MEMORY=268435456 -sSTACK_SIZE=5242880 -sMAX_WEBGL_VERSION=2 -sFETCH=1
  -o program.js
 WORKING_DIRECTORY ${CMAKE_BINARY_DIR} VERBATIM)
add_custom_target(program ALL DEPENDS program.js program.wasm)
file(COPY ${SDK}/plugins/platforms/qtloader.js ${SDK}/plugins/platforms/qtlogo.svg DESTINATION ${CMAKE_BINARY_DIR})
