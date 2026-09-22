export const PROJECT_ACTIONS=Object.freeze([
  'view','edit','create','delete','run','build','release','manage_members','manage_access','audit_view'
]);

export const ROLE_GRANTS=Object.freeze({
  owner:['*'],
  maintainer:['view','edit','create','delete','run','build','release','manage_members','audit_view'],
  developer:['view','edit','create','delete','run','build','audit_view'],
  docs_editor:['view','audit_view'],
  qa:['view','run','build','audit_view'],
  viewer:['view','audit_view']
});

export const ROLE_SCOPED_GRANTS=Object.freeze({
  docs_editor:[{scope:'docs/**',actions:['edit','create','delete']}],
  qa:[{scope:'tests/**',actions:['edit','create','delete']}]
});

const clean=value=>String(value??'').trim();
export function normalizeProjectPath(value='/'){
  const raw=clean(value).replaceAll('\\','/').replace(/^\/+/, '');
  return raw||'/';
}
export function normalizeScope(value='/**'){
  let scope=clean(value).replaceAll('\\','/');
  if(!scope||scope==='*'||scope==='/**'||scope==='/')return '/**';
  scope=scope.replace(/^\/+/, '').replace(/\/+$/,'');
  if(scope.endsWith('/**'))return scope;
  return scope;
}
export function scopeMatches(scopeValue,pathValue){
  const scope=normalizeScope(scopeValue),path=normalizeProjectPath(pathValue);
  if(scope==='/**')return true;
  if(scope.endsWith('/**')){const prefix=scope.slice(0,-3).replace(/\/+$/,'');return path===prefix||path.startsWith(prefix+'/')}
  return path===scope;
}
function normalizeActions(actions){const arr=Array.isArray(actions)?actions:[actions];return arr.map(clean).filter(Boolean)}
function policyApplies(policy,{subjectId,role,path,action}){
  if(!policy||!scopeMatches(policy.scope,path))return false;
  if(policy.subjectId&&policy.subjectId!==subjectId)return false;
  if(policy.role&&policy.role!==role)return false;
  const actions=normalizeActions(policy.actions||'*');return actions.includes('*')||actions.includes(action);
}
export function findProjectMember(access,subjectId){return(access?.members||[]).find(member=>member?.subjectId===subjectId&&member?.status!=='revoked')||null}
export function evaluateProjectAccess(access,{subjectId,path='/',action='view'}={}){
  if(!subjectId)return{allowed:false,reason:'anonymous',role:null,matchedPolicies:[]};
  const member=findProjectMember(access,subjectId);if(!member)return{allowed:false,reason:'not-a-member',role:null,matchedPolicies:[]};
  const role=member.role||'viewer',grants=ROLE_GRANTS[role]||[];let allowed=grants.includes('*')||grants.includes(action);
  if(!allowed)allowed=(ROLE_SCOPED_GRANTS[role]||[]).some(grant=>scopeMatches(grant.scope,path)&&(grant.actions||[]).includes(action));
  const matched=(access?.policies||[]).filter(policy=>policyApplies(policy,{subjectId,role,path,action}));
  if(matched.some(policy=>policy.effect==='deny'))return{allowed:false,reason:'explicit-deny',role,matchedPolicies:matched};
  if(matched.some(policy=>policy.effect==='allow'))allowed=true;
  return{allowed,reason:allowed?'role-or-policy-allow':'not-granted',role,matchedPolicies:matched};
}
