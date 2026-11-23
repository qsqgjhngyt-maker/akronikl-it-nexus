from pathlib import Path
import json,hashlib,shutil,uuid,textwrap
w=Path(__file__).parent;r=Path(r'C:/Users/User/.codex/.chatgpt-projects/g-p-6abd25f3a9c081919ee253c9198f69b4/outputs/cpp-clarity-01-20261104/repo');out=w/'onec-p3-module-native-20261108'
assert not out.exists(),'Существующую базу и evidence не перезаписывать'
src=out/'source';shutil.copytree(r/'courses/onec-education/native/service-desk',src)
p=src/'Configuration.xml';configuration=p.read_text(encoding='utf-8-sig').replace('NexusTrainingServiceDesk','NexusP3Module20261108')
template=(r/'courses/onec-education/native/service-desk-advanced/CommonModules/УчебныеЗадания.xml').read_text(encoding='utf-8-sig')
common_names=[];cases=[]
sha=lambda s:hashlib.sha256(s.encode('utf-8')).hexdigest()
def clean(s):return textwrap.dedent(s).strip()+'\n'
def main(body,functions=''):
    return (functions.rstrip()+'\n\n' if functions.strip() else '')+'Процедура ПриНачалеРаботыСистемы()\n'+''.join('    '+s+'\n' for s in body.rstrip().splitlines())+'КонецПроцедуры\n'
def split(full):
    a,b=full.split('Процедура ПриНачалеРаботыСистемы()\n',1);body=b.rsplit('КонецПроцедуры',1)[0];return a.rstrip()+'\n' if a.strip() else '',textwrap.dedent(body).strip()+'\n'
def add(id,topic,kind,full,value,expected=None,messages=None,error=None,external=None):
    functions,body=split(full);cases.append({'id':id,'topicId':topic,'kind':kind,'fullSource':full,'functions':functions,'body':body,'sha256':sha(full),'functionsSha256':sha(functions),'bodySha256':sha(body),'valueExpression':value,'expectedValue':expected,'expectedMessages':messages,'expectedErrorContains':error,'externalModules':external or {},'actualGuiMessagesVerified':False})
def module(name,code):
    xml=template.replace('УчебныеЗадания',name).replace('1f0db6e0-2d5c-41ed-ae43-0dcc40799bb8',str(uuid.uuid4())).replace('Оригинальная учебная фоновая операция','Изолированный учебный расчёт P3')
    dest=src/'CommonModules'/name/'Ext';dest.mkdir(parents=True,exist_ok=True);(src/'CommonModules'/(name+'.xml')).write_text(xml,encoding='utf-8-sig',newline='\n');(dest/'Module.bsl').write_text(code,encoding='utf-8-sig',newline='\n');common_names.append(name)
def old(file):return json.loads((r/'courses/onec/lessons/ru'/file).read_text(encoding='utf-8'))
contexts,params,collections,exceptions,tests=['onec.p3.topic-1','onec.p3.topic-2','onec.p3.topic-3','onec.p3.topic-4','onec.p3.module-tests']
ctx=old('p3-contexts.json');cost=ctx['examples'][0]['source'].rstrip()+'\n'
budget=clean('''
Функция Остаток(Знач Лимит, Знач Занято) Экспорт
    Если ТипЗнч(Лимит) <> Тип("Число") Или ТипЗнч(Занято) <> Тип("Число") Тогда
        ВызватьИсключение "Ожидались числа";
    КонецЕсли;
    Если Лимит < 0 Или Занято < 0 Или Занято > Лимит Тогда
        ВызватьИсключение "Неверный резерв";
    КонецЕсли;
    Возврат Лимит - Занято;
КонецФункции
''')
module('УчебныеРасчеты',cost+'\n'+budget)
for minutes,result in [(30,'600'),(45,'900')]:
    full=ctx['examples'][1]['source'].replace('(30, 1200)','('+str(minutes)+', 1200)').rstrip()+'\n';add('contexts-main'+str(minutes),contexts,'worked-example',full,'Строка(Результат)',result,[result],external={'УчебныеРасчеты':cost})
