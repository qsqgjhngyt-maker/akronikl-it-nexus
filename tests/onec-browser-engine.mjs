export const ONEC_BROWSER_ENGINE=process.env.NEXUS_BROWSER_ENGINE||'chromium';
if(!['chromium','webkit'].includes(ONEC_BROWSER_ENGINE))throw Error('ONEC_BROWSER_ENGINE');
export function launchOnecBrowser(playwright){return playwright[ONEC_BROWSER_ENGINE].launch({headless:true,...(ONEC_BROWSER_ENGINE==='chromium'&&process.env.NEXUS_CHROME_PATH?{executablePath:process.env.NEXUS_CHROME_PATH}:{})})}
export async function goOnec(page,url){
 const response=await page.goto(url),p=new URL(url).hash.slice(1),args=new URLSearchParams(p),expected={course:args.get('course')||'1c-enterprise',locale:args.get('locale')||'ru',topic:args.get('lesson'),final:args.get('assessment')==='final'};
 // Hash navigation не ждёт async render. Ждём именно новый урок/обзор,
 // иначе старый select может быть заменён после изменения фильтра в WebKit.
 await page.waitForFunction(r=>{const current=document.querySelector('.course-tabs a[aria-current="page"]'),q=new URLSearchParams((current?.getAttribute('href')||'').slice(1));if(q.get('course')!==r.course||q.get('locale')!==r.locale||document.documentElement.lang!==r.locale)return false;const lesson=document.querySelector('[data-lesson]');if(r.topic)return lesson?.dataset.lesson===r.topic&&lesson.lang===r.locale;if(lesson)return false;const final=document.querySelector('[data-final-assessment]');return r.final?final?.dataset.finalAssessment===r.course&&!!final.querySelector('[data-final-form]'):!final;},expected);return response;
}
export async function createOfflineOnecContext(browser,options,proofUrl){
 const webkit=ONEC_BROWSER_ENGINE==='webkit',context=await browser.newContext({...options,offline:!webkit});let blocked=0;
 // WebKit Windows offline emulation блокирует даже пустой file:// документ.
 // Оставляем file://, но запрещаем весь HTTP(S); отрицательный контроль обязателен.
 if(webkit)await context.route(/^https?:\//,route=>{blocked++;return route.abort('internetdisconnected')});
 const probe=await context.newPage();let rejected=false;try{await probe.goto(proofUrl,{timeout:5000})}catch(error){rejected=webkit?blocked===1:/INTERNET_DISCONNECTED/i.test(error.message)}finally{await probe.close()}
 if(!rejected){await context.close();throw Error('OFFLINE_NETWORK_DENIAL_NOT_PROVED')}return context;
}
