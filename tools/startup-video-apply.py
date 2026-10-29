"""Применяет только проверенную поправку runtime; не публикует production."""
from pathlib import Path
import hashlib
ROOT=Path(__file__).resolve().parent.parent
p=ROOT/'core/startup-intro.js'
b=p.read_bytes();before='b347e4688fc2666b9b11f3e347f2918da617761eebab2b7001b872e06245fd6e';after='94fc9d4f6c2c0aadfb05173cf4db4333933f6740896bfbf56a46fae946fa31d3'
h=hashlib.sha256(b).hexdigest()
if h not in (before,after):raise ValueError('Runtime изменился: требуется review, перезапись запрещена')
if h==before:
 s=b.decode()
 s=s.replace("import {IntroSequence} from './startup-intro-sequence.js';\n",'').replace("import {mobileIntroURL} from './startup-intro-mobile.js';\n",'')
 a=s.index("  if(variant==='mobile'){",s.index('const makePlayer='));z=s.index("  const v=document.createElement('video');",a)
 s=s[:a]+"  // Один непрерывный поток и один decoder для каждого варианта ролика.\n"+s[z:]
 s=s.replace("const syncLogo=()=>{root.dataset.logoVisible=String(variant==='mobile'&&Number.isFinite(video.duration)&&video.currentTime>=Math.max(0,video.duration-2))};","const syncLogo=()=>{const visible=String(variant==='mobile'&&Number.isFinite(video.duration)&&video.currentTime>=Math.max(0,video.duration-2));if(root.dataset.logoVisible!==visible)root.dataset.logoVisible=visible};")
 s=s.replace("const mobile=variant==='mobile';poster.style.visibility=mobile?'hidden':'';\n  poster.src=mobile?new URL('../intro-media/cinematic-v5/mobile-start.jpg',import.meta.url).href:media(variant+'.jpg');\n  if(mobile){const source=poster.src;Promise.resolve(poster.decode?.()).then(()=>{if(!removed&&poster.src===source)poster.style.visibility=''}).catch(()=>{if(poster.src===source)poster.remove()})}","poster.style.visibility='hidden';poster.src=media(variant+'.jpg');\n  const source=poster.src;Promise.resolve(poster.decode?.()).then(()=>{if(!removed&&poster.src===source)poster.style.visibility=''}).catch(()=>{if(poster.src===source)poster.remove()});")
 s=s.replace("poster.alt='';poster.fetchPriority","poster.alt='';poster.decoding='async';poster.fetchPriority")
 s=s.replace("if(played||variant==='mobile'){","if(played){")
 s=s.replace("void waitForIntroBuffer(target,playerEvents.signal).then(ready=>{if(preparingSource===source)preparingSource='';if(ready&&target===video&&!closing&&!document.hidden&&video.src===source&&root.dataset.playback!=='poster')video.play()?.catch(e=>{if(e.name!=='AbortError')fallback()})});","void waitForIntroBuffer(target,playerEvents.signal).then(ready=>{if(preparingSource===source)preparingSource='';if(target!==video||closing||document.hidden||video.src!==source||root.dataset.playback==='poster')return;if(!ready){fallback();return}video.play()?.catch(e=>{if(e.name!=='AbortError')fallback()})});")
 s=s.replace("if(video.requestVideoFrameCallback)frameCallback=video.requestVideoFrameCallback(trackFrame);","if(variant==='mobile'&&video.requestVideoFrameCallback)frameCallback=video.requestVideoFrameCallback(trackFrame);")
 s=s.replace("fallback()},10000)","fallback()},2000)")
 s=s.replace("const sourceURL=()=>variant==='mobile'?mobileIntroURL(selected[0],mediaBase):introVideoURL(variant,selected[0],mediaBase);","const sourceURL=()=>introVideoURL(variant,selected[0],mediaBase);")
 if hashlib.sha256(s.encode()).hexdigest()!=after:raise ValueError('Результат не совпал с проверенной поправкой')
 p.write_text(s)
p=ROOT/'tests/startup-intro-launch-browser-check.mjs';s=p.read_text();s=s.replace('cinematic-v4\\/(?:desktop|mobile)','(?:cinematic-v4|cinematic-v6)\\/(?:desktop|mobile)');p.write_text(s)
print('Runtime и точный CDN allowlist браузерного теста проверены. Production не изменён.')
