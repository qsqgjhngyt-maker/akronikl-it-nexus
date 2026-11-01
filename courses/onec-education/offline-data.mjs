// Уплотнение только публичных данных. Значения восстанавливаются побайтно как JSON.
// Сохранения ученика в пакет не входят. Выполнения кода из строк здесь нет.
const OFFLINE_TEXT_REF='$nexusText';
export function packOnecOfflineData(assets){
 const counts=new Map();let nodes=0;function count(v){if(++nodes>200000)throw Error('OFFLINE_DATA_NODES');if(typeof v==='string'){if(v.length>=40)counts.set(v,(counts.get(v)||0)+1);}else if(Array.isArray(v))v.forEach(count);else if(v&&typeof v==='object'){if(Object.hasOwn(v,OFFLINE_TEXT_REF))throw Error('OFFLINE_RESERVED_KEY');Object.values(v).forEach(count);}}
 count(assets);const texts=[...counts].filter(([,n])=>n>1).map(([s])=>s);if(texts.length>5000)throw Error('OFFLINE_TEXT_COUNT');const refs=new Map(texts.map((s,i)=>[s,i]));
 function encode(v){if(typeof v==='string'&&refs.has(v))return{[OFFLINE_TEXT_REF]:refs.get(v)};if(Array.isArray(v))return v.map(encode);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,encode(x)]));return v;}
 return{schemaVersion:1,texts,assets:encode(assets)};
}
export function unpackOnecOfflineData(pack){
 if(pack?.schemaVersion!==1||!Array.isArray(pack.texts)||pack.texts.length>5000||pack.texts.some(s=>typeof s!=='string'||s.length>1000000)||!pack.assets||typeof pack.assets!=='object'||Array.isArray(pack.assets))throw Error('OFFLINE_DATA_SHAPE');let nodes=0;
 function decode(v){if(++nodes>200000)throw Error('OFFLINE_DATA_NODES');if(Array.isArray(v))return v.map(decode);if(v&&typeof v==='object'){if(Object.hasOwn(v,OFFLINE_TEXT_REF)){const i=v[OFFLINE_TEXT_REF];if(Object.keys(v).length!==1||!Number.isSafeInteger(i)||i<0||i>=pack.texts.length)throw Error('OFFLINE_TEXT_REFERENCE');return pack.texts[i];}return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,decode(x)]));}return v;}
 const assets=decode(pack.assets);if(new TextEncoder().encode(JSON.stringify(assets)).length>4000000)throw Error('OFFLINE_UNPACKED_BUDGET_EXCEEDED');return assets;
}
