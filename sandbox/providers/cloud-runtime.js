import {normalizeRuntimeRequest,RUNTIME_SUPPORT} from '../provider-contract.js';

export const cloudRuntimeProvider={
  id:'secure-cloud-build',
  label:'Nexus Secure Build Runner',
  tier:'cloud',
  priority:10,
  languages:['*'],
  planned:true,
  lifecycle:'planned',
  capabilities:{stdin:true,stdout:true,unicode:true,files:true,threads:true,gui:'build-target-dependent',fullStdlib:true,multiFile:true,buildArtifacts:true},
  inspect(input={}){
    const request=normalizeRuntimeRequest(input);
    const needsProject=Boolean(request.files&&Object.keys(request.files).length>1)||Boolean(request.metadata?.projectBuild);
    return{support:RUNTIME_SUPPORT.GUARANTEED,confidence:RUNTIME_SUPPORT.GUARANTEED,reasons:[needsProject?'multi-file-project':'secure-build-capable'],scoreHint:needsProject?100:-160};
  },
  async available(){return false},
  async run(){
    const error=new Error('Nexus Secure Build Runner is planned and is not connected in this release.');
    error.code='SECURE_BUILD_NOT_READY';
    throw error;
  }
};
