// Чистые детерминированные демонстрации. Нет DOM, сети и learner state.
const integer=(value,min,max)=>{
  const n=Number(value);
  if(!Number.isSafeInteger(n)||n<min||n>max)throw new RangeError('OUT_OF_RANGE');
  return n;
};
export function euclidTrace(a=48,b=18){
  let x=integer(a,0,100000),y=integer(b,0,100000);
  if(x===0&&y===0)throw new RangeError('GCD_ZERO_ZERO');
  const steps=[];
  if(y===0)return[{title:'gcd = '+x,description:'b = 0: результат уже найден.',kind:'result'}];
  while(y!==0){
    const r=x%y;
    steps.push({title:x+' % '+y+' = '+r,description:'Пара ('+x+', '+y+') → ('+y+', '+r+'); НОД сохраняется.',kind:'decision'});
    x=y;y=r;
    if(steps.length>40)throw new RangeError('TOO_MANY_STEPS');
  }
  steps.push({title:'gcd = '+x,description:'b = 0. Значение a — наибольший общий делитель.',kind:'result'});
  return steps;
}
export function evenSumTrace(n=5){
  const count=integer(n,0,12),steps=[{title:'Старт',description:'n = '+count+', sum = 0.',kind:'action'}];
  let sum=0;
  for(let k=1;k<=count;k++){
    const even=k%2===0;
    if(even)sum+=k;
    steps.push({title:'k = '+k,description:(even?'Чётное: прибавляем '+k+'. ':'Нечётное: пропускаем. ')+'sum = '+sum+'.',kind:even?'decision':'action'});
  }
  steps.push({title:'Ответ '+sum,description:'Цикл завершён: k превысил n.',kind:'result'});
  return steps;
}
export function deliveryTrace(x=1000){
  const amount=integer(x,-10000,10000);
  const steps=[{title:'Ввод '+amount,description:'Получена стоимость заказа.',kind:'action'}];
  steps.push({title:'x < 0?',description:amount<0?'Да, вход недопустим.':'Нет, заказ допустим.',kind:'decision'});
  if(amount<0){steps.push({title:'invalid',description:'Завершаем без расчёта доставки.',kind:'result'});return steps}
  steps.push({title:'x ≥ 1000?',description:amount>=1000?'Да, порог достигнут.':'Нет, порог не достигнут.',kind:'decision'});
  steps.push({title:amount>=1000?'free':'150',description:amount>=1000?'Доставка бесплатна.':'Стоимость доставки — 150.',kind:'result'});
  return steps;
}
export function goldVisualizationSteps(model,values={}){
  const {kind,steps=[]}=model||{};
  if(kind==='euclid')return euclidTrace(values.a??48,values.b??18);
  if(kind==='control-flow')return evenSumTrace(values.n??5);
  if(kind==='flowchart')return deliveryTrace(values.x??1000);
  if(!['journey','properties','representations','decomposition','toolchain'].includes(kind))throw new TypeError('UNKNOWN_GOLD_VISUALIZATION');
  if(!Array.isArray(steps)||steps.length<3||steps.length>12)throw new RangeError('INVALID_GOLD_STEPS');
  return steps.map(s=>({title:String(s.title),description:String(s.description),kind:'action'}));
}
