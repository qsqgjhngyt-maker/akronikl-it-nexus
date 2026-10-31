// Принимается только ограниченный PCM16 mono16k WAV, а не произвольный медиаконтейнер.
export function inspectAsrWav(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.byteLength<44||bytes.byteLength>960044)throw Error('ASR_AUDIO_INVALID');const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),text=(offset,n)=>String.fromCharCode(...bytes.subarray(offset,offset+n));
 if(text(0,4)!=='RIFF'||text(8,4)!=='WAVE'||view.getUint32(4,true)!==bytes.length-8||text(12,4)!=='fmt '||view.getUint32(16,true)!==16||view.getUint16(20,true)!==1||view.getUint16(22,true)!==1||view.getUint32(24,true)!==16000||view.getUint32(28,true)!==32000||view.getUint16(32,true)!==2||view.getUint16(34,true)!==16||text(36,4)!=='data'||view.getUint32(40,true)!==bytes.length-44||(bytes.length-44)%2)throw Error('ASR_AUDIO_INVALID');
 const samples=(bytes.length-44)/2;if(samples<6400)throw Error('ASR_AUDIO_TOO_SHORT');let square=0,peak=0;for(let i=44;i<bytes.length;i+=2){const x=view.getInt16(i,true)/32768;square+=x*x;peak=Math.max(peak,Math.abs(x));}return{seconds:samples/16000,rms:Math.sqrt(square/samples),peak};
}
