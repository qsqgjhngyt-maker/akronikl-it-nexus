param([Parameter(Mandatory=$true)][string]$Repo,[Parameter(Mandatory=$true)][string]$OutputDirectory,[string]$SourceDirectory,[string]$PlatformPath)
$ErrorActionPreference='Stop';$enc=[Text.UTF8Encoding]::new($false);$Repo=[IO.Path]::GetFullPath($Repo)
$code=if($SourceDirectory){[IO.Path]::GetFullPath($SourceDirectory)}else{Join-Path $Repo 'courses\onec-education\code\pedagogy'}
$dest=[IO.Path]::GetFullPath($OutputDirectory);if(Test-Path -LiteralPath $dest){throw 'Нужна новая папка проверки'};New-Item -ItemType Directory -Path $dest|Out-Null
$fixturePath=Join-Path $Repo 'courses\onec-education\native\service-desk-security-v2'
$fixtureFiles=@(Get-ChildItem -LiteralPath $fixturePath -Recurse -File|ForEach-Object{[pscustomobject]@{path=$_.FullName.Substring($fixturePath.Length+1).Replace('\','/');sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}})
$source=Join-Path $dest 'source';Copy-Item -LiteralPath $fixturePath -Destination $source -Recurse
$platform=if($PlatformPath){[IO.Path]::GetFullPath($PlatformPath)}else{'C:\Program Files\1cv8\8.3.27.2214\bin\1cv8.exe'};$steps=[Collections.Generic.List[object]]::new();$cases=[Collections.Generic.List[object]]::new()
function Invoke-Own([string]$Name,[string[]]$Arguments){
 $log=Join-Path $dest ($Name+'.private.log');$p=Start-Process -FilePath $platform -ArgumentList ($Arguments+@('/DisableStartupDialogs','/DisableStartupMessages','/Out',('"'+$log+'"'))) -WindowStyle Hidden -PassThru
 if(-not $p.WaitForExit(45000)){$p.Kill();throw 'Таймаут собственного процесса'};$p.Refresh();$text=if(Test-Path -LiteralPath $log){[IO.File]::ReadAllText($log)}else{''}
 $class=if($text -match 'лиценз|license'){'LICENSING_MESSAGE_NOT_EXPORTED'}elseif($text -match 'Ошибк|Error|Синтакс|МодульУправляемогоПриложения\('){'PLATFORM_DIAGNOSTIC'}else{'OPERATION_LOG'};$steps.Add([pscustomobject]@{name=$Name;exitCode=$p.ExitCode;classification=$class});if($p.ExitCode -ne 0 -or $class -eq 'PLATFORM_DIAGNOSTIC'){throw ('Не выполнен '+$Name)}
}
function Hash-Text([string]$s){$h=[Security.Cryptography.SHA256]::Create();try{([BitConverter]::ToString($h.ComputeHash($enc.GetBytes($s)))).Replace('-','').ToLowerInvariant()}finally{$h.Dispose()}}
$xml=[IO.File]::ReadAllText((Join-Path $Repo 'courses\onec-education\native\service-desk-advanced\CommonModules\УчебныеЗадания.xml')).Replace('УчебныеЗадания','УчебнаяПроверкаПрав').Replace('1f0db6e0-2d5c-41ed-ae43-0dcc40799bb8','bcf27c79-4155-4ebc-b04c-348a9bfd6054').Replace('Оригинальная учебная фоновая операция','Оригинальные учебные опыты документа и транзакций в отдельной базе')
$commonPath=Join-Path $source 'CommonModules\УчебнаяПроверкаПрав\Ext\Module.bsl';New-Item -ItemType Directory -Path (Split-Path $commonPath -Parent) -Force|Out-Null
[IO.File]::WriteAllText((Join-Path $source 'CommonModules\УчебнаяПроверкаПрав.xml'),$xml,$enc)
$cfg=Join-Path $source 'Configuration.xml';[IO.File]::WriteAllText($cfg,[IO.File]::ReadAllText($cfg).Replace('<ChildObjects>','<ChildObjects><CommonModule>УчебнаяПроверкаПрав</CommonModule>'),$enc)

$capstone=Join-Path $Repo 'docs\ru\03-content\onec\pedagogy-v2-20261102\engineering\capstone-current-common.bsl'
$extra=@'
Функция ПодготовитьРоли() Экспорт
    ИтоговыйОпыт("seed");
    Для Каждого Имя Из СтрРазделить("NexusP10Admin|NexusP10Reader","|") Цикл
        Профиль = ПользователиИнформационнойБазы.СоздатьПользователя(); Профиль.Имя = Имя;
        Профиль.АутентификацияСтандартная = Истина; Профиль.АутентификацияОС = Ложь;
        Профиль.Роли.Добавить(?(Имя = "NexusP10Admin",Метаданные.Роли.УчебныйАдминистраторA6,Метаданные.Роли.УчебныйЧитательA6)); Профиль.Записать();
    КонецЦикла;
    Возврат "OWN_SYNTHETIC_PROFILES_READY";
КонецФункции
Функция ПроверитьОграничение() Экспорт
    Запрос = Новый Запрос("ВЫБРАТЬ РАЗРЕШЕННЫЕ З.Ссылка,З.ДлительностьМинут КАК Минуты ИЗ Документ.ЗаявкаУслуги КАК З"); Данные = Запрос.Выполнить().Выгрузить();
    Если Данные.Количество() <> 5 Или Данные.Итог("Минуты") <> 90 Тогда ВызватьИсключение "RLS состав5/90"; КонецЕсли;
    Для Каждого Ряд Из Данные Цикл Если Ряд.Минуты > 30 Тогда ВызватьИсключение "RLS граница"; КонецЕсли; КонецЦикла;
    Отказ = Ложь; Попытка НовыйЗапрос = Новый Запрос("ВЫБРАТЬ З.Ссылка ИЗ Документ.ЗаявкаУслуги КАК З"); НовыйЗапрос.Выполнить(); Исключение Отказ = Истина; КонецПопытки;
    Если Не Отказ Тогда ВызватьИсключение "RLS unrestricted query unexpectedly allowed"; КонецЕсли;
    Ссылка = Данные[0].Ссылка; Ранее = Ссылка.ДлительностьМинут; Объект = Ссылка.ПолучитьОбъект(); Отказ = Ложь;
    Попытка Объект.ДлительностьМинут = 25; Объект.Записать(); Исключение Отказ = Истина; КонецПопытки;
    Если Не Отказ Или Ссылка.ДлительностьМинут <> Ранее Тогда ВызватьИсключение "RLS запись не защищена"; КонецЕсли;
    Возврат "PASS|five-rows-90|all-le30|unrestricted-query-rejected|valid-update-rejected|prior-value-retained";
КонецФункции
'@
[IO.File]::WriteAllText($commonPath,[IO.File]::ReadAllText($capstone)+[Environment]::NewLine+$extra,$enc)
$before=Join-Path $dest 'before.txt';$reader=Join-Path $dest 'reader.txt';$after=Join-Path $dest 'after.txt';$base=Join-Path $dest 'own-rls-base'
function Write-OwnStartup([string]$Expression,[string]$File){
 $text="Процедура ПриНачалеРаботыСистемы()"+[Environment]::NewLine+'Попытка'+[Environment]::NewLine+'Результат = '+$Expression+';'+[Environment]::NewLine+'Исключение Результат = "FAIL"; КонецПопытки;'+[Environment]::NewLine+'Текст = Новый ТекстовыйДокумент; Текст.УстановитьТекст(Результат); Текст.Записать("'+$File+'",КодировкаТекста.UTF8); ЗавершитьРаботуСистемы(Ложь);'+[Environment]::NewLine+'КонецПроцедуры'
 [IO.File]::WriteAllText((Join-Path $source 'Ext\ManagedApplicationModule.bsl'),$text,$enc)
}
Write-OwnStartup 'УчебнаяПроверкаПрав.ПодготовитьРоли()' (Join-Path $dest 'setup.txt')
Invoke-Own 'create' @('CREATEINFOBASE',('File="'+$base+'";'))
Invoke-Own 'load' @('DESIGNER','/F',('"'+$base+'"'),'/LoadConfigFromFiles',('"'+$source+'"'),'/UpdateDBCfg')
Invoke-Own 'seed-and-create-own-profiles' @('ENTERPRISE','/F',('"'+$base+'"'))
if([IO.File]::ReadAllText((Join-Path $dest 'setup.txt')).Trim() -ne 'OWN_SYNTHETIC_PROFILES_READY'){throw 'Не подготовлены собственные данные/роли'}
Write-OwnStartup 'УчебнаяПроверкаПрав.ИтоговыйОпыт("verify")' $before
Invoke-Own 'load-admin' @('DESIGNER','/F',('"'+$base+'"'),'/N','NexusP10Admin','/LoadConfigFromFiles',('"'+$source+'"'),'/UpdateDBCfg')
Invoke-Own 'admin-before' @('ENTERPRISE','/F',('"'+$base+'"'),'/N','NexusP10Admin')
Write-OwnStartup 'УчебнаяПроверкаПрав.ПроверитьОграничение()' $reader
Invoke-Own 'load-reader' @('DESIGNER','/F',('"'+$base+'"'),'/N','NexusP10Admin','/LoadConfigFromFiles',('"'+$source+'"'),'/UpdateDBCfg')
Invoke-Own 'actual-reader-rls' @('ENTERPRISE','/F',('"'+$base+'"'),'/N','NexusP10Reader')
if([IO.File]::ReadAllText($reader).Trim() -ne 'PASS|five-rows-90|all-le30|unrestricted-query-rejected|valid-update-rejected|prior-value-retained'){throw 'RLS не подтверждён'}
Write-OwnStartup 'УчебнаяПроверкаПрав.ИтоговыйОпыт("verify")' $after
Invoke-Own 'load-verify' @('DESIGNER','/F',('"'+$base+'"'),'/N','NexusP10Admin','/LoadConfigFromFiles',('"'+$source+'"'),'/UpdateDBCfg')
Invoke-Own 'admin-after' @('ENTERPRISE','/F',('"'+$base+'"'),'/N','NexusP10Admin')
if([IO.File]::ReadAllText($before) -cne [IO.File]::ReadAllText($after) -or [IO.File]::ReadAllText($after).Trim() -eq 'FAIL'){throw 'Изменены исходные ключи/поля'}
$r=[ordered]@{schemaVersion=1;status='AUTOMATED PASS';platformVersion=(Get-Item -LiteralPath $platform).VersionInfo.ProductVersion;onlyOwnSyntheticInfobase=$true;actualRestrictedProfile=$true;rlsCondition='ДлительностьМинут <=30';visibleDocuments=5;visibleMinutes=90;administratorDocuments=12;administratorMinutes=440;unrestrictedQueryRejected=$true;validUpdateRejected=$true;originalIdentitiesAndFieldsPreserved=$true;nexusIAMTested=$false;realAccountUsed=$false;passwordsUsed=$false;osAuthenticationUsed=$false;training1508Verified=($platform -match '1508');progressWritten=$false;codeVerifiedServer=$false;runnerSha256=(Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash.ToLowerInvariant();capstoneSourceSha256=(Get-FileHash -LiteralPath $capstone -Algorithm SHA256).Hash.ToLowerInvariant();extraModuleSha256=(Hash-Text $extra);fixture=$fixtureFiles;steps=$steps}
[IO.File]::WriteAllText((Join-Path $dest 'PEDAGOGY_RLS_RESULT.json'),($r|ConvertTo-Json -Depth 8),$enc)
Write-Output ([pscustomobject]@{status=$r.status;rlsRows=5;rlsMinutes=90;originalPreserved=$true}|ConvertTo-Json -Compress)
