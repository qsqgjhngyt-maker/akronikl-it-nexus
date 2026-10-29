// Непрерывный запас от текущего кадра: дальний диапазон не скрывает пробел.
export function introBufferedAhead(video){
 const time=Number(video.currentTime)||0;
 try{for(let i=0;i<video.buffered.length;i++){
  if(video.buffered.start(i)<=time+.05&&video.buffered.end(i)>time)return video.buffered.end(i)-time;
 }}catch{/* Диапазоны могут измениться во время смены src. */}
 return 0;
}
// Ограниченное ожидание. Отмена/смена src полностью удаляет обработчики.
export function waitForIntroBuffer(video,signal,{minimum=1.5,timeout=6000,minReadyState=2,minWaitMs=0}={}){
 const source=video.src;let lastTick=performance.now(),visibleMs=0,lastAhead=0,lastProgress=0,timer,done=false;
 return new Promise(resolve=>{
  const events=['loadedmetadata','loadeddata','progress','canplay','canplaythrough','suspend','error','emptied'];
  const finish=value=>{if(done)return;done=true;clearTimeout(timer);for(const event of events)video.removeEventListener(event,check);document.removeEventListener('visibilitychange',visibility);signal?.removeEventListener('abort',abort);resolve(value)};
  const abort=()=>finish(false);
  const check=()=>{
   clearTimeout(timer);if(done)return;
   if(signal?.aborted||video.src!==source||video.error){finish(false);return}
   const now=performance.now(),delta=Math.max(0,now-lastTick);lastTick=now;
   if(document.hidden)return;
   // Не засчитываем пребывание в фоновой вкладке как время загрузки.
   visibleMs+=delta;
   const ahead=introBufferedAhead(video),time=Number(video.currentTime)||0,duration=Number(video.duration),remaining=duration-time;
   if(ahead>lastAhead+.02){lastAhead=ahead;lastProgress=visibleMs}
   const finite=Number.isFinite(remaining)&&remaining>0,complete=finite&&ahead>=remaining-.08;
   const reserve=finite?Math.min(minimum,remaining):minimum;
   const rate=ahead/Math.max(.1,visibleMs/1000);
   const predicted=finite&&rate>0?Math.max(0,remaining-ahead)/rate:Infinity;
   const sustained=ahead>=reserve&&(video.readyState>=4||(finite&&predicted<=remaining*.8));
   // NETWORK_IDLE + HAVE_FUTURE_DATA: реальный лимит preload, не сетевая пауза.
   // Запаса в 50 мс больше недостаточно для запуска.
   const nativeCap=video.networkState===1&&video.readyState>=3&&ahead>=Math.min(.75,finite?remaining:.75)&&visibleMs-lastProgress>=1100;
   if(visibleMs>=minWaitMs&&video.readyState>=minReadyState&&(complete||sustained||nativeCap)){finish(true);return}
   if(visibleMs>=timeout){finish(false);return}
   timer=setTimeout(check,100);
  };
  const visibility=()=>{lastTick=performance.now();check()};
  // Используется отдельный обработчик, чтобы фоновая пауза не увеличила счётчик.
  for(const event of events)video.addEventListener(event,check);
  document.addEventListener('visibilitychange',visibility);
  signal?.addEventListener('abort',abort,{once:true});check();
 });
}
