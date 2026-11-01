param([Parameter(Mandatory=$true)][string]$OutputDirectory,[string]$SourceDirectory)
$ErrorActionPreference='Stop'
$taskRoot=$PSScriptRoot
$source=if($SourceDirectory){[IO.Path]::GetFullPath($SourceDirectory)}else{Join-Path $taskRoot 'report-source-03'}
$dest=[IO.Path]::GetFullPath($OutputDirectory)
if(Test-Path -LiteralPath $dest){throw 'Нужен новый каталог проверки'}
New-Item -ItemType Directory -Path $dest | Out-Null
$copy=Join-Path $dest 'source'
Copy-Item -LiteralPath $source -Destination $copy -Recurse
$base=Join-Path $dest 'test-base'
$steps=[Collections.Generic.List[object]]::new()
$platform='C:\Program Files\1cv8\8.3.27.2214\bin\1cv8.exe'
$enc=[Text.UTF8Encoding]::new($false)
function Invoke-OwnNative([string]$Name,[string[]]$Arguments){
 $log=Join-Path $dest ($Name+'.private.log')
 $p=Start-Process -FilePath $platform -ArgumentList ($Arguments+@('/DisableStartupDialogs','/DisableStartupMessages','/Out',('"'+$log+'"'))) -WindowStyle Hidden -PassThru
 if(-not $p.WaitForExit(60000)){$p.Kill();throw ('Таймаут своего процесса '+$Name)}
 $p.Refresh()
 $text=if(Test-Path -LiteralPath $log){[IO.File]::ReadAllText($log)}else{''}
 $class=if($text -match 'лиценз|license'){'LICENSING_MESSAGE_NOT_EXPORTED'}elseif($text -match 'Ошибк|Error|Синтакс|МодульУправляемогоПриложения\('){'PLATFORM_DIAGNOSTIC'}else{'OPERATION_LOG'}
 $steps.Add([pscustomobject]@{name=$Name;exitCode=$p.ExitCode;classification=$class})
 if($p.ExitCode -ne 0 -or $class -eq 'PLATFORM_DIAGNOSTIC'){throw ('Не выполнен '+$Name+'; '+$class)}
}
try{
 Invoke-OwnNative 'create' @('CREATEINFOBASE',('File="'+$base+'";'))
 $resultFile=Join-Path $dest 'report-query-result.txt'
 $module=Join-Path $copy 'Ext\ManagedApplicationModule.bsl'
 $original=[IO.File]::ReadAllBytes($module)
 $body=@'
#Если ТолстыйКлиентУправляемоеПриложение Тогда
Процедура ПриНачалеРаботыСистемы()
    КлиентА = Справочники.Клиенты.СоздатьЭлемент();
    КлиентА.Наименование = "Учебный клиент А";
    КлиентА.Записать();
    КлиентБ = Справочники.Клиенты.СоздатьЭлемент();
    КлиентБ.Наименование = "Учебный клиент Б";
    КлиентБ.Записать();
    Услуга = Справочники.Услуги.СоздатьЭлемент();
    Услуга.Наименование = "Учебная консультация";
    Услуга.ТарифЗаЧас = 600;
    Услуга.Записать();
    Для НомерШага = 1 По 3 Цикл
        Заявка = Документы.ЗаявкаУслуги.СоздатьДокумент();
        Заявка.Дата = Дата(2026, 11, 1, 10, НомерШага, 0);
        Заявка.Клиент = ?(НомерШага = 3, КлиентБ.Ссылка, КлиентА.Ссылка);
        Заявка.Услуга = Услуга.Ссылка;
        Заявка.Статус = Перечисления.СтатусыЗаявки.Новая;
        Заявка.ДлительностьМинут = ?(НомерШага = 1, 30, ?(НомерШага = 2, 45, 15));
        Заявка.Комментарий = "Собственная синтетическая проверка отчёта";
        Заявка.Записать();
    КонецЦикла;
    ОтчетОбъект = Отчеты.ЗаявкиПоКлиентам.Создать();
    Схема = ОтчетОбъект.ПолучитьМакет("ОсновнаяСхемаКомпоновкиДанных");
    Запрос = Новый Запрос;
    Запрос.Текст = Схема.НаборыДанных[0].Запрос;
    Таблица = Запрос.Выполнить().Выгрузить();
    КоличествоА = 0;
    МинутыА = 0;
    Для Каждого СтрокаДанных Из Таблица Цикл
        Если СтрокаДанных.Клиент = КлиентА.Ссылка Тогда
            КоличествоА = КоличествоА + СтрокаДанных.Количество;
            МинутыА = МинутыА + СтрокаДанных.Минуты;
        КонецЕсли;
    КонецЦикла;
    Правильно = Таблица.Количество() = 3 И Таблица.Итог("Минуты") = 90 И КоличествоА = 2 И МинутыА = 75;
    Протокол = Новый ТекстовыйДокумент;
    Протокол.УстановитьТекст(?(Правильно, "PASS", "FAIL") + "|" + Строка(Таблица.Количество()) + "|" + Строка(Таблица.Итог("Минуты")) + "|" + Строка(КоличествоА) + "|" + Строка(МинутыА));
    Протокол.Записать("__RESULT_FILE__", КодировкаТекста.UTF8);
    ЗавершитьРаботуСистемы(Ложь);
КонецПроцедуры
#КонецЕсли
'@
 [IO.File]::WriteAllText($module,$body.Replace('__RESULT_FILE__',$resultFile.Replace('"','""')),$enc)
 Invoke-OwnNative 'load-test-source' @('DESIGNER','/F',('"'+$base+'"'),'/LoadConfigFromFiles',('"'+$copy+'"'),'/UpdateDBCfg')
 Invoke-OwnNative 'check-test-source' @('DESIGNER','/F',('"'+$base+'"'),'/CheckConfig','-ThinClient','-ThickClientManagedApplication','-Server','-ConfigLogicalIntegrity')
 Invoke-OwnNative 'run-native-query' @('ENTERPRISE','/F',('"'+$base+'"'))
 $observed=if(Test-Path -LiteralPath $resultFile){[IO.File]::ReadAllText($resultFile).Trim()}else{'NO_RESULT'}
 if($observed -ne 'PASS|3|90|2|75'){throw 'Фактический результат запроса отчёта не подтверждён'}
 [IO.File]::WriteAllBytes($module,$original)
 Invoke-OwnNative 'restore-original-startup' @('DESIGNER','/F',('"'+$base+'"'),'/LoadConfigFromFiles',('"'+$copy+'"'),'/UpdateDBCfg')
 Invoke-OwnNative 'check-clean-source' @('DESIGNER','/F',('"'+$base+'"'),'/CheckConfig','-ThinClient','-ThickClientManagedApplication','-Server','-ConfigLogicalIntegrity')
 $template=Join-Path $source 'Reports\ЗаявкиПоКлиентам\Templates\ОсновнаяСхемаКомпоновкиДанных\Ext\Template.xml'
 $r=[pscustomobject]@{schemaVersion=1;status='AUTOMATED PASS';platformVersion='8.3.27.2214';report='ЗаявкиПоКлиентам';harnessContext='thick-managed-client-only';datasetQueryExecuted=$true;dataCompositionRenderingTested=$false;observed=$observed;onlySyntheticRecords=$true;newOwnInfobase=$true;sourceStartupRestored=$true;training1508Verified=$false;codeVerifiedServer=$false;progressWritten=$false;templateSha256=(Get-FileHash -LiteralPath $template -Algorithm SHA256).Hash.ToLowerInvariant();runnerSha256=(Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash.ToLowerInvariant();steps=$steps}
 [IO.File]::WriteAllText((Join-Path $dest 'CUSTOMER_REPORT_RESULT.json'),($r|ConvertTo-Json -Depth 8),$enc)
 Write-Output ($r|ConvertTo-Json -Depth 8 -Compress)
}catch{
 [IO.File]::WriteAllText((Join-Path $dest 'CUSTOMER_REPORT_RESULT.json'),([pscustomobject]@{status='FAILED';steps=$steps;message='Нативная проверка не завершена; приватные логи не экспортируются.'}|ConvertTo-Json -Depth 8),$enc)
 throw
}
