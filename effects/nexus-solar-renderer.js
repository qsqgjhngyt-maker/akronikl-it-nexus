// Yaw turns around the vertical world axis; pitch turns around the camera's right axis.
export function rotation(yaw,pitch){const c=Math.cos(yaw),s=Math.sin(yaw),cx=Math.cos(pitch),sx=Math.sin(pitch);return new Float32Array([c,s*sx,-s*cx,0,cx,sx,s,-c*sx,c*cx]);}
export function planeRotation(tilt,node=0){const c=Math.cos(node),s=Math.sin(node),ct=Math.cos(tilt),st=Math.sin(tilt);return new Float32Array([c,s,0,-s*ct,c*ct,st,s*st,-c*st,ct]);}
function multiply(a,b){const out=new Float32Array(9);for(let col=0;col<3;col++)for(let row=0;row<3;row++)for(let k=0;k<3;k++)out[col*3+row]+=a[k*3+row]*b[col*3+k];return out;}
export function orbitPosition(angle,radius,tilt=0,node=0){const x=Math.cos(angle)*radius,y=Math.sin(angle)*radius*Math.cos(tilt),c=Math.cos(node),s=Math.sin(node);return [c*x-s*y,s*x+c*y,Math.sin(angle)*radius*Math.sin(tilt)];}
export function projectPoint(point,view,width,height){
  const p=point.map((v,i)=>v-view.target[i]),m=view.rotation,x=m[0]*p[0]+m[3]*p[1]+m[6]*p[2],y=m[1]*p[0]+m[4]*p[1]+m[7]*p[2],z=m[2]*p[0]+m[5]*p[1]+m[8]*p[2],depth=view.distance-z,scale=depth>.1?height*1.18/depth:0;
  return {x:width/2+x*scale,y:height*(view.centerY??.5)-y*scale,depth,scale,visible:depth>.1};
}
// Distant shells give stars real parallax without crowding the Academy's planets.
const random=(i,salt)=>{const n=Math.sin((i+1)*127.1+salt*311.7)*43758.5453;return n-Math.floor(n);};
const dust=Array.from({length:6144},(_,i)=>{const y=random(i,1)*2-1,angle=i*2.3999632297,radius=28+random(i,2)*75,r=Math.sqrt(1-y*y),bright=random(i,3);return {position:[Math.cos(angle)*r*radius,y*radius,Math.sin(angle)*r*radius],size:bright>.94?4.1:1.45+bright*1.5,brightness:.38+bright*.62,phase:random(i,4)*Math.PI*2};});
const starCount=(width,height,amount)=>Math.min(dust.length,Math.round(Math.min(3600,Math.max(2200,width*height/450))*amount));
const vertex=`
attribute vec3 aPosition;attribute vec3 aNormal;
uniform mat3 uView;uniform mat3 uBody;uniform vec3 uOffset;uniform vec3 uTarget;uniform float uSize;uniform float uAspect;uniform float uDistance;uniform float uCenterY;uniform float uDensity;uniform float uStyle;
varying vec3 vNormal;varying vec3 vSurface;varying vec3 vPosition;varying vec3 vStar;varying vec2 vFrame;
void main(){vSurface=aPosition;vStar=aNormal;vNormal=uView*uBody*aNormal;vPosition=uView*(uOffset-uTarget+uBody*aPosition*uSize);float depth=uDistance-vPosition.z;gl_Position=vec4(vPosition.x*2.36/uAspect,vPosition.y*2.36+uCenterY*depth,1.002*depth-.2002,depth);vFrame=gl_Position.xy/gl_Position.w;gl_PointSize=(uStyle>5.5?clamp(aNormal.x*(.72+45./max(depth,.2)),1.7,6.5):clamp(18./max(depth,.2),.8,4.))*uDensity;}`;
const fragment=`
precision highp float;
uniform vec3 uColor;uniform vec3 uLight;uniform float uStyle;uniform float uTerrain;uniform float uTime;uniform float uDustTime;uniform float uDistance;uniform float uOpacity;
varying vec3 vNormal;varying vec3 vSurface;varying vec3 vPosition;varying vec3 vStar;varying vec2 vFrame;
void main(){
  float depth=uDistance-vPosition.z;
  if(uStyle>5.5){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float glow=exp(-d*d*4.5);float edge=smoothstep(0.,.08,min(1.-abs(vFrame.x),1.-abs(vFrame.y)));float pulse=.82+.18*sin(vStar.z+uDustTime*.65);vec3 color=mix(vec3(.76,.87,1.),vec3(1.,.87,.67),step(5.84,vStar.z));gl_FragColor=vec4(color,uOpacity*vStar.y*glow*pulse*edge);return;}
  if(uStyle>4.5){float r=length(vSurface.xy);float bands=.55+.45*sin(r*92.);float edge=smoothstep(1.4,1.5,r)*(1.-smoothstep(2.2,2.3,r));gl_FragColor=vec4(uColor*(.65+.35*bands),uOpacity*bands*edge);return;}
  if(uStyle>.5&&uStyle<1.5){float fade=clamp(4./max(depth,.1),.24,1.35);gl_FragColor=vec4(uColor,uOpacity*fade);return;}
  vec3 p=normalize(vSurface),n=normalize(vNormal),eye=normalize(vec3(0.,0.,uDistance)-vPosition);
  float noise=sin(p.x*17.+sin(p.z*12.))*sin(p.y*13.-p.z*7.);
  float continents=smoothstep(-.15,.4,sin(p.x*7.+sin(p.z*5.))*cos(p.y*8.-p.z*3.));
  float cloud=smoothstep(.35,.9,sin(p.x*21.+p.z*17.)*sin(p.y*19.-p.z*12.));
  float rim=pow(1.-max(dot(n,eye),0.),3.);
  if(uStyle<.5){float fire=.6+.4*sin(p.y*15.+noise*2.+uTime*.2);gl_FragColor=vec4(mix(vec3(.53,.86,.76),vec3(1.,.92,.71),fire)+rim*.15,1.);return;}
  if(uStyle>3.5){gl_FragColor=vec4(uColor*1.1,rim*.32*uOpacity);return;}
  vec3 light=normalize(uLight);float diffuse=max(dot(n,light),0.);float fill=max(dot(n,normalize(vec3(-.25,.35,1.))),0.);
  float bands=.5+.5*sin(p.y*29.+sin(p.z*8.)*.75);
  vec3 surface=uColor*(.52+noise*.15+continents*.3);
  if(uTerrain>.5&&uTerrain<1.5){surface=mix(mix(vec3(.04,.14,.23),uColor*.32,.45),uColor*(.62+noise*.12),continents);surface=mix(surface,vec3(.83,.93,.99),cloud*.3);}
  if(uTerrain>1.5&&uTerrain<2.5)surface=uColor*(.35+bands*.57+noise*.06);
  if(uTerrain>2.5){surface=mix(uColor*.5,vec3(.72,.86,.95),continents*.45+cloud*.18);}
  float spec=pow(max(dot(n,normalize(light+eye)),0.),uTerrain>1.5?48.:90.);
  vec3 color=surface*(.07+diffuse*1.15+fill*.16)+vec3(.8,.95,1.)*spec*(uTerrain>.5&&uTerrain<1.5?.7:.22)+uColor*rim*.13;
  gl_FragColor=vec4(color,uOpacity);
}`;
function meshes(){
  const vertices=[],indices=[],segments=48,rings=28;
  for(let i=0;i<=segments;i++)for(let j=0;j<=rings;j++){const u=i/segments*Math.PI*2,v=j/rings*Math.PI,p=[Math.cos(u)*Math.sin(v),Math.cos(v),Math.sin(u)*Math.sin(v)];vertices.push(...p,...p);}
  for(let i=0;i<segments;i++)for(let j=0;j<rings;j++){const a=i*(rings+1)+j,b=a+rings+1;indices.push(a,b,a+1,b,b+1,a+1);}
  const circle=[],annulus=[],annulusIndices=[];for(let i=0;i<=192;i++){const a=i/192*Math.PI*2;circle.push(Math.cos(a),Math.sin(a),0,0,0,1);for(const r of [1.4,2.3])annulus.push(Math.cos(a)*r,Math.sin(a)*r,0,0,0,1);if(i<192){const n=i*2;annulusIndices.push(n,n+1,n+2,n+1,n+3,n+2);}}
  return {sphere:new Float32Array(vertices),indices:new Uint16Array(indices),circle:new Float32Array(circle),annulus:new Float32Array(annulus),annulusIndices:new Uint16Array(annulusIndices),dust:new Float32Array(dust.flatMap(p=>[...p.position,p.size,p.brightness,p.phase]))};
}
function fallbackRenderer(canvas){
  const ctx=canvas.getContext('2d');if(!ctx)return {kind:'none',draw(){},destroy(){}};
  return {kind:'canvas',draw(bodies,orbits,view,density,time,dustAmount=1,dustTime=time){
    const width=canvas.clientWidth,height=canvas.clientHeight;if(width<=0||height<=0)return;
    const w=Math.round(width*density),h=Math.round(height*density);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}ctx.setTransform(density,0,0,density,0,0);ctx.clearRect(0,0,width,height);
    for(let i=0,n=starCount(width,height,dustAmount);i<n;i++){const star=dust[i],p=projectPoint(star.position,view,width,height);if(!p.visible||p.x<0||p.x>width||p.y<0||p.y>height)continue;const edge=Math.min(1,p.x/(width*.04),(width-p.x)/(width*.04),p.y/(height*.04),(height-p.y)/(height*.04)),alpha=.95*star.brightness*(.82+.18*Math.sin(star.phase+dustTime*.65))*edge,r=Math.max(.85,Math.min(3.25,star.size*(.72+45/p.depth)*.5)),color=star.phase>5.84?'255,222,171':'194,222,255';if(star.size>3){const glow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*3);glow.addColorStop(0,`rgba(${color},${alpha*.35})`);glow.addColorStop(1,`rgba(${color},0)`);ctx.fillStyle=glow;ctx.fillRect(p.x-r*3,p.y-r*3,r*6,r*6);}ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle=`rgba(${color},${alpha})`;ctx.fill();}
    for(const orbit of orbits){ctx.beginPath();let started=false;for(let i=0;i<=96;i++){const local=orbitPosition(i/96*Math.PI*2,orbit.radius,orbit.tilt,orbit.node),p=projectPoint(local.map((v,j)=>v+orbit.center[j]),view,width,height);if(!p.visible){started=false;continue;}if(!started){ctx.moveTo(p.x,p.y);started=true;}else ctx.lineTo(p.x,p.y);}ctx.strokeStyle=`rgba(${orbit.color.map(v=>Math.round(v*255)).join(',')},${orbit.opacity*.65})`;ctx.lineWidth=.6;ctx.stroke();}
    const sun=projectPoint([0,0,0],view,width,height),sorted=bodies.map(b=>({...b,screen:projectPoint(b.position,view,width,height)})).filter(b=>b.screen.visible).sort((a,b)=>b.screen.depth-a.screen.depth);
    for(const b of sorted){const {x,y,scale}=b.screen,r=Math.max(.8,b.radius*scale),color=b.color.map(v=>Math.round(v*255));if(b.ringed){ctx.beginPath();for(let i=0;i<=96;i++){const ring=orbitPosition(i/96*Math.PI*2,b.radius*1.9,(b.axialTilt||0)+Math.PI/2,b.node),p=projectPoint(ring.map((v,j)=>v+b.position[j]),view,width,height);if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.lineWidth=Math.max(1,r*.22);ctx.strokeStyle=`rgba(${color.join(',')},.28)`;ctx.stroke();}const angle=b.sun?-.7:Math.atan2(sun.y-y,sun.x-x);ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);const g=ctx.createRadialGradient(x+Math.cos(angle)*r*.42,y+Math.sin(angle)*r*.42,r*.03,x,y,r);g.addColorStop(0,`rgb(${color.map(v=>Math.min(255,v+65)).join(',')})`);g.addColorStop(.5,`rgb(${color.join(',')})`);g.addColorStop(1,`rgb(${color.map(v=>Math.round(v*.13)).join(',')})`);ctx.fillStyle=g;ctx.fill();}
  },destroy(){ctx.clearRect(0,0,canvas.width,canvas.height)}};
}
export function createSolarRenderer(canvas){
  let gl;try{gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power'});}catch{}if(!gl)return fallbackRenderer(canvas);
  const resources=[];let fallback=null,lastArguments=null;
  const activateFallback=()=>{const replacement=canvas.cloneNode(false);canvas.replaceWith(replacement);fallback=fallbackRenderer(replacement);replacement.closest('[data-nexus-orbit],.nexus-system')?.setAttribute('data-solar-renderer',fallback.kind);if(lastArguments)fallback.draw(...lastArguments);return fallback;};
  const contextLost=event=>{event.preventDefault();activateFallback();};
  try{
    const compile=(type,source)=>{const shader=gl.createShader(type);resources.push(['Shader',shader]);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('Solar shader unavailable');return shader;};
    const program=gl.createProgram();resources.push(['Program',program]);gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Solar renderer unavailable');
    const mesh=meshes(),makeBuffer=(target,data)=>{const buffer=gl.createBuffer();resources.push(['Buffer',buffer]);gl.bindBuffer(target,buffer);gl.bufferData(target,data,gl.STATIC_DRAW);return buffer;};
    const sphere=makeBuffer(gl.ARRAY_BUFFER,mesh.sphere),circle=makeBuffer(gl.ARRAY_BUFFER,mesh.circle),index=makeBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.indices),ring=makeBuffer(gl.ARRAY_BUFFER,mesh.annulus),ringIndex=makeBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.annulusIndices),starBuffer=makeBuffer(gl.ARRAY_BUFFER,mesh.dust);
    const uniforms=Object.fromEntries(['uView','uBody','uOffset','uTarget','uSize','uAspect','uDistance','uCenterY','uDensity','uColor','uLight','uStyle','uTerrain','uTime','uDustTime','uOpacity'].map(name=>[name,gl.getUniformLocation(program,name)]));
    const positions=gl.getAttribLocation(program,'aPosition'),normals=gl.getAttribLocation(program,'aNormal');
    gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);
    const bind=buffer=>{gl.bindBuffer(gl.ARRAY_BUFFER,buffer);for(const [location,offset] of [[positions,0],[normals,12]])if(location>=0){gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,3,gl.FLOAT,false,24,offset);}};
    const bodyUniforms=(offset,size,color,style,opacity,bodyRotation,terrain=0)=>{gl.uniform3fv(uniforms.uOffset,offset);gl.uniform1f(uniforms.uSize,size);gl.uniform3fv(uniforms.uColor,color);gl.uniform1f(uniforms.uStyle,style);gl.uniform1f(uniforms.uTerrain,terrain);gl.uniform1f(uniforms.uOpacity,opacity);gl.uniformMatrix3fv(uniforms.uBody,false,bodyRotation);};
    canvas.addEventListener('webglcontextlost',contextLost);
    return {get kind(){return fallback?.kind||'webgl';},draw(bodies,orbits,view,density,time,dustAmount=1,dustTime=time){
      lastArguments=[bodies,orbits,view,density,time,dustAmount,dustTime];if(fallback){fallback.draw(...lastArguments);return;}if(gl.isContextLost())return;
      const w=Math.max(1,Math.round(canvas.clientWidth*density)),h=Math.max(1,Math.round(canvas.clientHeight*density));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);gl.uniformMatrix3fv(uniforms.uView,false,view.rotation);gl.uniform3fv(uniforms.uTarget,view.target);gl.uniform1f(uniforms.uDistance,view.distance);gl.uniform1f(uniforms.uCenterY,1-2*(view.centerY??.5));gl.uniform1f(uniforms.uDensity,density);gl.uniform1f(uniforms.uAspect,w/h);gl.uniform1f(uniforms.uTime,time);gl.uniform1f(uniforms.uDustTime,dustTime);
      gl.depthMask(true);bind(sphere);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);
      for(const body of bodies){bodyUniforms(body.position,body.radius,body.color,body.sun?0:2,1,multiply(planeRotation(body.axialTilt||0,body.node||0),rotation(time*(body.spin||.12),0)),body.terrain||0);const m=view.rotation,p=body.position;gl.uniform3fv(uniforms.uLight,[-m[0]*p[0]-m[3]*p[1]-m[6]*p[2],-m[1]*p[0]-m[4]*p[1]-m[7]*p[2],-m[2]*p[0]-m[5]*p[1]-m[8]*p[2]]);gl.drawElements(gl.TRIANGLES,mesh.indices.length,gl.UNSIGNED_SHORT,0);}
      gl.depthMask(false);bind(circle);
      for(const orbit of orbits){bodyUniforms(orbit.center,orbit.radius,orbit.color,1,orbit.opacity,planeRotation(orbit.tilt,orbit.node));gl.drawArrays(gl.LINE_STRIP,0,mesh.circle.length/6);}
      gl.disable(gl.CULL_FACE);bind(ring);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ringIndex);
      for(const body of bodies.filter(b=>b.ringed)){bodyUniforms(body.position,body.radius,body.color,5,.4,planeRotation((body.axialTilt||0)+Math.PI/2,body.node));gl.drawElements(gl.TRIANGLES,mesh.annulusIndices.length,gl.UNSIGNED_SHORT,0);}
      gl.enable(gl.CULL_FACE);bind(sphere);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);
      for(const body of bodies.filter(b=>!b.moon)){bodyUniforms(body.position,body.radius*1.085,body.color,4,.55,rotation(0,0));gl.drawElements(gl.TRIANGLES,mesh.indices.length,gl.UNSIGNED_SHORT,0);}
      if(dustAmount>0){bind(starBuffer);bodyUniforms([0,0,0],1,[.76,.87,1],6,.95,rotation(0,0));gl.drawArrays(gl.POINTS,0,starCount(canvas.clientWidth,canvas.clientHeight,dustAmount));}gl.depthMask(true);
    },destroy(){canvas.removeEventListener('webglcontextlost',contextLost);fallback?.destroy();for(const [kind,resource] of resources)gl['delete'+kind](resource);}};
  }catch{for(const [kind,resource] of resources)gl['delete'+kind](resource);return activateFallback();}
}
