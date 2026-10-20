import {rotation} from './nexus-solar-renderer.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function createSolarFlight(){
  const state={active:false,eye:[0,0,0],velocity:[0,0,0],yaw:0,pitch:0,look:[0,0],keys:new Set()};
  const basis=()=>{const m=rotation(state.yaw,state.pitch);return {matrix:m,right:[m[0],m[3],m[6]],up:[m[1],m[4],m[7]],forward:[-m[2],-m[5],-m[8]]};};
  const settle=()=>{state.keys.clear();state.look=[0,0];state.velocity=[0,0,0];};
  return {
    state,
    start(view,yaw,pitch){state.active=true;state.yaw=yaw;state.pitch=pitch;const m=view.rotation;state.eye=view.target.map((v,i)=>v+[m[2],m[5],m[8]][i]*view.distance);settle();},
    stop(){state.active=false;settle();},
    clear:settle,
    key(code,pressed){if(pressed)state.keys.add(code);else state.keys.delete(code);},
    steer(dx,dy){state.yaw+=clamp(dx,-250,250)*.0027;state.pitch=clamp(state.pitch+clamp(dy,-250,250)*.0027,-1.48,1.48);},
    point(x,y){state.look=[x,y].map(v=>Math.abs(v)<.12?0:v);},
    moveForward(amount){const {forward}=basis();state.eye=state.eye.map((v,i)=>v+forward[i]*amount);},
    step(dt,bodies=[]){
      if(!state.active)return false;
      state.yaw+=state.look[0]*dt*.8;state.pitch=clamp(state.pitch+state.look[1]*dt*.65,-1.48,1.48);
      const {forward,right,up}=basis(),key=code=>state.keys.has(code)?1:0,axes=[key('KeyW')-key('KeyS'),key('KeyD')-key('KeyA'),key('KeyE')-key('KeyQ')],length=Math.hypot(...axes)||1;
      const nearest=bodies.reduce((near,b)=>Math.min(near,Math.hypot(...state.eye.map((v,i)=>v-b.position[i]))-b.radius),10),speed=clamp(.65+nearest*.55,.55,2.8)*(state.keys.has('ShiftLeft')||state.keys.has('ShiftRight')?2.5:1),blend=1-Math.exp(-dt*8);
      const desired=forward.map((v,i)=>(v*axes[0]+right[i]*axes[1]+up[i]*axes[2])/length*speed);
      state.velocity=state.velocity.map((v,i)=>v+(desired[i]-v)*blend);state.eye=state.eye.map((v,i)=>v+state.velocity[i]*dt);
      for(const body of bodies){const delta=state.eye.map((v,i)=>v-body.position[i]),distance=Math.hypot(...delta),minimum=body.radius+.18;if(distance>=minimum)continue;const normal=distance>.0001?delta.map(v=>v/distance):[0,0,1];state.eye=body.position.map((v,i)=>v+normal[i]*minimum);const inward=state.velocity.reduce((v,n,i)=>v+n*normal[i],0);if(inward<0)state.velocity=state.velocity.map((v,i)=>v-normal[i]*inward);}
      const radius=Math.hypot(...state.eye);if(radius>24){state.eye=state.eye.map(v=>v/radius*24);state.velocity=[0,0,0];}
      return state.keys.size>0||Math.hypot(...state.velocity)>.001||Math.hypot(...state.look)>0;
    },
    pose(){const {matrix,forward}=basis();return {rotation:matrix,target:state.eye.map((v,i)=>v+forward[i]),distance:1,centerY:.5};}
  };
}
