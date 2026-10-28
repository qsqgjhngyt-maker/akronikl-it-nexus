import test from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,strToU8} from '../akronikl/vendor/documents/fflate.mjs';
import {officeParts} from '../akronikl/experience/office-zip.js';
import {officeFixture} from '../tools/qa-akronikl/document-fixtures.mjs';
for(const ext of ['docx','xlsx','pptx'])test('real ZIP/OpenXML fixture unpacked with correct content: '+ext,()=>{const parts=officeParts(officeFixture(ext,'DOC_VALUE_1234'));assert.ok(Object.keys(parts).some(n=>parts[n].includes('DOC_VALUE_1234')));assert.ok(parts['[Content_Types].xml']);});
test('ZIP traversal, XML entities, macros, corruption and expansion bombs fail before analysis',()=>{
 const pack=x=>zipSync(Object.fromEntries(Object.entries(x).map(([n,s])=>[n,strToU8(s)])));
 for(const bytes of [pack({'../escape.xml':'x','[Content_Types].xml':'x'}),pack({'word/vbaProject.bin':'x','[Content_Types].xml':'x'}),pack({'word/document.xml':'<!DOCTYPE x [<!ENTITY e SYSTEM "file:///secret">]><x>&e;</x>','[Content_Types].xml':'x'}),pack({'word/document.xml':'A'.repeat(3*1024*1024),'[Content_Types].xml':'x'})])assert.throws(()=>officeParts(bytes),/CHAT_DOCUMENT_/);
 const valid=officeFixture('docx','VALUE'),bad=valid.slice();bad[bad.length-22+10]=255;assert.throws(()=>officeParts(bad));assert.throws(()=>officeParts(new Uint8Array([1,2,3])));
});
