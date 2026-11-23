param([Parameter(Mandatory=$true)][string]$OutputDirectory,[string]$Platform='C:/Program Files/1cv8/8.3.27.2214/bin/1cv8.exe')
$ErrorActionPreference='Stop';$taskRepo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'));$taskOut=[IO.Path]::GetFullPath($OutputDirectory)
if(Test-Path -LiteralPath $taskOut){throw 'Нужен новый отдельный каталог.'}
if($taskOut.StartsWith($taskRepo+[IO.Path]::DirectorySeparatorChar)){throw 'База должна быть вне репозитория.'}
[IO.Directory]::CreateDirectory($taskOut)|Out-Null
$taskSteps=[Collections.Generic.List[object]]::new()
function Save([string]$p,[string]$v){[IO.File]::WriteAllText($p,$v,[Text.UTF8Encoding]::new($true))}
function Own([string]$n,[string[]]$a){$log=Join-Path $taskOut ($n+'.private.log');$p=Start-Process -FilePath $Platform -ArgumentList ($a+@('/DisableStartupDialogs','/DisableStartupMessages','/Out',('"'+$log+'"'))) -WindowStyle Hidden -PassThru;if(-not $p.WaitForExit(45000)){$p.Kill();throw ('Таймаут '+$n)};$p.Refresh();$taskSteps.Add(@{operation=$n;exitCode=$p.ExitCode});$taskSteps|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $taskOut 'STEPS.json') -Encoding utf8;if($p.ExitCode -ne 0){throw ('Не прошла собственная нативная операция '+$n)};Write-Output ($n+': PASS')}
$base=Join-Path $taskOut 'service-base';$source=Join-Path $taskOut 'service-source';$cf=Join-Path $taskRepo 'courses/onec-education/native/downloads/NexusTrainingServiceDeskReportsV2.cf'
Own 'create-new-service' @('CREATEINFOBASE',('File="'+$base+'";'))
Own 'load-supplied-cf' @('DESIGNER','/F',('"'+$base+'"'),'/LoadCfg',('"'+$cf+'"'),'/UpdateDBCfg')
Own 'dump-own-source' @('DESIGNER','/F',('"'+$base+'"'),'/DumpConfigToFiles',('"'+$source+'"'))
$module=Join-Path $source 'Ext/ManagedApplicationModule.bsl';$original=[IO.File]::ReadAllText($module)
Save (Join-Path $taskOut 'ORIGINAL_APPLICATION.bsl') $original
$commonRoot=Join-Path $source 'CommonModules/QAЭталон/Ext';[IO.Directory]::CreateDirectory($commonRoot)|Out-Null
$template=[IO.File]::ReadAllText((Join-Path $taskRepo 'docs/ru/03-content/cpp-clarity-01/R3_EVIDENCE/1c-enterprise-a2-module/native/source/CommonModules/УчебныйОбзор.xml'))
Save (Join-Path $source 'CommonModules/QAЭталон.xml') ($template.Replace('УчебныйОбзор','QAЭталон').Replace('e815b9dc-00a1-4f3a-88f3-f44c5117746a','24c721ad-17b8-49cd-9035-616789617a42'))
$cfg=Join-Path $source 'Configuration.xml';$xml=[IO.File]::ReadAllText($cfg);Save $cfg ($xml.Replace('<ChildObjects>','<ChildObjects><CommonModule>QAЭталон</CommonModule>'))
$driver=@'
Функция Количество(Таблица)
    З = Новый Запрос("ВЫБРАТЬ Ссылка ИЗ " + Таблица);
    Возврат З.Выполнить().Выгрузить().Количество();
КонецФункции
Функция Клиент(Имя)
    О = Справочники.Клиенты.СоздатьЭлемент(); О.Наименование = Имя; О.Записать(); Возврат О.Ссылка;
КонецФункции
Функция Услуга(Имя, Тариф)
    О = Справочники.Услуги.СоздатьЭлемент(); О.Наименование = Имя; О.ТарифЗаЧас = Тариф; О.Записать(); Возврат О.Ссылка;
КонецФункции
Функция Заявка(Клиент, Услуга, Минуты, Комментарий)
    О = Документы.ЗаявкаУслуги.СоздатьДокумент(); О.Дата = Дата(2026,11,12,12,0,0);
    О.Клиент = Клиент; О.Услуга = Услуга; О.ДлительностьМинут = Минуты; О.Статус = Перечисления.СтатусыЗаявки.Новая; О.Комментарий = Комментарий; О.Записать(); Возврат О.Ссылка;
