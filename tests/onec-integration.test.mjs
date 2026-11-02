import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createOnecAccountStorage} from '../courses/onec-education/account-progress.mjs';
import {createCandidateStore,courseKey} from '../courses/onec-education/model.mjs';
import {createFinalAssessmentStore} from '../courses/onec-education/final-assessment.mjs';
import {accountStoragePrefix} from '../core/account-storage.js';
import {languageJourney} from '../core/nexus-language-journey.js';

const base='d8721e06a2b1ac953aa18694c07559c62d388700';
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const previous=p=>JSON.parse(execFileSync('git',['show',base+':'+p],{encoding:'utf8',maxBuffer:5e6}));
test('Активация ровно двух курсов сохраняет все старые каталожные поля и остальные языки',()=>{
 const current=json('courses/catalog.json'),old=previous('courses/catalog.json');
 assert.equal(current.courses.length,old.courses.length+1);
 for(const row of old.courses){const next=current.courses.find(c=>c.id===row.id);assert.deepEqual(next,row.id==='1c-enterprise'?{...row,status:'available-alpha',route:'#course=1c-enterprise'}:row);}
 assert.deepEqual(current.courses.find(c=>c.id==='onec'),{id:'onec',order:54,title:json('courses/onec/curriculum.json').title,category:'core',categoryTitle:{ru:'Ядро',en:'Core'},origin:'user',status:'available-alpha',route:'#course=onec',languageId:'onec'});
 const tracks=json('courses/programming/languages.json'),oldTracks=previous('courses/programming/languages.json');
 assert.deepEqual(tracks,{...oldTracks,tracks:oldTracks.tracks.map(t=>t.id==='onec'?{...t,status:'available-alpha',courseId:'onec',route:'#course=onec'}:t)});
 const onec=tracks.tracks.find(t=>t.id==='onec');assert.equal(languageJourney(onec).href,'#course=onec');assert.equal(languageJourney({...onec,route:'#course=foreign'}).status,'planned');
});
test('Настоящий формат progress/attempts/finals разделён по аккаунтам; legacy и C++ сохраняются',()=>{
 const values=new Map(),raw={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 const legacy='LEGACY_SOURCE_PRESERVED',cpp='CPP_SOURCE_PRESERVED';raw.setItem(courseKey('onec'),legacy);raw.setItem('akronikl:it-nexus:state:v1',cpp);
 let account={accountId:'synthetic-owner-a',status:'active'},active=true;
 const first=createOnecAccountStorage({raw,readAccount:()=>account,isCurrent:()=>active});
 const p=createCandidateStore(first,'onec',json('courses/onec/curriculum.json'));
 p.createProject({id:'own-note',note:'Synthetic A'});
 const spec=json('courses/onec/final-assessment.json');const f=createFinalAssessmentStore(first,spec);assert.deepEqual(f.read().attempts,[]);
 const before=new Map(values);const oldAccount=account;account={accountId:'synthetic-owner-b',status:'active'};
 assert.throws(()=>p.read(),/ONEC_ACCOUNT_CHANGED/);
 const second=createOnecAccountStorage({raw,readAccount:()=>account});assert.deepEqual(createCandidateStore(second,'onec').read().projects,[]);
 createCandidateStore(second,'1c-enterprise').createProject({id:'other-note',note:'Synthetic B'});
 for(const[k,v]of before)assert.equal(values.get(k),v);
 assert.equal(values.get(courseKey('onec')),legacy);assert.equal(values.get('akronikl:it-nexus:state:v1'),cpp);
 account=oldAccount;active=false;assert.throws(()=>first.setItem(courseKey('onec'),'replacement'),/ONEC_ACCOUNT_CHANGED/);
 assert.ok(values.has(accountStoragePrefix(oldAccount.accountId)+courseKey('onec')));
});
test('Анонимный просмотр не присваивает legacy; чужие ключи, cleanup и quota не обходятся',()=>{
 const values=new Map([[courseKey('onec'),'LEGACY']]);let writes=0;
 const raw={getItem:k=>values.get(k)??null,setItem(){writes++;throw Error('QuotaExceededError')}};
 const guest=createOnecAccountStorage({raw,readAccount:()=>null});assert.equal(guest.getItem(courseKey('onec')),null);assert.throws(()=>guest.setItem(courseKey('onec'),'x'),/ACCOUNT_REQUIRED/);assert.equal(writes,0);
 const account={accountId:'synthetic-quota',status:'active'},store=createOnecAccountStorage({raw,readAccount:()=>account});
 assert.throws(()=>store.getItem('akronikl:it-nexus:projects:v1'),/KEY_REJECTED/);assert.throws(()=>store.clear(),/CLEAR_FORBIDDEN/);assert.throws(()=>store.removeItem(courseKey('onec')),/DELETE_FORBIDDEN/);assert.throws(()=>store.setItem(courseKey('onec'),'new'),/Quota/);assert.equal(values.get(courseKey('onec')),'LEGACY');
});
