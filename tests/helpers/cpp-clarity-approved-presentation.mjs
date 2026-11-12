// Прямое поручение владельца: полная видимость эталонов и длинных подписей.
// Исключены только два точных файла с зафиксированными bytes; остальные контракты прежние.
import assert from 'node:assert/strict';
import {referencePathId,assertReferenceEdition,withoutReferencePaths} from './reference-course-contract.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const expected={"core/clarity-visuals.mjs": "186f24da2e4cc44de25c6a00285eaf995c3a11074114b7a3a8f6eb958b962ffb", "core/cpp-clarity-r3-renderer.mjs": "29b4a33b9f9d1d9f3b2e7f9661c0f89de2c0c9351dcffa94cedb80ca133e6638"};
for(const[file,digest]of Object.entries(expected))assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),digest,'Owner-requested presentation bytes: '+file);
const referencePins=JSON.parse(readFileSync(new URL('../../docs/ru/03-content/reference-courses-20261112/APPROVED_REFERENCE_BYTES.json',import.meta.url))).files;
for(const pin of referencePins)assert.equal(createHash('sha256').update(readFileSync(pin.path)).digest('hex'),pin.newSha256,'Reference exact bytes: '+pin.path);
const referenceShared=new Set(referencePins.filter(p=>!p.path.startsWith('courses/reference/')).map(p=>p.path));
export function approvedPresentationDiff(bytes){return Buffer.from(bytes.toString().split('\n').filter(line=>{const p=line.replace(/\r$/,'');if(Object.hasOwn(expected,p)||referenceShared.has(p))return false;const r=referencePathId(p);if(r){assertReferenceEdition(r.id,r.locale);return false;}return true;}).join('\n'));}
export function assertApprovedPresentationPaths(actual,expected,...message){assert.deepEqual(withoutReferencePaths(actual).filter(Boolean),withoutReferencePaths(expected).filter(Boolean),...message);}
export const approvedVisualStylesAddition="\n .r3-lesson .flow-steps{display:grid;gap:32px;list-style:none;padding:0;margin:16px auto;max-width:640px;min-width:0}\n .r3-lesson .flow-step{position:relative;box-sizing:border-box;min-width:0;padding:16px 20px;border:1.5px solid #a6bfd7;border-radius:12px;background:#172d44;color:#f1f7ff;text-align:center;white-space:normal;overflow-wrap:anywhere}\n .r3-lesson .flow-step p{margin:6px 0 0}\n .r3-lesson .flow-step-arrow{position:absolute;left:50%;bottom:-30px;transform:translateX(-50%);line-height:28px;font-size:24px;color:#c6d9ea}";
export function assertPreservedOrWrappedFlow(flow,now,before){
 if(!now.includes('data-wrapped-flow'))return assert.equal(now,before);
 assert.ok(flow.nodes.some(n=>[n.title,...n.lines].some(t=>String(t).length>24)||n.lines.length>2));
 const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 for(const n of flow.nodes)for(const text of [n.title,...n.lines])assert.ok(now.includes(esc(text)),'Full flow label: '+text);
}
