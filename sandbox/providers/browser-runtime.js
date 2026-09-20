const RUNNER_URL='https://felixhao28.github.io/JSCPP/dist/JSCPP.es5.min.js';
let runnerPromise=null;

export const browserRuntimeProvider={
  id:'browser-jscpp',
  label:'Nexus Browser Runtime',
  tier:'browser',
  capabilities:{stdin:true,stdout:true,unicode:true,files:false,threads:false,gui:false,fullStdlib:false},
  async available(){return true},
  async load(){
    if(window.JSCPP)return window.JSCPP;
    if(runnerPromise)return runnerPromise;
    runnerPromise=new Promise((resolve,reject)=>{
      let settled=false;
      const finish=(fn,value)=>{if(settled)return;settled=true;clearTimeout(timer);fn(value)};
      document.querySelector('script[data-anx-cpp-runner]')?.remove();
      const script=document.createElement('script');
      script.src=RUNNER_URL;script.async=true;script.dataset.anxCppRunner='1';
      const timer=setTimeout(()=>finish(reject,new Error('Nexus Browser Runtime не загрузился за 20 секунд. Проверьте соединение и повторите попытку.')),20000);
      script.onload=()=>window.JSCPP?finish(resolve,window.JSCPP):finish(reject,new Error('Runtime загружен, но API выполнения недоступен.'));
      script.onerror=()=>finish(reject,new Error('Не удалось загрузить Nexus Browser Runtime. Для первого запуска требуется подключение к runtime-пакету.'));
      document.head.appendChild(script);
    });
    try{return await runnerPromise}catch(err){runnerPromise=null;throw err}
  },
  normalize(source){
    const original=String(source??'').replace(/\r\n?/g,'\n');
    let code=original;
    const changes=[];
    const replacements=[
      ['std::cout','cout'],['std::cin','cin'],['std::cerr','cerr'],['std::endl','endl'],
      ['std::string','string'],['std::fixed','fixed'],['std::setprecision','setprecision']
    ];
    for(const [from,to] of replacements){
      if(code.includes(from)){code=code.split(from).join(to);changes.push(`${from} → ${to}`)}
    }
    let lineOffset=0;
    if(changes.length>0&&!/using\s+namespace\s+std\s*;/.test(code)){
      const lines=code.split('\n');let lastInclude=-1;for(let i=0;i<lines.length;i++)if(/^\s*#\s*include\b/.test(lines[i]))lastInclude=i;
      lines.splice(lastInclude+1,0,'using namespace std;');code=lines.join('\n');changes.push('added using namespace std;');lineOffset=1;
    }
    return{original,code,adapted:changes.length>0,changes,lineOffset};
  },
  async run(source,stdin=''){
    const runtime=await this.load();
    const normalized=this.normalize(source);
    let stdout='';
    const started=performance.now();
    let result;
    try{result=runtime.run(normalized.code,String(stdin??''),{stdio:{write:value=>{stdout+=String(value)}}})}
    catch(err){try{err.anxLineOffset=normalized.lineOffset||0;err.anxNormalized=normalized}catch{}throw err}
    const exitCode=result&&result.v!==undefined?result.v:result;
    return{stdout,exitCode,elapsedMs:Math.max(0,Math.round(performance.now()-started)),provider:this,normalized};
  }
};
