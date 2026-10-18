let field=null,appearance={density:1,speed:.5,motion:true,theme:'night'};
export function updateParticleAppearance(value){const reseed=value.density!==undefined&&value.density!==appearance.density;appearance={...appearance,...value};field?.refresh(reseed)}
const profiles={off:0,lite:70,balanced:130,high:190,ultra:270};
function autoProfile(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return'lite';
  const mobile=matchMedia('(max-width: 760px)').matches;
  const cores=navigator.hardwareConcurrency||4;
  return mobile||cores<=4?'lite':cores>=10?'high':'balanced';
}
export function startParticleField(requested='auto'){
  if(field)return updateParticleQuality(requested);
  const canvas=document.createElement('canvas');canvas.id='nexusParticles';canvas.className='nexus-particles';canvas.setAttribute('aria-hidden','true');document.body.prepend(canvas);
  const ctx=canvas.getContext('2d',{alpha:true});let raf=0,quality=requested==='auto'?autoProfile():requested,particles=[],mx=0,my=0,tx=0,ty=0,last=0,clock=0;
  const mobile=()=>matchMedia('(max-width: 760px)').matches;
  const seed=()=>{const n=Math.round((profiles[quality]??profiles[autoProfile()])*appearance.density);particles=Array.from({length:n},()=>{const z=.12+Math.pow(Math.random(),.72)*.88;const gold=Math.random()<.12;return{x:Math.random()*innerWidth,y:Math.random()*innerHeight,z,r:.5+Math.random()*(gold?1.35:1.1),vx:(Math.random()-.5)*(.025+.065*z),vy:-.012-Math.random()*(.055+.10*z),phase:Math.random()*Math.PI*2,gold,soft:Math.random()<.2}})};
  const schedule=()=>{if(!raf&&!document.hidden)raf=requestAnimationFrame(draw)};
  const resize=()=>{const d=Math.min(devicePixelRatio||1,mobile()?1.35:1.8);canvas.width=Math.max(1,Math.floor(innerWidth*d));canvas.height=Math.max(1,Math.floor(innerHeight*d));canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.setTransform(d,0,0,d,0,0);seed();schedule()};
  const pointer=ev=>{if(mobile()||!appearance.motion||appearance.speed===0)return;tx=(ev.clientX/innerWidth-.5)*18;ty=(ev.clientY/innerHeight-.5)*12};
  const draw=t=>{raf=0;const moving=appearance.motion&&appearance.speed>0&&quality!=='off'&&!document.hidden;const dt=Math.min(2.2,(t-last||16)/16.67);last=t;if(moving)clock+=dt*16.67*appearance.speed;mx+=(tx-mx)*.035;my+=(ty-my)*.035;const day=appearance.theme==='day';ctx.clearRect(0,0,innerWidth,innerHeight);for(const p of particles){if(moving){p.x+=p.vx*(.25+p.z)*dt*appearance.speed;p.y+=p.vy*(.25+p.z)*dt*appearance.speed;}if(p.y<-12){p.y=innerHeight+12;p.x=Math.random()*innerWidth}if(p.x<-12)p.x=innerWidth+12;if(p.x>innerWidth+12)p.x=-12;const pulse=.5+.5*Math.sin(clock*(.00028+.00022*p.z)+p.phase);const alpha=(.18+.4*p.z)*(.7+.3*pulse);const x=p.x+mx*p.z,y=p.y+my*p.z,color=day?(p.gold?'117,94,48':'46,85,117'):(p.gold?'255,221,151':'215,235,255');ctx.beginPath();ctx.arc(x,y,p.r*(.55+p.z*.55),0,Math.PI*2);ctx.fillStyle=`rgba(${color},${alpha})`;ctx.shadowBlur=day?0:(p.soft?10:4)*p.z;ctx.shadowColor=`rgba(${color},.25)`;ctx.fill();if(!day&&p.z>.72&&pulse>.82){ctx.beginPath();ctx.arc(x,y,p.r*.28,0,Math.PI*2);ctx.fillStyle='rgba(244,250,255,.72)';ctx.shadowBlur=2;ctx.fill()}}ctx.shadowBlur=0;if(moving&&appearance.density>0)raf=requestAnimationFrame(draw)};
  const visibility=()=>{last=0;if(document.hidden){cancelAnimationFrame(raf);raf=0}else schedule()};
  addEventListener('resize',resize,{passive:true});addEventListener('pointermove',pointer,{passive:true});document.addEventListener('visibilitychange',visibility);resize();
  field={canvas,refresh(reseed=false){canvas.hidden=quality==='off'||appearance.density===0;if(reseed)seed();schedule()},setQuality(q){const next=q==='auto'?autoProfile():q,reseed=next!==quality;quality=next;this.refresh(reseed)},destroy(){cancelAnimationFrame(raf);canvas.remove();removeEventListener('pointermove',pointer);removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibility);field=null}};field.refresh();return field;
}
export function updateParticleQuality(q='auto'){if(!field)return startParticleField(q);field.setQuality(q);return field}
