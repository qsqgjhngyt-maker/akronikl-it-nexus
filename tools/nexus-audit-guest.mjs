import assert from 'node:assert/strict';
import {availableCourseCards,courseCardFacts,topicsCountLabel} from '../core/academy-course-cards.js';

const css=`<style data-guest-presentation>
.entry-hero .hero-description{max-width:37rem;color:#d6e2ee}
.entry-shell .explore-link{display:inline-flex;align-items:center;min-height:44px}
.guest-facts{display:flex;flex-wrap:wrap;gap:.55rem;margin:1rem 0;padding:0;list-style:none}
.guest-facts li{padding:.35rem .68rem;border-radius:.55rem;background:#172d3f;border:1px solid #426678;color:#e2f2f4;font-size:.84rem}
.guest-sample{margin:2rem 0;padding:clamp(1rem,3vw,2rem);background:#142539;border:1px solid #38566b;border-radius:1rem}
.guest-sample h2,.guest-roadmap h2{margin:0 0 .75rem;font-size:clamp(1.45rem,3vw,2.2rem)}
.guest-sample p,.guest-roadmap p,.entry-shell .possibility p{color:#d0dce8}
.guest-sample-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}
.guest-sample figure{margin:0;min-width:0}
.guest-sample img{display:block;width:100%;height:auto;border:1px solid #486479;border-radius:.7rem;background:#0b1826}
.guest-sample figcaption{margin-top:.55rem;color:#e3edf7;font-size:.9rem}
.guest-course-name{margin-top:.25rem}
.entry-shell .possibility .guest-course-facts{font-size:.9rem;color:#b4efdd}
.guest-roadmap{margin:1.8rem 0}
.guest-footer-links{display:flex;flex-wrap:wrap;align-items:center;gap:.9rem;margin:.8rem 0;color:#d6e5f0;font-size:.875rem}
.guest-footer-links a{color:#b4efdd;text-decoration:underline;text-underline-offset:.2rem}
.entry-shell :is(a,button):focus-visible{outline:2px solid #a6f2d9;outline-offset:4px}
.guest-sample,.guest-roadmap{scroll-margin-top:1rem}
@media(max-width:710px){.guest-sample-grid{grid-template-columns:1fr}.guest-facts{gap:.4rem}.guest-footer-links a{display:inline-flex;align-items:center;min-height:44px}}
@media(prefers-reduced-motion:reduce){.entry-shell :is(a,button){transition:none}html{scroll-behavior:auto}}
</style>`;
const repo='https://github.com/qsqgjhngyt-maker/akronikl-it-nexus';

export function auditGuestPresentation(html,{generation,version}){
  assert.match(generation,/^ui1a-[a-z0-9-]+$/);
  assert.match(version,/^[a-zA-Z0-9.-]+$/);
  assert.match(html,/<p class="hero-description">[\s\S]*?<\/p>/);
  assert.match(html,/<section class="possibilities" id="possibilities"[\s\S]*?<\/section>/);
  const names=Object.values(availableCourseCards),topics=names.reduce((sum,item)=>sum+item.topics,0);
  const overview=`<p class="hero-description">Изучайте C++ и 1С на реальных задачах. Разберите урок, проверьте программу и соберите свой проект.</p>
    <ul class="guest-facts"><li>${topicsCountLabel(topics,'ru')} · RU / EN</li><li>3 курса</li><li>Бесплатное обучение</li><li>Альфа-версия</li></ul>`;
  const media='/releases/'+generation+'/assets/audit-ux/';
  const possibilities=`<section class="guest-sample" id="lesson-preview" aria-labelledby="guestSampleTitle">
    <h2 id="guestSampleTitle">Как выглядит урок</h2>
    <p>В теме «Типы данных C++» ученик сначала проверяет, где целочисленное деление теряет половину минуты, затем исправляет расчёт в редакторе.</p>
    <div class="guest-sample-grid">
      <figure><img src="${media}cpp-lesson.jpg" loading="lazy" decoding="async" alt="Урок сравнивает целочисленный и дробный результат деления."><figcaption>Объяснение на примере</figcaption></figure>
      <figure><img src="${media}cpp-practice.jpg" loading="lazy" decoding="async" alt="В Code Studio ученик вводит выражение для среднего с дробной частью."><figcaption>Самостоятельная работа в Code Studio</figcaption></figure>
    </div>
  </section>
  <section class="possibilities" id="possibilities" aria-label="Доступные курсы">
    ${names.map(item=>`<article class="possibility"><h2 class="guest-course-name">${item.name.ru}</h2><p class="guest-course-facts">${courseCardFacts(item,'ru')}</p><p>${item.outcome.ru}</p></article>`).join('')}
  </section>
  <section class="guest-roadmap" id="guest-roadmap" aria-labelledby="guestRoadmapTitle">
    <h2 id="guestRoadmapTitle">Что доступно сейчас</h2>
    <p>Уроки можно загрузить на устройство и читать без сети. Для работы с учебной базой 1С нужен установленный клиент 1С:Предприятие.</p>
    <p>Следующие шаги — развитие навигации по курсам, Карта навыков и проверка удобства на мобильных устройствах.</p>
  </section>`;
  const footer=`<nav class="guest-footer-links" aria-label="О проекте">
    <span>Версия ${version}</span><a href="${repo}">Исходники на GitHub</a><a href="${repo}/issues">Обратная связь</a>
    <a href="${repo}#права-и-лицензирование">Условия использования</a>
  </nav>`;
  return html.replace('</head>',css+'</head>')
    .replace(/<p class="hero-description">[\s\S]*?<\/p>/,overview)
    .replace(/<a class="explore-link" href="#possibilities">[\s\S]*?<\/a>/,
      '<a class="explore-link" href="#lesson-preview"><span>Посмотреть пример урока</span><span class="explore-arrow" aria-hidden="true">↓</span></a>')
    .replace(/<section class="possibilities" id="possibilities"[\s\S]*?<\/section>/,possibilities)
    .replace('</footer>','</footer>'+footer);
}
