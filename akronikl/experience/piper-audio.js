// Same mild, zero-phase filter used in the listened-to prototype: 50–9200 Hz at 22050 Hz.
const SOS=[[.6840177522272692,1.3680355044545385,.6840177522272692,1,1.2837236072622005,.48008158490374264],[1,-2,1,1,-1.9798510696673812,.9800527970932367]];
const ZI=[[.30594746553283947,.20875368148541754],[-.9899652177603452,.9899652177603406]];
function filter(input){
 let values=input;
 for(let section=0;section<SOS.length;section++){
  const [b0,b1,b2,,a1,a2]=SOS[section],out=new Float64Array(values.length);let z0=ZI[section][0]*input[0],z1=ZI[section][1]*input[0];
  for(let i=0;i<values.length;i++){const x=values[i],y=b0*x+z0;z0=b1*x-a1*y+z1;z1=b2*x-a2*y;out[i]=y;}
  values=out;
 }
 return values;
}
export function cleanPiperPcm(pcm,sampleRate){
 if(sampleRate!==22050||!pcm||pcm.length<32||pcm.length>3000000)throw Error('PIPER_AUDIO_PROFILE_INVALID');
 const edge=15,n=pcm.length,extended=new Float64Array(n+edge*2);
 for(let i=0;i<edge;i++)extended[i]=2*pcm[0]-pcm[edge-i];extended.set(pcm,edge);
 for(let i=0;i<edge;i++)extended[edge+n+i]=2*pcm[n-1]-pcm[n-2-i];
 const reverse=filter(extended).reverse(),processed=filter(reverse).reverse(),out=new Float32Array(n),fade=Math.min(110,Math.floor(n/2));
 for(let i=0;i<n;i++){let value=processed[edge+i];if(i<fade)value*=i/(fade-1);if(i>=n-fade)value*=(n-1-i)/(fade-1);if(!Number.isFinite(value))throw Error('PIPER_AUDIO_INVALID');out[i]=value;}
 return out;
}
