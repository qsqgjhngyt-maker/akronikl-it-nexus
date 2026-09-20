let field=null;
const profiles={off:0,lite:28,balanced:58,high:90,ultra:130};
function autoProfile(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return'lite';
  const mobile=matchMedia('(max-width: 760px)').matches;
  const cores=navigator.hardwareConcurrency||4;
  return mobile||cores<=4?'lite':'balanced';
}
export function startParticleField(requested='auto'){
  if(field)return updateParticleQuality(requested);
  const canvas=document.createElement('canvas');canvas.id='nexusParticles';canvas.className='nexus-particles';canvas.setAttribute('aria-hidden','true');document.body.prepend(canvas);
  const ctx=canvas.getContext('2d',{alpha:true});let raf=0,quality=requested==='auto'?autoProfile():requested,particles=[];
  const resize=()=>{const d=Math.min(devicePixelRatio||1,1.75);canvas.width=Math.floor(innerWidth*d);canvas.height=Math.floor(innerHeight*d);canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.setTransform(d,0,0,d,0,0);seed()};
  const seed=()=>{const n=profiles[quality]??profiles[autoProfile()];particles=Array.from({length:n},(_,i)=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,z:.3+Math.random()*.7,r:.35+Math.random()*1.35,vx:(Math.random()-.5)*.05,vy:-.025-Math.random()*.12,phase:Math.random()*Math.PI*2,gold:i%5===0}))};
  const draw=t=>{ctx.clearRect(0,0,innerWidth,innerHeight);for(const p of particles){p.x+=p.vx*(.45+p.z);p.y+=p.vy*(.45+p.z);if(p.y<-8){p.y=innerHeight+8;p.x=Math.random()*innerWidth}if(p.x<-8)p.x=innerWidth+8;if(p.x>innerWidth+8)p.x=-8;const tw=.45+.45*Math.sin(t*.00055+p.phase);const a=(.10+.32*p.z)*tw;ctx.beginPath();ctx.arc(p.x,p.y,p.r*(.5+p.z),0,Math.PI*2);ctx.fillStyle=p.gold?`rgba(255,210,128,${a})`:`rgba(210,228,255,${a})`;ctx.shadowBlur=8*p.z;ctx.shadowColor=p.gold?'rgba(255,195,90,.32)':'rgba(155,200,255,.28)';ctx.fill()}ctx.shadowBlur=0;raf=requestAnimationFrame(draw)};
  addEventListener('resize',resize,{passive:true});resize();raf=requestAnimationFrame(draw);
  field={canvas,setQuality(q){quality=q==='auto'?autoProfile():q;canvas.hidden=quality==='off';seed()},destroy(){cancelAnimationFrame(raf);canvas.remove();field=null}};return field;
}
export function updateParticleQuality(q='auto'){if(!field)return startParticleField(q);field.setQuality(q);return field}