for used,result in [(45,'75'),(0,'120'),(120,'0'),(121,None)]:
    full=main('Результат = УчебныеРасчеты.Остаток(120, '+str(used)+');\nСообщить(Результат);\n');add('contexts-independent'+str(used),contexts,'independent-lab',full,'Строка(Результат)',result,[result] if result else None,error='Неверный резерв' if result is None else None,external={'УчебныеРасчеты':budget})
pm=old('p3-parameters.json')['examples'][0]['source'].rstrip()+'\n'
for label,minutes,result in [('30','30','600|30'),('45','45','900|45'),('0','0','0|0'),('negative','-1',None),('text','"30"',None)]:
    full=pm.replace('Минуты = 30;','Минуты = '+minutes+';');add('params-main'+label,params,'worked-example',full,'Строка(Результат) + "|" + Строка(Минуты)',result,result.split('|') if result else None,error=('не могут быть отрицательными' if label=='negative' else 'должны быть числами') if result is None else None)
func,_=split(pm);add('params-two-calls',params,'original-transfer',main('Первая = 30;\nВторая = 45;\nРезультат = Стоимость(Первая, 1200) + Стоимость(Вторая, 1200);\nСообщить(Результат);\n',func),'Строка(Результат)','1500',['1500'])
converted=pm.replace('    Возврат Окр(Минуты * ТарифЗаЧас / 60, 2);','    Минуты = Минуты / 60;\n    Возврат Окр(Минуты * ТарифЗаЧас, 2);')
add('params-local-conversion',params,'value-parameter-observation',converted,'Строка(Результат) + "|" + Формат(Минуты, "ЧДЦ=2;ЧРД=.;ЧГ=0")','600|30.00',['600','30'])
add('params-wrong-no-value',params,'deliberate-error',converted.replace('Стоимость(Знач Минуты,','Стоимость(Минуты,'),'Строка(Результат) + "|" + Формат(Минуты, "ЧДЦ=2;ЧРД=.;ЧГ=0")','600|0.50',None)
discount=clean('''
Функция СтоимостьСоСкидкой(Знач Минуты, Знач Тариф, Знач Скидка)
    Если ТипЗнч(Минуты) <> Тип("Число") Или ТипЗнч(Тариф) <> Тип("Число") Или ТипЗнч(Скидка) <> Тип("Число") Тогда
        ВызватьИсключение "Ожидались числа";
    КонецЕсли;
    Если Минуты < 0 Или Тариф < 0 Или Скидка < 0 Или Скидка > 100 Тогда
        ВызватьИсключение "Неверные значения скидки или длительности";
    КонецЕсли;
    Минуты = Минуты / 60;
    Возврат Окр(Минуты * Тариф * (100 - Скидка) / 100, 2);
КонецФункции
''')
for label,minutes,off,result in [('45',45,10,'540|45'),('60',60,0,'800|60'),('0',0,10,'0|0'),('bad-discount',45,101,None)]:
    full=main('Минуты = '+str(minutes)+';\nРезультат = СтоимостьСоСкидкой(Минуты, 800, '+str(off)+');\nСообщить(Результат);\nСообщить(Минуты);\n',discount);add('params-independent'+label,params,'independent-lab',full,'Строка(Результат) + "|" + Строка(Минуты)',result,result.split('|') if result else None,error='Неверные значения' if result is None else None)
