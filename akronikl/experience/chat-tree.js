import {validateAttachment} from './attachments.js';
const id=()=>crypto.randomUUID(),validId=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,64}$/u.test(x);
export function validateChatTree(value){
 if(!value||Object.keys(value).sort().join(',')!=='active,branches,nodes'||!Array.isArray(value.nodes)||value.nodes.length>128||!Array.isArray(value.branches)||!value.branches.length||value.branches.length>12||JSON.stringify(value).length>3000000)throw Error('CHAT_LIMIT');
 const ids=new Set();for(const n of value.nodes){if(!n||Object.keys(n).sort().join(',')!=='attachments,badge,generated,id,parent,role,sources,text'||!validId(n.id)||ids.has(n.id)||n.parent!==null&&!ids.has(n.parent)||!['user','assistant'].includes(n.role)||typeof n.text!=='string'||n.text.length>10000||typeof n.generated!=='boolean'||!['system','generated','course','uncertain','guide','selected','compiler'].includes(n.badge)||!Array.isArray(n.attachments)||n.attachments.length>4||!Array.isArray(n.sources)||n.sources.length>5||n.sources.some(s=>!s||Object.values(s).some(v=>v!==null&&!['string','boolean','number'].includes(typeof v))||JSON.stringify(s).length>12000))throw Error('CHAT_STATE_INVALID');n.attachments.forEach(validateAttachment);ids.add(n.id);}
 const branches=new Set();for(const b of value.branches){if(!b||Object.keys(b).sort().join(',')!=='id,leaf,title'||!validId(b.id)||branches.has(b.id)||b.leaf!==null&&!ids.has(b.leaf)||typeof b.title!=='string'||!b.title||b.title.length>80)throw Error('CHAT_STATE_INVALID');branches.add(b.id);}if(!branches.has(value.active))throw Error('CHAT_STATE_INVALID');return structuredClone(value);
}
export function createChatTree(initial){
 let byteLimit=3000000;
 let state=initial?validateChatTree(initial):{nodes:[],branches:[{id:id(),title:'Основная ветка',leaf:null}],active:null};state.active??=state.branches[0].id;
 const branch=()=>state.branches.find(x=>x.id===state.active),save=()=>validateChatTree(state);
 const pathTo=leaf=>{const result=[];for(let node=state.nodes.find(n=>n.id===leaf);node;node=state.nodes.find(n=>n.id===node.parent))result.unshift(node);return structuredClone(result);};
 return Object.freeze({snapshot:save,path:()=>pathTo(branch().leaf),replace(value){state=validateChatTree(value);},
  setByteLimit(value){if(!Number.isSafeInteger(value)||value<100000||value>3000000)throw Error('CHAT_LIMIT');byteLimit=value;},byteLimit:()=>byteLimit,
  assertCanAsk({text,attachments=[]}){const next=structuredClone(state),node={id:id(),parent:branch().leaf,role:'user',text,badge:'system',generated:false,attachments,sources:[]};next.nodes.push(node);next.branches.find(x=>x.id===state.active).leaf=node.id;validateChatTree(next);if(next.nodes.length>127||new TextEncoder().encode(JSON.stringify(next)).length>byteLimit-90000)throw Error('CHAT_LIMIT');},
  append({role,text,badge='system',generated=false,attachments=[]}){const node={id:id(),parent:branch().leaf,role,text,badge,generated,attachments:attachments.map(validateAttachment),sources:[]};const next=structuredClone(state);next.nodes.push(node);const b=next.branches.find(x=>x.id===state.active);if(b.leaf===null&&role==='user')b.title=text.trim().replace(/\s+/gu,' ').slice(0,64)||b.title;b.leaf=node.id;state=validateChatTree(next);return structuredClone(node);},
  sources(nodeId,sources){const next=structuredClone(state),node=next.nodes.find(n=>n.id===nodeId);if(node)node.sources=structuredClone(sources);state=validateChatTree(next);},
  fork(nodeId){if(nodeId!==null&&!state.nodes.some(n=>n.id===nodeId))throw Error('CHAT_STATE_INVALID');if(state.branches.length>=12)throw Error('CHAT_LIMIT');const b={id:id(),title:'Ветка '+(state.branches.length+1),leaf:nodeId};state.branches.push(b);state.active=b.id;return save();},
  select(branchId){if(!state.branches.some(b=>b.id===branchId))throw Error('CHAT_STATE_INVALID');state.active=branchId;return save();},
  removeBranch(branchId){if(!state.branches.some(b=>b.id===branchId))throw Error('CHAT_STATE_INVALID');const next=structuredClone(state);next.branches=next.branches.filter(b=>b.id!==branchId);if(!next.branches.length)next.branches=[{id:id(),title:'Основная ветка',leaf:null}];if(next.active===branchId)next.active=next.branches[0].id;
   // Сообщения и вложения удаляются лишь когда на них больше не ссылается ни одна ветка.
   const byId=new Map(next.nodes.map(n=>[n.id,n])),reachable=new Set();for(const b of next.branches)for(let n=byId.get(b.leaf);n&&!reachable.has(n.id);n=byId.get(n.parent))reachable.add(n.id);next.nodes=next.nodes.filter(n=>reachable.has(n.id));state=validateChatTree(next);return save();},
  remove(nodeId){const node=state.nodes.find(n=>n.id===nodeId);if(!node)throw Error('CHAT_STATE_INVALID');const deleted=new Set([nodeId]);for(const n of state.nodes)if(deleted.has(n.parent))deleted.add(n.id);for(const b of state.branches)if(deleted.has(b.leaf))b.leaf=node.parent;state.nodes=state.nodes.filter(n=>!deleted.has(n.id));return save();},
  clear(){state.nodes=[];state.branches=[{id:id(),title:'Основная ветка',leaf:null}];state.active=state.branches[0].id;return save();}
 });
}
