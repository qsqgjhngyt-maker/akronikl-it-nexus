param([Parameter(Mandatory=$true)][string]$Repo,[Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference='Stop'
$platform='C:\Program Files\1cv8\8.3.27.2214\bin\1cv8.exe'
$dest=[IO.Path]::GetFullPath($OutputDirectory)
if(Test-Path -LiteralPath $dest){throw 'Нужен новый каталог собственной синтетической проверки'}
New-Item -ItemType Directory -Path $dest | Out-Null
$enc=[Text.UTF8Encoding]::new($false)
$steps=[Collections.Generic.List[object]]::new()
function Invoke-OwnNative([string]$Name,[string[]]$Arguments){
 $log=Join-Path $dest ($Name+'.private.log')
 $p=Start-Process -FilePath $platform -ArgumentList ($Arguments+@('/DisableStartupDialogs','/DisableStartupMessages','/Out',('"'+$log+'"'))) -WindowStyle Hidden -PassThru
 if(-not $p.WaitForExit(60000)){$p.Kill();throw ('Таймаут собственного процесса '+$Name)}
 $p.Refresh();$text=if(Test-Path -LiteralPath $log){[IO.File]::ReadAllText($log)}else{''}
 $class=if($text -match 'лиценз|license'){'LICENSING_MESSAGE_NOT_EXPORTED'}elseif($text -match 'Ошибк|Error|Синтакс|МодульУправляемогоПриложения\('){'PLATFORM_DIAGNOSTIC'}else{'OPERATION_LOG'}
 $steps.Add([pscustomobject]@{name=$Name;exitCode=$p.ExitCode;classification=$class})
 if($p.ExitCode -ne 0 -or $class -eq 'PLATFORM_DIAGNOSTIC'){throw ('Не выполнен '+$Name+'; '+$class)}
}
function Set-TestModule([string]$Source,[string]$Body){
 $module=Join-Path $Source 'Ext\ManagedApplicationModule.bsl'
 [IO.File]::WriteAllText($module,("#Если ТолстыйКлиентУправляемоеПриложение Тогда`r`nПроцедура ПриНачалеРаботыСистемы()`r`n"+$Body+"`r`nКонецПроцедуры`r`n#КонецЕсли`r`n"),$enc)
}
$oldManifest=Get-Content -LiteralPath (Join-Path $Repo 'courses\onec-education\native\downloads\CONFIGURATION_MANIFEST.json') -Raw|ConvertFrom-Json
$newManifest=Get-Content -LiteralPath (Join-Path $Repo 'courses\onec-education\native\downloads\REPORT_CONFIGURATION_MANIFEST.json') -Raw|ConvertFrom-Json
$newCf=Join-Path $Repo ('courses\onec-education\native\downloads\'+$newManifest.file)
if((Get-FileHash -LiteralPath $newCf -Algorithm SHA256).Hash.ToLowerInvariant() -ne $newManifest.sha256){throw 'CF не соответствует публичному манифесту'}
$oldSource=Join-Path $Repo 'courses\onec-education\native\beginner-service-desk'
$newSource=Join-Path $Repo 'courses\onec-education\native\service-desk-reports-v2'
$oldTest=Join-Path $dest 'old-test-source';$newTest=Join-Path $dest 'new-test-source'
Copy-Item -LiteralPath $oldSource -Destination $oldTest -Recurse
Copy-Item -LiteralPath $newSource -Destination $newTest -Recurse
foreach($f in $oldManifest.sourceFiles){if((Get-FileHash -LiteralPath (Join-Path $oldSource $f.path) -Algorithm SHA256).Hash.ToLowerInvariant() -ne $f.sha256){throw 'Изменён исходный старый комплект'}}
$original=Join-Path $dest 'original-old-base';$copy=Join-Path $dest 'upgraded-copy';$dt=Join-Path $dest 'own-backup.dt'
$seed=@'
    Клиенты = Новый Массив;
    Для Индекс = 1 По 2 Цикл
        Клиент = Справочники.Клиенты.СоздатьЭлемент();
        Клиент.Наименование = ?(Индекс = 1, "Учебный Север — ремонт", "Учебный Юг");
        Клиент.Записать();
        Клиенты.Добавить(Клиент.Ссылка);
    КонецЦикла;
    Услуга = Справочники.Услуги.СоздатьЭлемент();
    Услуга.Наименование = "Учебная диагностика";
    Услуга.ТарифЗаЧас = 600;
    Услуга.Записать();
    Для Индекс = 1 По 4 Цикл
        Заявка = Документы.ЗаявкаУслуги.СоздатьДокумент();
        Заявка.Дата = Дата(2026,11,2,10,Индекс,0);
        Заявка.Клиент = Клиенты[?(Индекс = 4, 1, 0)];
        Заявка.Услуга = Услуга.Ссылка;
        Заявка.ДлительностьМинут = ?(Индекс = 2,45,?(Индекс = 4,15,30));
        Заявка.Статус = Перечисления.СтатусыЗаявки.Новая;
        Заявка.Комментарий = "Собственная сохранённая работа " + Строка(Индекс);
        Заявка.Записать();
    КонецЦикла;
    ЗавершитьРаботуСистемы(Ложь);
'@
$snapshot=@'
    Протокол = Новый ТекстовыйДокумент;
    ВыборкаКлиентов = Справочники.Клиенты.Выбрать();
    Пока ВыборкаКлиентов.Следующий() Цикл
        Протокол.ДобавитьСтроку("C|" + Строка(ВыборкаКлиентов.Ссылка.УникальныйИдентификатор()) + "|" + ВыборкаКлиентов.Код + "|" + ВыборкаКлиентов.Наименование + "|" + Строка(ВыборкаКлиентов.ПометкаУдаления));
    КонецЦикла;
    ВыборкаУслуг = Справочники.Услуги.Выбрать();
    Пока ВыборкаУслуг.Следующий() Цикл
        Протокол.ДобавитьСтроку("S|" + Строка(ВыборкаУслуг.Ссылка.УникальныйИдентификатор()) + "|" + ВыборкаУслуг.Код + "|" + ВыборкаУслуг.Наименование + "|" + Строка(ВыборкаУслуг.ТарифЗаЧас));
    КонецЦикла;
    ВыборкаЗаявок = Документы.ЗаявкаУслуги.Выбрать();
    Пока ВыборкаЗаявок.Следующий() Цикл
        Протокол.ДобавитьСтроку("D|" + Строка(ВыборкаЗаявок.Ссылка.УникальныйИдентификатор()) + "|" + ВыборкаЗаявок.Номер + "|" + Формат(ВыборкаЗаявок.Дата,"ДФ=yyyyMMddHHmmss") + "|" + Строка(ВыборкаЗаявок.Клиент.УникальныйИдентификатор()) + "|" + Строка(ВыборкаЗаявок.Услуга.УникальныйИдентификатор()) + "|" + Строка(ВыборкаЗаявок.ДлительностьМинут) + "|" + Строка(ВыборкаЗаявок.Статус) + "|" + ВыборкаЗаявок.Комментарий + "|" + Строка(ВыборкаЗаявок.ПометкаУдаления) + "|" + Строка(ВыборкаЗаявок.Проведен));
    КонецЦикла;
    Протокол.Записать("__SNAPSHOT__",КодировкаТекста.UTF8);
    __REPORT__
    ЗавершитьРаботуСистемы(Ложь);
'@
$report=@'
    ОбъектОтчета = Отчеты.ЗаявкиПоКлиентам.Создать();
    Схема = ОбъектОтчета.ПолучитьМакет("ОсновнаяСхемаКомпоновкиДанных");
    Запрос = Новый Запрос;
    Запрос.Текст = Схема.НаборыДанных[0].Запрос;
    Таблица = Запрос.Выполнить().Выгрузить();
    МинутыСевера = 0; КоличествоСевера = 0;
    Для Каждого СтрокаДанных Из Таблица Цикл
        Если СтрокаДанных.Клиент.Наименование = "Учебный Север — ремонт" Тогда
            МинутыСевера = МинутыСевера + СтрокаДанных.Минуты;
            КоличествоСевера = КоличествоСевера + СтрокаДанных.Количество;
        КонецЕсли;
    КонецЦикла;
    Результат = Новый ТекстовыйДокумент;
    Результат.УстановитьТекст(Строка(Таблица.Количество()) + "|" + Строка(Таблица.Итог("Минуты")) + "|" + Строка(КоличествоСевера) + "|" + Строка(МинутыСевера));
    Результат.Записать("__REPORT_FILE__",КодировкаТекста.UTF8);
'@
try{
 Invoke-OwnNative 'create-original' @('CREATEINFOBASE',('File="'+$original+'";'))
 Set-TestModule $oldTest $seed
 Invoke-OwnNative 'seed-old-configuration' @('DESIGNER','/F',('"'+$original+'"'),'/LoadConfigFromFiles',('"'+$oldTest+'"'),'/UpdateDBCfg')
 Invoke-OwnNative 'run-own-seed' @('ENTERPRISE','/F',('"'+$original+'"'))
 $before=Join-Path $dest 'before.txt';$after=Join-Path $dest 'after.txt';$reportFile=Join-Path $dest 'report.txt'
 Set-TestModule $oldTest ($snapshot.Replace('__SNAPSHOT__',$before).Replace('__REPORT__',''))
 Invoke-OwnNative 'load-before-observer' @('DESIGNER','/F',('"'+$original+'"'),'/LoadConfigFromFiles',('"'+$oldTest+'"'),'/UpdateDBCfg')
 Invoke-OwnNative 'observe-before' @('ENTERPRISE','/F',('"'+$original+'"'))
 Invoke-OwnNative 'restore-old-source' @('DESIGNER','/F',('"'+$original+'"'),'/LoadConfigFromFiles',('"'+$oldSource+'"'),'/UpdateDBCfg')
 Invoke-OwnNative 'backup-old-base' @('DESIGNER','/F',('"'+$original+'"'),'/DumpIB',('"'+$dt+'"'))
 $sourceHash=(Get-FileHash -LiteralPath (Join-Path $original '1Cv8.1CD') -Algorithm SHA256).Hash.ToLowerInvariant()
 Invoke-OwnNative 'create-separate-copy' @('CREATEINFOBASE',('File="'+$copy+'";'))
 Invoke-OwnNative 'restore-only-into-copy' @('DESIGNER','/F',('"'+$copy+'"'),'/RestoreIB',('"'+$dt+'"'))
 Invoke-OwnNative 'load-new-cf-only-into-copy' @('DESIGNER','/F',('"'+$copy+'"'),'/LoadCfg',('"'+$newCf+'"'),'/UpdateDBCfg')
 Invoke-OwnNative 'check-upgraded-copy' @('DESIGNER','/F',('"'+$copy+'"'),'/CheckConfig','-ThinClient','-ThickClientManagedApplication','-Server','-ConfigLogicalIntegrity')
 Set-TestModule $newTest ($snapshot.Replace('__SNAPSHOT__',$after).Replace('__REPORT__',$report.Replace('__REPORT_FILE__',$reportFile)))
 Invoke-OwnNative 'load-copy-observer' @('DESIGNER','/F',('"'+$copy+'"'),'/LoadConfigFromFiles',('"'+$newTest+'"'),'/UpdateDBCfg')
 Invoke-OwnNative 'observe-after-and-report' @('ENTERPRISE','/F',('"'+$copy+'"'))
 $beforeLines=@([IO.File]::ReadAllLines($before)|Where-Object{$_}|Sort-Object)
 $afterLines=@([IO.File]::ReadAllLines($after)|Where-Object{$_}|Sort-Object)
 if($beforeLines.Count -ne 7 -or (Compare-Object $beforeLines $afterLines)){throw 'Идентичности или поля не сохранились'}
 if([IO.File]::ReadAllText($reportFile).Trim() -ne '4|120|3|105'){throw 'Новый отчёт не совпал с независимым ожиданием'}
 if((Get-FileHash -LiteralPath (Join-Path $original '1Cv8.1CD') -Algorithm SHA256).Hash.ToLowerInvariant() -ne $sourceHash){throw 'Исходная база изменилась после резервной копии'}
 Invoke-OwnNative 'restore-copy-original-startup' @('DESIGNER','/F',('"'+$copy+'"'),'/LoadConfigFromFiles',('"'+$newSource+'"'),'/UpdateDBCfg')
 Invoke-OwnNative 'final-copy-check' @('DESIGNER','/F',('"'+$copy+'"'),'/CheckConfig','-ThinClient','-ThickClientManagedApplication','-Server','-ConfigLogicalIntegrity')
 $result=[ordered]@{schemaVersion=1;status='AUTOMATED PASS';scope='Only unchanged original Nexus 9-file starter with synthetic data; no custom-configuration merge claim';platformVersion='8.3.27.2214';fromCfSha256=$oldManifest.sha256;toCfSha256=$newManifest.sha256;originalBaseUntouchedAfterBackup=$true;backupRestoredIntoNewBase=$true;catalogItemsPreserved=3;documentIdentitiesPreserved=4;documentNumbersDatesReferencesDurationsStatusesCommentsMarksAndPostingPreserved=$true;observedReport='4|120|3|105';copyStartupRestored=$true;realAccountUsed=$false;progressWritten=$false;training1508UpgradeVerified=$false;guiUpgradeTested=$false;runnerSha256=(Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash.ToLowerInvariant();steps=$steps}
 [IO.File]::WriteAllText((Join-Path $dest 'REPORT_UPGRADE_RESULT.json'),($result|ConvertTo-Json -Depth 8),$enc)
 Write-Output ($result|ConvertTo-Json -Depth 8 -Compress)
}catch{
 [IO.File]::WriteAllText((Join-Path $dest 'REPORT_UPGRADE_RESULT.json'),([ordered]@{status='FAILED';scope='Own synthetic bases only';steps=$steps;diagnostics='Private native logs retained locally; not exported'}|ConvertTo-Json -Depth 8),$enc)
 throw
}