cm=old('p3-collections.json')['examples'][0]['source']
add('collections-main',collections,'worked-example',main(cm),'Строка(МинутыЗаявок[0]) + "|" + Строка(Карточка.Минуты) + "|" + Строка(Итоги.Получить("Клиент-А"))','30|75|75',['30','75','75'])
add('collections-third-item',collections,'original-transfer',main(cm.replace('МинутыЗаявок.Добавить(45);','МинутыЗаявок.Добавить(45);\nМинутыЗаявок.Добавить(15);')),'Строка(МинутыЗаявок[0]) + "|" + Строка(Карточка.Минуты) + "|" + Строка(Итоги.Получить("Клиент-А"))','30|90|90',['30','90','90'])
add('collections-alias-add',collections,'shared-reference',main(cm+'\nВтороеИмя = МинутыЗаявок;\nВтороеИмя.Добавить(15);\nСообщить(МинутыЗаявок.Количество());\n'),'Строка(МинутыЗаявок.Количество())','3',None)
add('collections-missing-key',collections,'missing-key',main(cm+'\nСообщить(ТипЗнч(Итоги.Получить("нет такого ключа")));\n'),'Строка(ТипЗнч(Итоги.Получить("нет такого ключа")))','Неопределено',None)
copy_func=clean('''
Функция КопияМинут(Знач Источник)
    Копия = Новый Массив;
    Для Каждого Минуты Из Источник Цикл
        Копия.Добавить(Минуты);
    КонецЦикла;
    Возврат Копия;
КонецФункции
''')
for label,values,result in [('two',[10,20],'10|99|2'),('one',[7],'7|99|1'),('empty',[],'empty|empty|0')]:
    body='Исходный = Новый Массив;\n'+''.join('Исходный.Добавить('+str(v)+');\n' for v in values)+'''Копия = КопияМинут(Исходный);
Если Копия.Количество() > 0 Тогда
    Копия[0] = 99;
    Сообщить(Исходный[0]);
    Сообщить(Копия[0]);
Иначе
    Сообщить("empty");
    Сообщить("empty");
КонецЕсли;
Сообщить(Копия.Количество());
''';value='QAПервый(Исходный) + "|" + QAПервый(Копия) + "|" + Строка(Копия.Количество())';add('collections-independent-'+label,collections,'independent-lab',main(body,copy_func),value,result,result.split('|'))
copy_base=next(c for c in cases if c['id']=='collections-independent-two');bad=copy_base['fullSource'].replace('Копия = КопияМинут(Исходный);','Копия = Исходный;');add('collections-wrong-alias',collections,'deliberate-error',bad,copy_base['valueExpression'],'99|99|2',['99','99','2'])
em=old('p3-exceptions.json')['examples'][0]['source']
for label,value,expected in [('bad','ошибка','false|ошибка'),('30','30','true|30'),('negative','-1','true|-1')]:
    add('exceptions-main-'+label,exceptions,'worked-example',main(em.replace('"ошибка"','"'+value+'"')),'QABool(Результат) + "|" + ИсходныйТекст',expected,None)
parse=clean('''
Функция ПрочитатьМинуты(Знач ИсходныйТекст)
    Итог = Новый Структура("Успех,Минуты,Причина", Ложь, Неопределено, "");
    Если СокрЛП(ИсходныйТекст) = "" Тогда
        Итог.Причина = "empty_input";
        Возврат Итог;
    КонецЕсли;
    Попытка
        Минуты = Число(ИсходныйТекст);
    Исключение
        Итог.Причина = "invalid_format";
        Возврат Итог;
    КонецПопытки;
    Если Минуты < 0 Или Минуты > 180 Тогда
        Итог.Причина = "out_of_range";
        Возврат Итог;
    КонецЕсли;
    Итог.Успех = Истина;
    Итог.Минуты = Минуты;
    Итог.Причина = "ok";
    Возврат Итог;
КонецФункции
''')
for label,text,result in [('45','45','ok|45|45'),('bad','ошибка','invalid_format|empty|ошибка'),('negative','-1','out_of_range|empty|-1'),('zero','0','ok|0|0'),('empty','','empty_input|empty|')]:
    body='ИсходныйТекст = "'+text+'";\nОтвет = ПрочитатьМинуты(ИсходныйТекст);\nСообщить(Ответ.Причина);\nЕсли Ответ.Успех Тогда\n    Сообщить(Ответ.Минуты);\nИначе\n    Сообщить("empty");\nКонецЕсли;\nСообщить("source=[" + ИсходныйТекст + "]");\n';add('exceptions-independent-'+label,exceptions,'independent-lab',main(body,parse),'Ответ.Причина + "|" + QAЗначение(Ответ.Минуты) + "|" + ИсходныйТекст',result,[result.split('|')[0],result.split('|')[1],'source=['+text+']'])
