param([Parameter(Mandatory=$true)][string]$Repo,[Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference='Stop';$enc=[Text.UTF8Encoding]::new($false);$Repo=[IO.Path]::GetFullPath($Repo)
$dest=[IO.Path]::GetFullPath($OutputDirectory);if(Test-Path -LiteralPath $dest){throw 'Нужна новая папка проверки'};New-Item -ItemType Directory -Path $dest|Out-Null
$platform='C:\Program Files\1cv8\8.3.27.2214\bin\1cv8.exe';$steps=[Collections.Generic.List[object]]::new()
function Invoke-Own([string]$Name,[string[]]$Arguments){
 $log=Join-Path $dest ($Name+'.private.log');$p=Start-Process -FilePath $platform -ArgumentList ($Arguments+@('/DisableStartupDialogs','/DisableStartupMessages','/Out',('"'+$log+'"'))) -WindowStyle Hidden -PassThru
 if(-not $p.WaitForExit(45000)){$p.Kill();throw 'Таймаут собственного процесса'};$p.Refresh();$text=if(Test-Path -LiteralPath $log){[IO.File]::ReadAllText($log)}else{''}
 $class=if($text -match 'лиценз|license'){'LICENSING_MESSAGE_NOT_EXPORTED'}elseif($text -match 'Ошибк|Error|Синтакс|МодульУправляемогоПриложения\('){'PLATFORM_DIAGNOSTIC'}else{'OPERATION_LOG'};$steps.Add([pscustomobject]@{name=$Name;exitCode=$p.ExitCode;classification=$class});if($p.ExitCode -ne 0 -or $class -eq 'PLATFORM_DIAGNOSTIC'){throw ('Не выполнен '+$Name)}
}
$public='docs\ru\03-content\onec\pedagogy-v2-20261102';$fixture=Join-Path $Repo 'courses\onec-education\native\service-desk-administration-v2'
$moduleSource=Join-Path $Repo ($public+'\engineering\a6-administration-common.bsl')
$moduleXml=[IO.File]::ReadAllText((Join-Path $Repo 'courses\onec-education\native\service-desk-advanced\CommonModules\УчебныеЗадания.xml')).Replace('УчебныеЗадания','УчебноеАдминистрирование').Replace('1f0db6e0-2d5c-41ed-ae43-0dcc40799bb8','d2e71bd8-b546-44da-b09b-a5838d67945b')
function Prepare-Source([string]$Name,[string]$Template){
 $src=Join-Path $dest $Name;Copy-Item -LiteralPath $Template -Destination $src -Recurse
 $cfg=Join-Path $src 'Configuration.xml';[IO.File]::WriteAllText($cfg,[IO.File]::ReadAllText($cfg).Replace('<ChildObjects>','<ChildObjects><CommonModule>УчебноеАдминистрирование</CommonModule>'),$enc)
 $module=Join-Path $src 'CommonModules\УчебноеАдминистрирование\Ext';New-Item -ItemType Directory -Path $module -Force|Out-Null
 [IO.File]::WriteAllText((Join-Path $src 'CommonModules\УчебноеАдминистрирование.xml'),$moduleXml,$enc)
 [IO.File]::WriteAllText((Join-Path $module 'Module.bsl'),[IO.File]::ReadAllText($moduleSource),$enc);return $src
}
function Write-Startup([string]$Source,[string]$Body){
 $startup="Процедура ПриНачалеРаботыСистемы()"+[Environment]::NewLine+$Body+[Environment]::NewLine+"    ЗавершитьРаботуСистемы(Ложь);"+[Environment]::NewLine+"КонецПроцедуры"
 [IO.File]::WriteAllText((Join-Path $Source 'Ext\ManagedApplicationModule.bsl'),$startup,$enc)
}
$original=Join-Path $dest 'own-original';$copy=Join-Path $dest 'own-restored-copy';$backup=Join-Path $dest 'own-before.dt'
$before=Join-Path $dest 'before.txt';$after=Join-Path $dest 'after-upgrade.txt';$setup=Join-Path $dest 'setup.txt';$reader=Join-Path $dest 'reader.txt';$admin=Join-Path $dest 'admin.txt';$afterReader=Join-Path $dest 'after-reader.txt'
$baseline=Prepare-Source 'baseline-source' (Join-Path $Repo 'courses\onec-education\native\service-desk-teaching-v2')
Write-Startup $baseline @"
    Текст = Новый ТекстовыйДокумент; Текст.УстановитьТекст(УчебноеАдминистрирование.ПодготовитьA6());
    Текст.Записать("$before",КодировкаТекста.UTF8);
"@
Invoke-Own 'create-original' @('CREATEINFOBASE',('File="'+$original+'";'))
Invoke-Own 'load-original' @('DESIGNER','/F',('"'+$original+'"'),'/LoadConfigFromFiles',('"'+$baseline+'"'),'/UpdateDBCfg')
Invoke-Own 'seed-original' @('ENTERPRISE','/F',('"'+$original+'"'))
if(-not(Test-Path -LiteralPath $before)){throw 'Нет исходного снимка'}
Invoke-Own 'backup-original' @('DESIGNER','/F',('"'+$original+'"'),'/DumpIB',('"'+$backup+'"'))
$originalHash=(Get-FileHash -LiteralPath (Join-Path $original '1Cv8.1CD') -Algorithm SHA256).Hash
Invoke-Own 'create-separate-copy' @('CREATEINFOBASE',('File="'+$copy+'";'))
Invoke-Own 'restore-separate-copy' @('DESIGNER','/F',('"'+$copy+'"'),'/RestoreIB',('"'+$backup+'"'))
$extended=Prepare-Source 'upgraded-source' $fixture
Write-Startup $extended @"
    Текст = Новый ТекстовыйДокумент; Текст.УстановитьТекст(УчебноеАдминистрирование.СнимокA6()); Текст.Записать("$after",КодировкаТекста.UTF8);
    Проверки = УчебноеАдминистрирование.ПодготовитьПрофилиA6(); Вывод = "";
    Для Каждого Имя Из Проверки Цикл Вывод = Вывод + Имя + Символы.ПС; КонецЦикла;
    Текст.УстановитьТекст(Вывод); Текст.Записать("$setup",КодировкаТекста.UTF8);
"@
Invoke-Own 'upgrade-copy' @('DESIGNER','/F',('"'+$copy+'"'),'/LoadConfigFromFiles',('"'+$extended+'"'),'/UpdateDBCfg')
Invoke-Own 'check-copy' @('DESIGNER','/F',('"'+$copy+'"'),'/CheckConfig','-ThinClient','-ThickClientManagedApplication','-Server','-ConfigLogicalIntegrity')
Invoke-Own 'setup-own-profiles' @('ENTERPRISE','/F',('"'+$copy+'"'))
if(-not(Test-Path -LiteralPath $setup) -or [IO.File]::ReadAllText($before) -cne [IO.File]::ReadAllText($after)){throw 'Обновление не сохранило исходные данные'}
Write-Startup $extended @"
    Проверки = УчебноеАдминистрирование.ПроверитьЧитателяA6(); Вывод = "";
    Для Каждого Имя Из Проверки Цикл Вывод = Вывод + Имя + Символы.ПС; КонецЦикла;
    Текст = Новый ТекстовыйДокумент; Текст.УстановитьТекст(Вывод); Текст.Записать("$reader",КодировкаТекста.UTF8);
"@
Invoke-Own 'load-reader-check' @('DESIGNER','/F',('"'+$copy+'"'),'/N','NexusA6Admin','/LoadConfigFromFiles',('"'+$extended+'"'),'/UpdateDBCfg')
Invoke-Own 'reader-read-and-reject-write' @('ENTERPRISE','/F',('"'+$copy+'"'),'/N','NexusA6Reader')
if(-not(Test-Path -LiteralPath $reader)){throw 'Нет доказательства ограниченного профиля'}
Write-Startup $extended @"
    Текст = Новый ТекстовыйДокумент; Текст.УстановитьТекст(УчебноеАдминистрирование.СнимокA6()); Текст.Записать("$afterReader",КодировкаТекста.UTF8);
    Проверки = УчебноеАдминистрирование.ПроверитьОбновлениеA6(); Вывод = "";
    Для Каждого Имя Из Проверки Цикл Вывод = Вывод + Имя + Символы.ПС; КонецЦикла;
    Текст.УстановитьТекст(Вывод); Текст.Записать("$admin",КодировкаТекста.UTF8);
"@
Invoke-Own 'load-admin-check' @('DESIGNER','/F',('"'+$copy+'"'),'/N','NexusA6Admin','/LoadConfigFromFiles',('"'+$extended+'"'),'/UpdateDBCfg')
Invoke-Own 'admin-update-and-diagnosis' @('ENTERPRISE','/F',('"'+$copy+'"'),'/N','NexusA6Admin')
if(-not(Test-Path -LiteralPath $admin) -or [IO.File]::ReadAllText($before) -cne [IO.File]::ReadAllText($afterReader)){throw 'Отказ прав не сохранил исходное состояние'}
if((Get-FileHash -LiteralPath (Join-Path $original '1Cv8.1CD') -Algorithm SHA256).Hash -ne $originalHash){throw 'Исходная база изменена'}
$checks=@();foreach($file in @($setup,$reader,$admin)){$checks+=@([IO.File]::ReadAllLines($file)|Where-Object {$_})};if($checks.Count -ne 10){throw 'Неполный протокол'}
$files=@(Get-ChildItem -LiteralPath $fixture -File -Recurse|ForEach-Object{[pscustomobject]@{path=$_.FullName.Substring($fixture.Length+1).Replace('\','/');sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}})
$r=[ordered]@{schemaVersion=1;status='AUTOMATED PASS';platformVersion='8.3.27.2214';onlyOwnSyntheticInfobase=$true;separateDtRestoredCopy=$true;originalFileUnchanged=$true;oldIdentitiesAndFieldsPreserved=$true;readerRejectedValidWritePreservedData=$true;originalControlMinutes=75;changedCopyControlMinutes=90;rlsTested=$false;nexusIAMTested=$false;productionAccountUsed=$false;passwordsUsed=$false;osAuthenticationUsed=$false;training1508Verified=$false;allLearnerGuiStepsVerified=$false;progressWritten=$false;codeVerifiedServer=$false;runnerSha256=(Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash.ToLowerInvariant();moduleSourceSha256=(Get-FileHash -LiteralPath $moduleSource -Algorithm SHA256).Hash.ToLowerInvariant();fixture=$files;checks=$checks;steps=$steps}
[IO.File]::WriteAllText((Join-Path $dest 'A6_ADMINISTRATION_RESULT.json'),($r|ConvertTo-Json -Depth 8),$enc)
Write-Output ([pscustomobject]@{status=$r.status;checks=$checks.Count;ownSourcePreserved=$true;ownReaderWriteRejected=$true}|ConvertTo-Json -Compress)
