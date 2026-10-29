// A per-phoneme duration profile for the existing Piper weights, not a playback-rate change.
const vowels=/[aeiouyɑɐɒɛɜɞɪɔɵœøʊʌɨɯɤə]/u;
export function piperPacePlan(ids,map){
 const symbols=new Map(Object.entries(map).filter(([,v])=>Array.isArray(v)&&v.length===1).map(([c,v])=>[v[0],c]));
 const pace=new Float32Array(ids.length).fill(1),changed=[];let word=[],clause=[],afterPunctuation=false;
 const mark=(at,factor,reason)=>{if(at<0||at>=pace.length)return;pace[at]=Math.max(pace[at],factor);if(symbols.get(ids[at+1])==='_')pace[at+1]=Math.max(pace[at+1],factor);changed.push({at,factor,reason});};
 function endWord(){if(!word.length)return;clause.push(word);word=[];}
 for(let i=0;i<ids.length;i++){
  const c=symbols.get(ids[i]);if(!c)throw Error('PIPER_PACE_ALPHABET_UNKNOWN');
  if(c==='_')continue;
  if(c==='^'||c==='$'){endWord();clause=[];continue;}
  if(c===' '){endWord();if(afterPunctuation)mark(i,1.04,'pause-space');continue;}
  if(/[.,:;?!]/u.test(c)){
   endWord();const strong=/[.?!]/u.test(c),tail=clause.slice(strong?-3:-1);
   for(let j=0;j<tail.length;j++){
    const factor=strong?[1.15,1.30,1.30][3-tail.length+j]:1.06;
    for(const at of tail[j])mark(at,factor,strong?'sentence-tail':'clause-tail');
   }
   const lastWord=clause.at(-1)??[],stress=lastWord.map(at=>symbols.get(ids[at])).lastIndexOf('ˈ');
   const nucleus=stress<0?undefined:lastWord.find((at,index)=>index>stress&&vowels.test(symbols.get(ids[at])));
   if(nucleus!==undefined)mark(nucleus,strong?1.30:1.10,strong?'sentence-cadence':'clause-cadence');
   // Keep the learned pauses; shortening them made endings run together in listening.
   mark(i,strong?1.08:1.04,'punctuation-pause');clause=[];afterPunctuation=true;continue;
  }
  afterPunctuation=false;word.push(i);
 }
 return {pace,changed};
}
