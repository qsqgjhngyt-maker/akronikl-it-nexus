// Короткий начальный запас, а не ожидание загрузки всего файла/приложения.
// Нативный плеер сохраняет один decoder и обычные HTTP Range requests.
export function waitForIntroBuffer(video,signal){
 const source=video.src,started=performance.now();let lastEnd=0,lastProgress=started,timer,done=false;
 return new Promise(resolve=>{
  const events=['loadedmetadata','loadeddata','progress','canplay','canplaythrough','error','emptied'];
  const finish=value=>{if(done)return;done=true;clearTimeout(timer);for(const event of events)video.removeEventListener(event,check);document.removeEventListener('visibilitychange',check);signal?.removeEventListener('abort',abort);resolve(value)};
  const abort=()=>finish(false);
  const check=()=>{
   clearTimeout(timer);if(done)return;if(signal?.aborted||video.src!==source||video.error){finish(false);return}if(document.hidden)return;
   const now=performance.now(),duration=video.duration;let end=0;for(let i=0;i<video.buffered.length;i++)if(video.buffered.start(i)<=video.currentTime+.05)end=Math.max(end,video.buffered.end(i));
   if(end>lastEnd+.02){lastEnd=end;lastProgress=now}
   const ahead=Math.max(0,end-video.currentTime),elapsed=Math.max(.1,(now-started)/1000),rate=end/elapsed;
   const projected=rate>0?(duration-end)/rate:Infinity;
   const complete=Number.isFinite(duration)&&end>=duration-.08;
   const reserve=ahead>=Math.min(2.5,duration*.35)&&projected<=duration*.9;
   // Некоторые браузеры ограничивают preload. Если они остановили его с уже
   // декодированным кадром, передаём управление штатному media engine.
   const nativePreloadCap=video.readyState>=2&&ahead>.05&&now-lastProgress>=1100;
   if(video.readyState>=2&&(complete||reserve||nativePreloadCap)){finish(true);return}
   timer=setTimeout(check,120);
  };
  for(const event of events)video.addEventListener(event,check);document.addEventListener('visibilitychange',check);signal?.addEventListener('abort',abort,{once:true});check();
 });
}
