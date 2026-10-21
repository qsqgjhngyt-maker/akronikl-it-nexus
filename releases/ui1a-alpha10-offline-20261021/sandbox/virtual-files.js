const safePath=value=>String(value||'').trim().replace(/\\/g,'/').replace(/^\/+/, '').replace(/^\.\//,'');

export function normalizeVirtualFilePath(value){
  const raw=safePath(value);if(!raw)return'';
  const parts=[];
  for(const part of raw.split('/')){
    if(!part||part==='.')continue;
    if(part==='..')continue;
    parts.push(part);
  }
  return parts.join('/');
}

export function flatFilesToVirtualTree(files={}){
  const root={};
  for(const [name,value] of Object.entries(files||{})){
    const safe=normalizeVirtualFilePath(name);if(!safe)continue;
    const parts=safe.split('/');let node=root;
    for(let i=0;i<parts.length-1;i++){
      const part=parts[i];
      const current=node[part];
      if(current instanceof Uint8Array||typeof current==='string')throw new Error(`Virtual filesystem path conflicts with file: ${parts.slice(0,i+1).join('/')}`);
      node=current&&typeof current==='object'?current:(node[part]={});
    }
    const leaf=parts.at(-1);
    if(node[leaf]&&typeof node[leaf]==='object'&&!(node[leaf] instanceof Uint8Array))throw new Error(`Virtual filesystem path conflicts with directory: ${safe}`);
    node[leaf]=value;
  }
  return root;
}

export function flattenVirtualTree(tree={},prefix=''){
  const out={};
  for(const [name,value] of Object.entries(tree||{})){
    const path=prefix?`${prefix}/${name}`:name;
    if(value&&typeof value==='object'&&!(value instanceof Uint8Array))Object.assign(out,flattenVirtualTree(value,path));
    else out[path]=value;
  }
  return out;
}
