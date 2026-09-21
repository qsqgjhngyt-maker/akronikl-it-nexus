let field=null;
const profiles={off:0,lite:34,balanced:72,high:116,ultra:168};
function autoProfile(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return'lite';
  const mobile=matchMedia('(max-width: 760px)').matches;
  const cores=navigator.hardwareConcurrency||4;
  return mobile||cores<=4?'lite':cores>=10?'high':'balanced';
}
export function startParticleField(requested='auto'){
  if(field)return updateParticleQuality(requested);
  const canvas=document.createElement('canvas');canvas.id='nexusParticles';canvas.className='nexus-particles';canvas.setAttribute('aria-hidden','true');document.body.prepend(canvas);
  const ctx=canvas.getContext('2d',{alpha:true});let raf=0,quality=requested==='auto'?autoProfile():requested,particles=[],mx=0,my=0,tx=0,ty=0,last=0;
  const mobile=()=>matchMedia('(max-width: 760px)').matches;
  const seed=()=>{const n=profiles[quality]??profiles[autoProfile()];particles=Array.from({length:n},(_,i)=>{const z=.12+Math.pow(Math.random(),.72)*.88;const gold=Math.random()<.18;return{x:Math.random()*innerWidth,y:Math.random()*innerHeight,z,r:.22+Math.random()*(gold?1.55:1.05),vx:(Math.random()-.5)*(.025+.065*z),vy:-.012-Math.random()*(.055+.10*z),phase:Math.random()*Math.PI*2,gold,soft:Math.random()<.32}})};
  const resize=()=>{const d=Math.min(devicePixelRatio||1,mobile()?1.35:1.8);canvas.width=Math.max(1,Math.floor(innerWidth*d));canvas.height=Math.max(1,Math.floor(innerHeight*d));canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.setTransform(d,0,0,d,0,0);seed()};
  const pointer=ev=>{if(mobile())return;tx=(ev.clientX/innerWidth-.5)*18;ty=(ev.clientY/innerHeight-.5)*12};
  const draw=t=>{const dt=Math.min(2.2,(t-last||16)/16.67);last=t;mx+=(tx-mx)*.035;my+=(ty-my)*.035;ctx.clearRect(0,0,innerWidth,innerHeight);for(const p of particles){p.x+=p.vx*(.25+p.z)*dt;p.y+=p.vy*(.25+p.z)*dt;if(p.y<-12){p.y=innerHeight+12;p.x=Math.random()*innerWidth}if(p.x<-12)p.x=innerWidth+12;if(p.x>innerWidth+12)p.x=-12;const pulse=.5+.5*Math.sin(t*(.00028+.00022*p.z)+p.phase);const alpha=(.035+.28*p.z)*(.42+.58*pulse);const x=p.x+mx*p.z,y=p.y+my*p.z;ctx.beginPath();ctx.arc(x,y,p.r*(.42+p.z),0,Math.PI*2);ctx.fillStyle=p.gold?`rgba(255,211,126,${alpha})`:`rgba(215,232,255,${alpha})`;ctx.shadowBlur=(p.soft?15:7)*p.z;ctx.shadowColor=p.gold?'rgba(255,194,83,.34)':'rgba(153,199,255,.30)';ctx.fill();if(p.z>.72&&pulse>.82){ctx.beginPath();ctx.arc(x,y,p.r*.28,0,Math.PI*2);ctx.fillStyle=p.gold?'rgba(255,241,205,.48)':'rgba(244,250,255,.42)';ctx.shadowBlur=4;ctx.fill()}}ctx.shadowBlur=0;raf=requestAnimationFrame(draw)};
  addEventListener('resize',resize,{passive:true});addEventListener('pointermove',pointer,{passive:true});resize();raf=requestAnimationFrame(draw);
  field={canvas,setQuality(q){quality=q==='auto'?autoProfile():q;canvas.hidden=quality==='off';seed()},destroy(){cancelAnimationFrame(raf);canvas.remove();removeEventListener('pointermove',pointer);field=null}};return field;
}
export function updateParticleQuality(q='auto'){if(!field)return startParticleField(q);field.setQuality(q);return field}