bad=em.replace('    Сообщить("Введите число минут, например 30");','    Результат = Истина;\n    Сообщить("Введите число минут, например 30");');add('exceptions-wrong-success',exceptions,'deliberate-error',main(bad),'QABool(Результат) + "|" + ИсходныйТекст','true|ошибка',None)
tm=old('p3-contracts.json')['examples'][0]['source'].rstrip()+'\n';add('tests-main',tests,'worked-example',tm,'Строка(Результат)','4',['Пройдены четыре учебные проверки'])
five=tm.replace('    Результат = 4;','    ПроверитьРавно(Стоимость(1, 1200), 20, "минута");\n    Результат = 5;').replace('Пройдены четыре учебные проверки','Пройдены пять учебных проверок');add('tests-one-minute',tests,'original-transfer',five,'Строка(Результат)','5',['Пройдены пять учебных проверок'])
add('tests-wrong-divisor',tests,'deliberate-error',tm.replace(' / 60, 2)',' / 30, 2)'),'Строка(Результат)',error='Не пройдено: полчаса')
assertion=split(tm)[0].split('Процедура ПроверитьРавно',1)[1];assertion='Процедура ПроверитьРавно'+assertion
test_budget=budget.replace(' Экспорт','')+'\n'+assertion
test_body=clean('''
ПроверитьРавно(Остаток(90, 20), 70, "занята часть");
ПроверитьРавно(Остаток(90, 0), 90, "нет резерва");
ПроверитьРавно(Остаток(90, 90), 0, "всё занято");
ПроверитьРавно(Остаток(0, 0), 0, "нулевой лимит");
ОтказНаблюден = Ложь;
Попытка
    Остаток(-1, 0);
Исключение
    ОтказНаблюден = Истина;
КонецПопытки;
ПроверитьРавно(ОтказНаблюден, Истина, "отрицательный лимит");
ОтказНаблюден = Ложь;
Попытка
    Остаток(90, 91);
Исключение
    ОтказНаблюден = Истина;
КонецПопытки;
ПроверитьРавно(ОтказНаблюден, Истина, "резерв больше лимита");
Результат = 6;
Сообщить("Пройдены шесть учебных проверок");
''')
ind=main(test_body,test_budget);add('tests-independent',tests,'independent-lab',ind,'Строка(Результат)','6',['Пройдены шесть учебных проверок'])
bad=ind.replace('Возврат Лимит - Занято;','Возврат Лимит + Занято;');add('tests-independent-wrong-plus',tests,'deliberate-error',bad,'Строка(Результат)',error='Не пройдено: занята часть')
blind=bad.replace('    Если Факт <> Ожидание Тогда\n        ВызватьИсключение "Не пройдено: " + Название;\n    КонецЕсли;','    // Намеренно пустое утверждение: это неверный тест.');add('tests-wrong-empty-assertion',tests,'deliberate-false-green',blind,'Строка(Результат)','6',['Пройдены шесть учебных проверок'])
qa_helpers=clean('''
Функция QABool(Знач Значение)
    Если Значение Тогда Возврат "true"; КонецЕсли;
    Возврат "false";
КонецФункции
Функция QAПервый(Знач МассивЗначений)
    Если МассивЗначений.Количество() = 0 Тогда Возврат "empty"; КонецЕсли;
    Возврат Строка(МассивЗначений[0]);
КонецФункции
Функция QAЗначение(Знач Значение)
    Если Значение = Неопределено Тогда Возврат "empty"; КонецЕсли;
    Возврат Строка(Значение);
КонецФункции
''')
calls=[]
for index,c in enumerate(cases,1):
    dest=out/'cases'/(c['id']+'.bsl');dest.parent.mkdir(exist_ok=True);dest.write_text(c['fullSource'],encoding='utf-8',newline='\n')
    name='QACase'+str(index).zfill(3);code=c['functions']+'\n'+qa_helpers+'\nФункция QARun() Экспорт\n'+''.join('    '+line+'\n' for line in c['body'].splitlines())+'    Возврат '+c['valueExpression']+';\nКонецФункции\n';module(name,code);c['qaModule']=name;c['qaModuleSha256']=sha(code);calls.append('    ЗаписатьФакт("BEGIN:'+c['id']+'");\n    Попытка\n        Факт = '+name+'.QARun();\n        ЗаписатьФакт("VALUE:'+c['id']+':" + Факт);\n        ЗаписатьФакт("END:'+c['id']+':OK");\n    Исключение\n        ЗаписатьФакт("ERROR:'+c['id']+':" + ОписаниеОшибки());\n    КонецПопытки;\n')