КонецФункции
Функция ЗапуститьОпыт() Экспорт
    Если Количество("Справочник.Клиенты") <> 0 Тогда ВызватьИсключение "Нужна новая пустая база"; КонецЕсли;
    Север = Клиент("Учебный Север");
    Восток = Клиент("Учебный Восток"); КодДо = Восток.Код;
    О = Восток.ПолучитьОбъект(); О.Наименование = "Учебный Восток — сервис"; О.Записать();
    ТаЖеЗапись = О.Ссылка = Восток; ТотЖеКод = Восток.Код = КодДо;
    Запад = Клиент("Учебный Запад");
    Диагностика = Услуга("Учебная диагностика",600); Настройка = Услуга("Учебная настройка",900);
    Пример = Заявка(Север,Диагностика,30,"Учебный пример");
    Работа = Заявка(Восток,Настройка,20,"Мой первый заказ");
    ОтказПолучен = Ложь;
    Попытка
        Заявка(Справочники.Клиенты.ПустаяСсылка(),Настройка,20,"Неполная новая форма");
    Исключение
        ОтказПолучен = Истина;
    КонецПопытки;
    Возврат Новый Структура("emptyInitially,renamedSameRecord,renamedSameCode,distinctWest,missingCustomerRefused,requests,exampleNumber,workNumber,workCustomer,workService,minutes,statusNew,comment,rate,postingDisabled",
        Истина,ТаЖеЗапись,ТотЖеКод,Восток<>Запад,ОтказПолучен,Количество("Документ.ЗаявкаУслуги"),Пример.Номер,Работа.Номер,Работа.Клиент.Наименование,Работа.Услуга.Наименование,Работа.ДлительностьМинут,Работа.Статус=Перечисления.СтатусыЗаявки.Новая,Работа.Комментарий,Работа.Услуга.ТарифЗаЧас,Не Работа.Проведен);
КонецФункции
Функция Прочитать() Экспорт
    З = Новый Запрос("ВЫБРАТЬ Ссылка ИЗ Документ.ЗаявкаУслуги ГДЕ Комментарий = &Комментарий");
    З.УстановитьПараметр("Комментарий","Мой первый заказ"); Т = З.Выполнить().Выгрузить();
    Если Т.Количество() <> 1 Тогда ВызватьИсключение "Не найдена единственная своя заявка"; КонецЕсли;
    О = Т[0].Ссылка.ПолучитьОбъект();
    Возврат Новый Структура("requests,number,customer,service,minutes,statusNew,comment,rate,postingDisabled",Количество("Документ.ЗаявкаУслуги"),О.Номер,О.Клиент.Наименование,О.Услуга.Наименование,О.ДлительностьМинут,О.Статус=Перечисления.СтатусыЗаявки.Новая,О.Комментарий,О.Услуга.ТарифЗаЧас,Не О.Проведен);
КонецФункции
'@
Save (Join-Path $commonRoot 'Module.bsl') $driver
foreach($mode in @('create','reopen')){
 $actual=Join-Path $taskOut ($mode+'.json');$call=if($mode -eq 'create'){'ЗапуститьОпыт'}else{'Прочитать'}
 $app=@"
Процедура ПриНачалеРаботыСистемы()
    Итог = QAЭталон.$call();
    Запись = Новый ЗаписьJSON; Запись.УстановитьСтроку(); ЗаписатьJSON(Запись,Итог); Значение = Запись.Закрыть();
    Текст = Новый ТекстовыйДокумент; Текст.УстановитьТекст(Значение); Текст.Записать("$($actual.Replace('\','/'))",КодировкаТекста.UTF8);
    ЗавершитьРаботуСистемы(Ложь);
КонецПроцедуры
"@
 Save $module $app
 Own ($mode+'-load') @('DESIGNER','/F',('"'+$base+'"'),'/LoadConfigFromFiles',('"'+$source+'"'),'/UpdateDBCfg')
 Own ($mode+'-check') @('DESIGNER','/F',('"'+$base+'"'),'/CheckConfig','-ThinClient','-Server','-ConfigLogicalIntegrity')
 Own ($mode+'-run') @('ENTERPRISE','/F',('"'+$base+'"'))
 $result=Get-Content -LiteralPath $actual -Raw -Encoding utf8|ConvertFrom-Json
 if($result.requests -ne 2 -or $result.minutes -ne 20 -or $result.comment -cne 'Мой первый заказ' -or $result.rate -ne 900 -or -not $result.statusNew -or -not $result.postingDisabled){throw ('Не совпали поля '+$mode)}
}
$first=Get-Content -LiteralPath (Join-Path $taskOut 'create.json') -Raw -Encoding utf8|ConvertFrom-Json
if(-not ($first.emptyInitially -and $first.renamedSameRecord -and $first.renamedSameCode -and $first.distinctWest -and $first.missingCustomerRefused)){throw 'Не доказано изменение и ожидаемый отказ'}
Save $module $original
Own 'restore-original-application' @('DESIGNER','/F',('"'+$base+'"'),'/LoadConfigFromFiles',('"'+$source+'"'),'/UpdateDBCfg')
@{status='NATIVE DATA PASS';platform='8.3.27.2214';publicCfSha256=(Get-FileHash -LiteralPath $cf -Algorithm SHA256).Hash.ToLowerInvariant();topicIds=@('1c-enterprise.a2.topic-1','1c-enterprise.a2.topic-2','1c-enterprise.a2.topic-3');scope='Нативное создание/запись/повторное чтение данных; GUI-шаги и понимание отдельно';ownerDataUsed=$false;workingBasesChanged=0;serviceBase=$base}|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $taskOut 'RESULT.json') -Encoding utf8
