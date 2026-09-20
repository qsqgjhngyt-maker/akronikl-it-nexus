export const wasmRuntimeProvider={
  id:'wasm-cpp',label:'Nexus WASM Runtime',tier:'wasm',planned:true,
  capabilities:{stdin:true,stdout:true,unicode:true,files:'virtual',threads:'planned',gui:false,fullStdlib:'extended'},
  async available(){return false}
};
