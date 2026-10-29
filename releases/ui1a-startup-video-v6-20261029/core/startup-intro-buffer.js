// Решение о старте основано на запасе кадров и скорости загрузки, а не на
// времени первого кадра. Пауза сети сама по себе НЕ является preload cap.
export function introBufferReady({duration,currentTime=0,end=0,elapsed=0,idleFor=0,readyState=0,networkState=0}){
 if(readyState<2)return false;
 const ahead=Math.max(0,end-currentTime),remaining=duration-currentTime;
 if(Number.isFinite(duration)&&duration>0&&end>=duration-.08)return true;
 const rate=ahead/Math.max(.1,elapsed/1000);
 const projected=rate>0?(duration-end)/rate:Infinity;
 if(Number.isFinite(remaining)&&ahead>=Math.min(1.25,remaining*.35)&&projected<=Math.max(0,remaining-.5))return true;
 // NETWORK_IDLE означает, что сам браузер остановил preload. Не начинаем
 // почти пустой ролик просто потому, что сеть не присылала bytes 1,1 секунды.
 return networkState===1&&readyState>=3&&ahead>=.5&&idleFor>=1100;
}
export function waitForIntroBuffer(video,signal){
 const source=video.src;let started=performance.now(),lastEnd=0,lastProgress=started,timer,done=false,hiddenAt=null;
 return new Promise(resolve=>{
  const events=['loadedmetadata','loadeddata','progress','canplay','canplaythrough','suspend','error','emptied'];
  const finish=value=>{if(done)return;done=true;clearTimeout(timer);for(const event of events)video.removeEventListener(event,check);document.removeEventListener('visibilitychange',check);signal?.removeEventListener('abort',abort);resolve(value)};
  const abort=()=>finish(false);
  const check=()=>{
   clearTimeout(timer);if(done)return;
   if(signal?.aborted||video.src!==source||video.error){finish(false);return}
   const now=performance.now();
   if(document.hidden){hiddenAt??=now;return}
   if(hiddenAt!==null){const pause=now-hiddenAt;started+=pause;lastProgress+=pause;hiddenAt=null}
   let end=0;for(let i=0;i<video.buffered.length;i++)if(video.buffered.start(i)<=video.currentTime+.05&&video.buffered.end(i)>video.currentTime)end=Math.max(end,video.buffered.end(i));
   if(end>lastEnd+.02){lastEnd=end;lastProgress=now}
   if(introBufferReady({duration:video.duration,currentTime:video.currentTime,end,elapsed:now-started,idleFor:now-lastProgress,readyState:video.readyState,networkState:video.networkState})){finish(true);return}
   if(now-started>=6000){finish(false);return}
   timer=setTimeout(check,100);
  };
  for(const event of events)video.addEventListener(event,check);document.addEventListener('visibilitychange',check);signal?.addEventListener('abort',abort,{once:true});check();
 });
}
