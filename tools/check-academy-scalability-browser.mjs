
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.env.NEXUS_REPO;
const json=async name=>JSON.parse(await readFile(path.join(root,name)));
const importRepo=name=>import(pathToFileURL(path.join(root,name)));
const {academyCatalogMarkup}=await importRepo('core/academy-catalog.js');
const {translator}=await importRepo('core/i18n.js');
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const catalog=await json('courses/catalog.json');
const cpp={
  manifest:await json('courses/cpp/manifest.json'),
  curriculum:await json('courses/cpp/curriculum.json'),
};
const prefs={uiLocale:'ru',courseLocale:'ru'};
const t=translator(await json('locales/ru/ui.json'));
const dataset=extra=>({count:catalog.courses.length+extra,courses:[
  ...catalog.courses,
  ...Array.from({length:extra},(_,i)=>({
    id:'perf-synthetic-'+(i+1),order:catalog.courses.length+i+1,
    title:{ru:'Синтетический курс '+(i+1),en:'Synthetic course '+(i+1)},
    category:'core',categoryTitle:{ru:'Ядро',en:'Core'},origin:'synthetic',status:'planned',
    route:'#view=academy',
  })),
]});
const args={prefs,t,cpp,academyViewFilter:{category:'all',availability:'all',query:''},visualIcon:()=>''};
const browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH,
  args:['--disable-background-networking','--no-proxy-server']});
const rows=[];
try{
 for(const [width,cpu] of [[1366,1],[390,3],[320,3]]){
  const page=await browser.newPage({viewport:{width,height:850}});
  await page.route('**/*',route=>route.abort());
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
  await cdp.send('Performance.enable');
  await page.setContent('<main id="sample"></main>');
  for(const extra of [0,200,950]){
   const courseData=dataset(extra);
   for(let repeat=1;repeat<=3;repeat++){
    const from=performance.now();
    const html=academyCatalogMarkup({...args,catalog:courseData});
    const markupMs=performance.now()-from;
    const view=await page.evaluate(html=>{
      const root=document.querySelector('#sample');
      const start=performance.now();
      root.innerHTML=html;
      const cards=root.querySelectorAll('[data-academy-course]').length;
      return {cards,mountMs:performance.now()-start};
    },html);
    assert.ok(view.cards>=extra);
    const {metrics}=await cdp.send('Performance.getMetrics');
    rows.push({width,cpu,repeat,courses:courseData.count,htmlBytes:Buffer.byteLength(html),
      markupMs:Math.round(markupMs*100)/100,mountMs:Math.round(view.mountMs*100)/100,cards:view.cards,
      jsHeapUsed:metrics.find(x=>x.name==='JSHeapUsedSize')?.value??null});
   }
  }
  await page.close();
 }
}finally{await browser.close();}
const groups=Object.groupBy(rows,row=>row.width+'/'+row.courses);
const median=v=>v.sort((a,b)=>a-b)[Math.floor(v.length/2)];
const summary=Object.fromEntries(Object.entries(groups).map(([key,rows])=>[key,{
  cards:rows[0].cards,htmlBytes:rows[0].htmlBytes,
  medianMarkupMs:median(rows.map(x=>x.markupMs)),medianMountMs:median(rows.map(x=>x.mountMs)),
  minMountMs:Math.min(...rows.map(x=>x.mountMs)),maxMountMs:Math.max(...rows.map(x=>x.mountMs)),
  medianJSHeap:median(rows.map(x=>x.jsHeapUsed)),
}]));
await writeFile(process.env.NEXUS_PERF_REPORT,JSON.stringify({
  status:'PASS',source:process.env.NEXUS_PERF_SOURCE,
  scope:'Actual academy markup with synthetic planned course records; isolated DOM insert, no network, routes, learner data or full app layout.',
  summary,rows,
},null,2)+'\n');
console.log(JSON.stringify(summary));
