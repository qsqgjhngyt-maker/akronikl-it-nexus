param([Parameter(Mandatory=$true)][string]$Repo,[Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference='Stop';$enc=[Text.UTF8Encoding]::new($false);$Repo=[IO.Path]::GetFullPath($Repo)
$dest=[IO.Path]::GetFullPath($OutputDirectory);if(Test-Path -LiteralPath $dest){throw 'Нужна новая папка проверки'};New-Item -ItemType Directory -Path $dest|Out-Null
$platform='C:\Program Files\1cv8\8.3.27.2214\bin\1cv8.exe';$steps=[Collections.Generic.List[object]]::new()
function Invoke-Own([string]$Name,[string[]]$Arguments){
 $log=Join-Path $dest ($Name+'.private.log');$p=Start-Process -FilePath $platform -ArgumentList ($Arguments+@('/DisableStartupDialogs','/DisableStartupMessages','/Out',('"'+$log+'"'))) -WindowStyle Hidden -PassThru
 if(-not $p.WaitForExit(45000)){$p.Kill();throw 'Таймаут собственного процесса'};$p.Refresh();$text=if(Test-Path -LiteralPath $log){[IO.File]::ReadAllText($log)}else{''}
 $class=if($text -match 'лиценз|license'){'LICENSING_MESSAGE_NOT_EXPORTED'}elseif($text -match 'Ошибк|Error|Синтакс|МодульУправляемогоПриложения\('){'PLATFORM_DIAGNOSTIC'}else{'OPERATION_LOG'};$steps.Add([pscustomobject]@{name=$Name;exitCode=$p.ExitCode;classification=$class});if($p.ExitCode -ne 0 -or $class -eq 'PLATFORM_DIAGNOSTIC'){throw ('Не выполнен '+$Name)}
}
$public='docs\ru\03-content\onec\pedagogy-v2-20261102';$teaching=Join-Path $Repo 'courses\onec-education\native\service-desk-teaching-v2'
$commonMetadata=[IO.File]::ReadAllText((Join-Path $Repo 'courses\onec-education\native\service-desk-advanced\CommonModules\УчебныеЗадания.xml')).Replace('УчебныеЗадания','УчебныеЛаборатории').Replace('1f0db6e0-2d5c-41ed-ae43-0dcc40799bb8','3cce61b3-27ac-40a2-bdd1-374f4313f9bd')
$commonSource=Join-Path $Repo ($public+'\engineering\a5-preservation-common.bsl')
function Prepare-Source([string]$Name,[string]$Fixture){
 $src=Join-Path $dest $Name;Copy-Item -LiteralPath $Fixture -Destination $src -Recurse
 $cfg=Join-Path $src 'Configuration.xml';[IO.File]::WriteAllText($cfg,[IO.File]::ReadAllText($cfg).Replace('<ChildObjects>','<ChildObjects><CommonModule>УчебныеЛаборатории</CommonModule>'),$enc)
 $module=Join-Path $src 'CommonModules\УчебныеЛаборатории\Ext';New-Item -ItemType Directory -Path $module -Force|Out-Null
 [IO.File]::WriteAllText((Join-Path $src 'CommonModules\УчебныеЛаборатории.xml'),$commonMetadata,$enc)
 # Baseline has no table yet: do not compile the later verification function there.
 $body=[IO.File]::ReadAllText($commonSource);if($Name -eq 'baseline-source'){$body=$body.Substring(0,$body.IndexOf('Процедура Утверждение'))}
 [IO.File]::WriteAllText((Join-Path $module 'Module.bsl'),$body,$enc);return $src
}
$baseline=Prepare-Source 'baseline-source' (Join-Path $Repo 'courses\onec-education\native\service-desk-reports-v2')
Copy-Item -LiteralPath (Join-Path $teaching 'Catalogs\Клиенты.xml') -Destination (Join-Path $baseline 'Catalogs\Клиенты.xml')
$original=Join-Path $dest 'original-base';$copy=Join-Path $dest 'upgraded-copy';$before=Join-Path $dest 'before.txt';$after=Join-Path $dest 'after.txt';$proof=Join-Path $dest 'checks.txt';$backup=Join-Path $dest 'own-backup.dt'
$seed=@"
Процедура ПриНачалеРаботыСистемы()
    Текст = Новый ТекстовыйДокумент;
    Текст.УстановитьТекст(УчебныеЛаборатории.ПодготовитьИсходник());
    Текст.Записать("$before",КодировкаТекста.UTF8);
    ЗавершитьРаботуСистемы(Ложь);
КонецПроцедуры
"@
[IO.File]::WriteAllText((Join-Path $baseline 'Ext\ManagedApplicationModule.bsl'),$seed,$enc)
Invoke-Own 'create-original' @('CREATEINFOBASE',('File="'+$original+'";'))
Invoke-Own 'load-original' @('DESIGNER','/F',('"'+$original+'"'),'/LoadConfigFromFiles',('"'+$baseline+'"'),'/UpdateDBCfg')
Invoke-Own 'seed-original' @('ENTERPRISE','/F',('"'+$original+'"'))
if(-not(Test-Path -LiteralPath $before)){throw 'Нет исходного снимка'}
Invoke-Own 'backup-original' @('DESIGNER','/F',('"'+$original+'"'),'/DumpIB',('"'+$backup+'"'))
$originalHash=(Get-FileHash -LiteralPath (Join-Path $original '1Cv8.1CD') -Algorithm SHA256).Hash
Invoke-Own 'create-copy' @('CREATEINFOBASE',('File="'+$copy+'";'))
Invoke-Own 'restore-copy' @('DESIGNER','/F',('"'+$copy+'"'),'/RestoreIB',('"'+$backup+'"'))
$extended=Prepare-Source 'extended-source' $teaching
$verify=@"
Процедура ПриНачалеРаботыСистемы()
    Текст = Новый ТекстовыйДокумент;
    Текст.УстановитьТекст(УчебныеЛаборатории.СнимокИсходника());
    Текст.Записать("$after",КодировкаТекста.UTF8);
    Результат = УчебныеЛаборатории.ПроверитьНовыеДанные();
    Форма = ПолучитьФорму("Документ.ЗаявкаУслуги.Форма.УчебнаяФормаЗаявки", Новый Структура("Ключ",Результат.Ссылка));
    Если Форма = Неопределено Или Форма.Объект.Ссылка <> Результат.Ссылка Тогда ВызватьИсключение "A5 form identity"; КонецЕсли;
    Форма.Открыть();
    Если Не Форма.Открыта() Или Форма.Объект.Работы.Количество() <> 2 Или Форма.Элементы.Найти("Работы") = Неопределено Тогда ВызватьИсключение "A5 form rows"; КонецЕсли;
    Форма.Модифицированность = Ложь; Форма.Закрыть();
    Вывод = "";
    Для Каждого Имя Из Результат.Проверки Цикл Вывод = Вывод + Имя + Символы.ПС; КонецЦикла;
    Вывод = Вывод + "native-form-created-opened-two-rows";
    Текст.УстановитьТекст(Вывод); Текст.Записать("$proof",КодировкаТекста.UTF8);
    ЗавершитьРаботуСистемы(Ложь);
КонецПроцедуры
"@
[IO.File]::WriteAllText((Join-Path $extended 'Ext\ManagedApplicationModule.bsl'),$verify,$enc)
Invoke-Own 'upgrade-copy' @('DESIGNER','/F',('"'+$copy+'"'),'/LoadConfigFromFiles',('"'+$extended+'"'),'/UpdateDBCfg')
Invoke-Own 'check-copy' @('DESIGNER','/F',('"'+$copy+'"'),'/CheckConfig','-ThinClient','-ThickClientManagedApplication','-Server','-ConfigLogicalIntegrity')
Invoke-Own 'verify-copy' @('ENTERPRISE','/F',('"'+$copy+'"'))
if(-not(Test-Path -LiteralPath $proof) -or [IO.File]::ReadAllText($before) -cne [IO.File]::ReadAllText($after)){throw 'Сохранность не подтверждена'}
if((Get-FileHash -LiteralPath (Join-Path $original '1Cv8.1CD') -Algorithm SHA256).Hash -ne $originalHash){throw 'Исходная база изменилась'}
$checks=@([IO.File]::ReadAllLines($proof)|Where-Object {$_});if($checks.Count -ne 7){throw 'Неполные проверки'}
$fixture=@(Get-ChildItem -LiteralPath $teaching -File -Recurse|ForEach-Object{[pscustomobject]@{path=$_.FullName.Substring($teaching.Length+1).Replace('\','/');sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}})
$r=[ordered]@{schemaVersion=1;status='AUTOMATED PASS';platformVersion='8.3.27.2214';onlyOwnSyntheticInfobase=$true;restoredSeparateCopy=$true;originalFileUnchanged=$true;oldIdentitiesAndAllSnapshotFieldsPreserved=$true;oldA4NotePreserved=$true;training1508Verified=$false;namedExplicitFormWizardVerified=$false;realAccountUsed=$false;progressWritten=$false;codeVerifiedServer=$false;runnerSha256=(Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash.ToLowerInvariant();sourceSha256=(Get-FileHash -LiteralPath $commonSource -Algorithm SHA256).Hash.ToLowerInvariant();fixture=$fixture;checks=$checks;steps=$steps}
[IO.File]::WriteAllText((Join-Path $dest 'A5_PRESERVATION_RESULT.json'),($r|ConvertTo-Json -Depth 8),$enc)
Write-Output ([pscustomobject]@{status=$r.status;checks=$checks.Count;sourcePreserved=$true;oldFieldsPreserved=$true}|ConvertTo-Json -Compress)
