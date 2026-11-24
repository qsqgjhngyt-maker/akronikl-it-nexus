// Явно опубликованные владельцем материалы версии.
const publicRoot='https://storage.yandexcloud.net/akronikl-p4q-public-voice-20261029-2634b701/journal/20261109-ef3caaab/';
const team='Команда AKRONIKL IT NEXUS';
export const PUBLISHED_EDITORIAL_POSTS=Object.freeze([
 Object.freeze({
  slug:"polnyy-kurs-c17-v-nexus",
  title:"Программирование на C с нуля. От первой программы до проекта",
  summary:"В Академии Nexus появился полный курс C17. В 12 модулях 59 тем на русском и английском, практика в Code Studio и итоговый проект с файлами.",
  publishedAt:"2026-11-24T07:11:50.000Z",
  readingMinutes:2
 }),
 Object.freeze({
  slug:"kursy-cpp-i-1c-obnovlenie-20261109",
  title:"Курсы C++ и 1С: от понятного объяснения к своей работе",
  summary:"151 тема на русском и английском: последовательное объяснение, пример с результатом, самопроверка и новая самостоятельная задача. Рассказываем, что изменилось в учебном пути Nexus.",
  publishedAt:"2026-11-09T04:17:32.949Z",
  readingMinutes:2
 }),
 Object.freeze({
  slug:"uyut-hronika-doma-kotoryy-zhdal-20261109",
  title:"«Уют»: хроника дома, который ждал",
  summary:"Делюсь своей книгой о доме с искусственным интеллектом, человеческой памяти и возвращении. Четыре книги в одном томе; полный авторский PDF на 159 страницах.",
  publishedAt:"2026-11-09T04:17:32.949Z",
  readingMinutes:2
 })
]);

export async function publishedEditorialPost(slug){
 const post=PUBLISHED_EDITORIAL_POSTS.find(item=>item.slug===slug);
 if(!post)return null;
 const {editorialArticleBodies}=await import('./blog-editorial-text.js');
 return {...post,body:editorialArticleBodies[slug]};
}
export function mergePublishedEditorialPosts(posts){
 const own=new Set(PUBLISHED_EDITORIAL_POSTS.map(post=>post.slug));
 return [...PUBLISHED_EDITORIAL_POSTS,...posts.filter(post=>!own.has(post.slug))];
}
export function editorialArticleMeta(slug){
 switch(slug){
  case 'polnyy-kurs-c17-v-nexus':
   return {category:'Новый курс',byline:team,links:[
    {href:'#course=c',label:'Открыть курс C17'},
    {href:'#course=c&lesson=c.first-program',label:'Перейти к первой программе'}
   ]};
  case 'kursy-cpp-i-1c-obnovlenie-20261109':
   return {category:'Обновление курсов',byline:team,coverTitle:'ОБНОВЛЁННАЯ АКАДЕМИЯ',coverNote:'Объяснение / Самопроверка / Практика',links:[
    {href:'#view=academy',label:'Перейти в Академию'},
    {href:'#course=cpp&lesson=cpp.data-types',label:'Открыть «Типы данных»'}
   ]};
  case 'uyut-hronika-doma-kotoryy-zhdal-20261109':
   return {category:'Авторская книга',byline:'Авторская публикация Akronikl',coverTitle:'УЮТ',coverNote:'Хроника дома, который ждал',links:[
    {href:publicRoot+'uyut-chronicle-bbef0a52dd5daff7.pdf',label:'Читать книгу · PDF, 45,4 МБ',external:true}
   ]};
  default:
   return null;
 }
}
