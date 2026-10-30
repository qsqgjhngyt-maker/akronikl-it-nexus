import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveMessage,isLocalNexusRequest} from '../akronikl/experience/intents.js';
import {conversationRequest} from '../tools/qa-akronikl/conversation-request.mjs';
import {personalityPreset,updatePersonality,compilePersonality} from '../akronikl/personality/config.js';
for(const text of ['Давай обсудим выходные','Что ты умеешь?','Найди идею для рассказа','Почему ошибка в выборе подарка?','Открой для меня мир джаза','Разбери код: const x=1;','Give me an example','Help','Что дальше?','С чего сегодня начнём?','Удали слово проект из текста'])test('ordinary conversation reaches chat: '+text,()=>assert.equal(isLocalNexusRequest(resolveMessage(text)),false));
for(const text of ['Мой прогресс','Что мы сейчас изучаем?','Покажи контекст','Открой Академию','Где мои проекты?','Как сохранить работу','удали все проекты','Помоги найти лабораторную работу'])test('verified Nexus request stays local: '+text,()=>assert.equal(isLocalNexusRequest(resolveMessage(text)),true));
test('conversation uses chosen character without a forced tutor role; serious safeguards remain',()=>{
 const personality=updatePersonality(personalityPreset(),{humor:80});
 const data={locale:'ru',personality,turns:[{role:'user',text:'Обсудим выдуманный мир',attachments:[]}]};
 const prompt=conversationRequest(data,{providerId:'qwen',modelId:'qwen3.8-max'}).messages[0].content;
 assert.match(prompt,/ИИ-собеседник/);assert.match(prompt,/80\/100/);assert.match(prompt,/Do not redirect unrelated topics/);assert.match(prompt,/untrusted data/);assert.match(prompt,/do not claim browsing/);
 assert.equal(compilePersonality(personality).effectiveHumor,0);
 assert.equal(compilePersonality(personality,{situation:'routine',conversation:true,text:'Утечка безопасности'}).effectiveHumor,0);
 assert.match(conversationRequest({...data,turns:[{role:'user',text:'Потерял файлы',attachments:[]}]},{providerId:'qwen',modelId:'qwen3.8-max'}).messages[0].content,/Без шуток/);
});
