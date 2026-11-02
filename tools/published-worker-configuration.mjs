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
 return expandPublicWorkerConfiguration(JSON.parse(json));
}

// Аддитивное публичное представление. Старый объект возвращается без изменений.
// Только данные JSON: никакого eval и исполнения текста опубликованного worker.
export function expandPublicWorkerConfiguration(value){
 if(!Object.hasOwn(value,'assetEncoding'))return value;
 const fail=()=>{throw Error('Invalid packed public asset manifest');};
 if(value.assetEncoding!=='prefix-groups-v1'||!Array.isArray(value.assets)||value.assets.length||!Array.isArray(value.assetGroups)||value.assetGroups.length>1000)fail();
 const assets=[],seen=new Set();
 for(const group of value.assetGroups){
  if(!Array.isArray(group)||group.length!==2||typeof group[0]!=='string'||group[0].length>256||!Array.isArray(group[1]))fail();
  for(const pair of group[1]){
   if(!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=='string'||!pair[1]||typeof pair[1]!=='object'||Array.isArray(pair[1]))fail();
   const url=group[0]+pair[0],row=pair[1];
   if(url.length>2048||!url||!/^[A-Za-z0-9._/@+-]+(?:\/[A-Za-z0-9._@+-]+)*$/.test(url)||url.split('/').some(x=>x==='.'||x==='..')||seen.has(url)||Object.keys(row).some(k=>!['bytes','sha256','mime','version'].includes(k))||!Number.isSafeInteger(row.bytes)||row.bytes<0||!/^[a-f0-9]{64}$/.test(row.sha256||'')||typeof row.mime!=='string'||row.mime.length>200||Object.hasOwn(row,'version')&&(typeof row.version!=='string'||row.version.length>200))fail();
   seen.add(url);assets.push({url,...row});if(assets.length>100000)fail();
  }
 }
 const{assetEncoding,assetGroups,...config}=value;return{...config,assets};
}
