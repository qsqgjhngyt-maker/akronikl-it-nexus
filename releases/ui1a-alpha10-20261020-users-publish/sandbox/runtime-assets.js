export const MODERN_CPP_TOOLCHAIN=Object.freeze({
  id:'yowasp-clang-wasi',
  version:'22.0.0-git20542-10',
  compiler:'Clang/LLVM',
  target:'wasm32-wasip1',
  compilerModuleUrl:'https://cdn.jsdelivr.net/npm/@yowasp/clang@22.0.0-git20542-10/gen/bundle.js',
  wasiRunnerId:'runno-wasi',
  wasiRunnerVersion:'0.10.0',
  wasiModuleUrl:'https://cdn.jsdelivr.net/npm/@runno/wasi@0.10.0/+esm',
  firstLoadClass:'large',
  delivery:'pinned-cdn-lazy',
  sourcePrivacy:'source-remains-in-browser'
});

export const MODERN_CPP_LIMITS=Object.freeze({
  maxSourceBytes:512*1024,
  maxTotalInputBytes:2*1024*1024,
  maxCompiledWasmBytes:32*1024*1024,
  maxOutputChars:1024*1024,
  toolchainTimeoutMs:240000,
  compileTimeoutMs:90000,
  executionTimeoutMs:8000
});

export function modernCppToolchainLabel(){
  return `${MODERN_CPP_TOOLCHAIN.compiler} ${MODERN_CPP_TOOLCHAIN.version} · ${MODERN_CPP_TOOLCHAIN.target}`;
}
