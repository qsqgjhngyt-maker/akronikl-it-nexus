// Чистые детерминированные демонстрации: без DOM, сети и learner state.
const integer=(value,min,max)=>{
  if(String(value).trim()==='')throw new RangeError('OUT_OF_RANGE');
  const n=Number(value);
  if(!Number.isSafeInteger(n)||n<min||n>max)throw new RangeError('OUT_OF_RANGE');
  return n;
};
const text=(locale,ru,en)=>locale==='en'?en:ru;
export function euclidTrace(a=48,b=18,locale='ru'){
  let x=integer(a,0,100000),y=integer(b,0,100000);
  if(x===0&&y===0)throw new RangeError('GCD_ZERO_ZERO');
  const steps=[];
  while(y!==0){
    const r=x%y;
    steps.push({title:x+' % '+y+' = '+r,description:text(locale,'Пара ('+x+', '+y+') → ('+y+', '+r+'); НОД сохраняется.','Pair ('+x+', '+y+') → ('+y+', '+r+'); the GCD is unchanged.'),kind:'action'});
    x=y;y=r;
    if(steps.length>40)throw new RangeError('TOO_MANY_STEPS');
  }
  steps.push({title:'gcd = '+x,description:text(locale,'b = 0. Значение a — наибольший общий делитель.','b = 0. The value of a is the greatest common divisor.'),kind:'result'});
  return steps;
}
export function evenSumTrace(n=5,locale='ru'){
  const count=integer(n,0,12),steps=[{title:text(locale,'Старт','Start'),description:'n = '+count+', sum = 0.',kind:'action'}];
  let sum=0;
  for(let k=1;k<=count;k++){
    const even=k%2===0;
    if(even)sum+=k;
    steps.push({title:'k = '+k,description:(even?text(locale,'Чётное: прибавляем ','Even: add ')+k+'. ':text(locale,'Нечётное: пропускаем. ','Odd: skip. '))+'sum = '+sum+'.',kind:'action'});
  }
  steps.push({title:text(locale,'Ответ ','Result ')+sum,description:text(locale,'Цикл завершён: k превысил n.','The loop has ended: k is greater than n.'),kind:'result'});
  return steps;
}
export function deliveryTrace(x=1000,locale='ru'){
  const amount=integer(x,-10000,10000);
  const steps=[{title:text(locale,'Ввод ','Input ')+amount,description:text(locale,'Получена стоимость заказа.','The order amount is available.'),kind:'action'}];
  steps.push({title:'x < 0?',description:amount<0?text(locale,'Да: вход недопустим.','Yes: invalid input.'):text(locale,'Нет: заказ допустим.','No: the order is valid.'),kind:'decision'});
  if(amount<0){steps.push({title:'invalid',description:text(locale,'Завершаем без расчёта доставки.','Stop without calculating delivery.'),kind:'result'});return steps}
  steps.push({title:'x ≥ 1000?',description:amount>=1000?text(locale,'Да: порог достигнут.','Yes: the threshold is reached.'):text(locale,'Нет: порог не достигнут.','No: below the threshold.'),kind:'decision'});
  steps.push({title:amount>=1000?'free':'150',description:amount>=1000?text(locale,'Доставка бесплатна.','Delivery is free.'):text(locale,'Стоимость доставки — 150.','Delivery costs 150.'),kind:'result'});
  return steps;
}
export function goldVisualizationSteps(model,values={},locale='ru'){
  const {kind,steps=[]}=model||{};
  if(kind==='euclid')return euclidTrace(values.a??48,values.b??18,locale);
  if(kind==='control-flow')return evenSumTrace(values.n??5,locale);
  if(kind==='flowchart')return deliveryTrace(values.x??1000,locale);
  if(!['journey','properties','representations','decomposition','toolchain'].includes(kind))throw new TypeError('UNKNOWN_GOLD_VISUALIZATION');
  if(!Array.isArray(steps)||steps.length<3||steps.length>12)throw new RangeError('INVALID_GOLD_STEPS');
  return steps.map(s=>({title:String(s.title),description:String(s.description),kind:'action'}));
}
