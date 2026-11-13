from pathlib import Path
import shutil,json
w=Path(__file__).parent;r=Path(r'C:/Users/User/.codex/.chatgpt-projects/g-p-6abd25f3a9c081919ee253c9198f69b4/outputs/cpp-clarity-01-20261104/repo')
d=w/'onec-p3-export-probe';s=d/'source'
if not s.exists():shutil.copytree(r/'courses/onec-education/native/service-desk',s)
p=s/'Configuration.xml';cfg=(r/'courses/onec-education/native/service-desk/Configuration.xml').read_text(encoding='utf-8-sig').replace('NexusTrainingServiceDesk','NexusP3ExportProbe20261108').replace('<ChildObjects>','<ChildObjects><CommonModule>УчебныеРасчеты</CommonModule>')
p.write_text(cfg,encoding='utf-8-sig')
template=(r/'courses/onec-education/native/service-desk-advanced/CommonModules/УчебныеЗадания.xml').read_text(encoding='utf-8-sig').replace('УчебныеЗадания','УчебныеРасчеты')
(s/'CommonModules/УчебныеРасчеты/Ext').mkdir(parents=True,exist_ok=True)
(s/'CommonModules/УчебныеРасчеты.xml').write_text(template,encoding='utf-8-sig')
c=json.loads((w/'onec-p3-module-native-20261108/CASE_SOURCES.json').read_text(encoding='utf-8'))['cases'][0]
cost=c['externalModules']['УчебныеРасчеты'];(d/'COST_WITH_EXPORT.bsl').write_text(cost,encoding='utf-8',newline='\n');(d/'COST_WITHOUT_EXPORT.bsl').write_text(cost.replace(' Экспорт',''),encoding='utf-8',newline='\n')
(s/'CommonModules/УчебныеРасчеты/Ext/Module.bsl').write_text(cost.replace(' Экспорт',''),encoding='utf-8-sig',newline='\n')
app='''Процедура ПриНачалеРаботыСистемы()
    Протокол = Новый ЗаписьТекста("'''+str(d/'ACTUAL_WITHOUT_EXPORT.txt').replace('\\','/')+'''", КодировкаТекста.UTF8);
    Попытка
        Результат = УчебныеРасчеты.Стоимость(30, 1200);
        Протокол.ЗаписатьСтроку("VALUE:" + Строка(Результат));
    Исключение
        Протокол.ЗаписатьСтроку("REJECTION:" + ОписаниеОшибки());
    КонецПопытки;
    Протокол.Закрыть();
    ЗавершитьРаботуСистемы(Ложь);
КонецПроцедуры
'''
(s/'Ext/ManagedApplicationModule.bsl').write_text(app,encoding='utf-8-sig',newline='\n')
(d/'APP_WITHOUT_EXPORT.bsl').write_text(app,encoding='utf-8',newline='\n')
print('Отдельный отрицательный probe подготовлен.')