assert configuration.count('<ChildObjects>')==1;configuration=configuration.replace('<ChildObjects>','<ChildObjects>'+''.join('<CommonModule>'+n+'</CommonModule>' for n in common_names));(src/'Configuration.xml').write_text(configuration,encoding='utf-8-sig',newline='\n')
harness='Перем Протокол;\nПроцедура ЗаписатьФакт(Текст)\n    Протокол.ЗаписатьСтроку(Текст);\nКонецПроцедуры\nПроцедура ПриНачалеРаботыСистемы()\n    Протокол = Новый ЗаписьТекста("'+(out/'ACTUAL_NATIVE_qa-all.txt').as_posix()+'", КодировкаТекста.UTF8);\n    ЗаписатьФакт("NEXUS_P3_MODULE_20261108; PLATFORM=8.3.27.2214; OWN_SYNTHETIC_BASE");\n'+''.join(calls)+'    Протокол.Закрыть();\n    ЗавершитьРаботуСистемы(Ложь);\nКонецПроцедуры\n';(src/'Ext/ManagedApplicationModule.bsl').write_text(harness,encoding='utf-8-sig',newline='\n');(out/'BATCH_HARNESS_FINAL.bsl').write_text(harness,encoding='utf-8-sig',newline='\n')
manifest={'status':'PREPARED / NOT EXECUTED','configuration':'NexusP3Module20261108','platformVersion':'8.3.27.2214','ownerDataUsed':False,'cases':cases,'harnessSha256':hashlib.sha256((src/'Ext/ManagedApplicationModule.bsl').read_bytes()).hexdigest(),'scope':'Точные bodies и функции размещены в отдельных собственных серверных QA common modules; добавлены только QA-наблюдатели и строковый возврат. Это не GUI-доказательство всех fullSources в исходном клиентском контексте. Полные необёрнутые main/reference handlers и настройки контекстов проверяются отдельно GUI.','commonModuleProperties':{'Server':True,'ServerCall':True,'ClientManagedApplication':False,'Global':False,'Privileged':False,'ReturnValuesReuse':'DontUse'},'expectedExportFailure':'Проверить отдельно копию общего метода без Экспорт; в положительный batch не включён, чтобы не смешать отказ компиляции с числовыми результатами.'}
(out/'CASE_SOURCES.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'status':manifest['status'],'cases':len(cases),'topics':len(set(c['topicId'] for c in cases)),'commonModules':len(common_names),'ownBase':manifest['configuration']},ensure_ascii=False))
