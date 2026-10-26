export function readWorkerConfiguration(text){
 const assignments=[...text.matchAll(/\bvar\s+define_NEXUS_PWA_CONFIG_default\s*=\s*/g)];
 if(assignments.length!==1)throw Error('Expected exactly one compiled public manifest');
 const start=assignments[0].index+assignments[0][0].length;
 if(text[start]!=='{')throw Error('Public manifest must be an object literal');
 let depth=0,quoted=false,escaped=false,end=-1;
 for(let i=start;i<text.length;i++){
  const c=text[i];
  if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue}
  if(c==='"'){quoted=true;continue}
  if(c==='{')depth++;
  if(c==='}'&&--depth===0){end=i+1;break}
 }
 if(end<0||!/^\s*;/.test(text.slice(end)))throw Error('Public manifest literal is incomplete');
 const literal=text.slice(start,end);let json='';quoted=false;escaped=false;
 for(let i=0;i<literal.length;i++){
  const c=literal[i];
  if(quoted){json+=c;if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue}
  if(c==='"'){quoted=true;json+=c;continue}
  if(/[0-9-]/.test(c)){const number=/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(literal.slice(i));if(!number)throw Error('Invalid JSON number');json+=number[0];i+=number[0].length-1;continue;}
  if(/[A-Za-z_$]/.test(c)){
   const identifier=/^[A-Za-z_$][A-Za-z0-9_$]*/.exec(literal.slice(i))[0];
   if(/^\s*:/.test(literal.slice(i+identifier.length)))json+=JSON.stringify(identifier);
   else if(['true','false','null'].includes(identifier))json+=identifier;
   else throw Error('Public manifest contains a non-JSON expression');
   i+=identifier.length-1;continue;
  }
  json+=c;
 }
 return JSON.parse(json);
}
