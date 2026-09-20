export const cloudRuntimeProvider={
  id:'secure-cloud-cpp',label:'Nexus Secure Build Runner',tier:'cloud',planned:true,
  capabilities:{stdin:true,stdout:true,unicode:true,files:true,threads:true,gui:'build-target-dependent',fullStdlib:true,multiFile:true,buildArtifacts:true},
  async available(){return false}
};
