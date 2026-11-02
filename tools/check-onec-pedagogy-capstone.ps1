param([Parameter(Mandatory=$true)][string]$Repo,[Parameter(Mandatory=$true)][string]$OutputDirectory,[string]$SourceDirectory,[string]$PlatformPath)
$ErrorActionPreference='Stop';$enc=[Text.UTF8Encoding]::new($false);$Repo=[IO.Path]::GetFullPath($Repo)
$code=if($SourceDirectory){[IO.Path]::GetFullPath($SourceDirectory)}else{Join-Path $Repo 'courses\onec-education\code\pedagogy'}
$dest=[IO.Path]::GetFullPath($OutputDirectory);if(Test-Path -LiteralPath $dest){throw 'Нужна новая папка проверки'};New-Item -ItemType Directory -Path $dest|Out-Null
$fixturePath=Join-Path $Repo 'courses\onec-education\native\service-desk-professional-v2'
$fixtureFiles=@(Get-ChildItem -LiteralPath $fixturePath -Recurse -File|ForEach-Object{[pscustomobject]@{path=$_.FullName.Substring($fixturePath.Length+1).Replace('\','/');sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}})
$source=Join-Path $dest 'source';Copy-Item -LiteralPath $fixturePath -Destination $source -Recurse
$platform=if($PlatformPath){[IO.Path]::GetFullPath($PlatformPath)}else{'C:\Program Files\1cv8\8.3.27.2214\bin\1cv8.exe'};$steps=[Collections.Generic.List[object]]::new();$cases=[Collections.Generic.List[object]]::new()
function Invoke-Own([string]$Name,[string[]]$Arguments){
 $log=Join-Path $dest ($Name+'.private.log');$p=Start-Process -FilePath $platform -ArgumentList ($Arguments+@('/DisableStartupDialogs','/DisableStartupMessages','/Out',('"'+$log+'"'))) -WindowStyle Hidden -PassThru
 if(-not $p.WaitForExit(45000)){$p.Kill();throw 'Таймаут собственного процесса'};$p.Refresh();$text=if(Test-Path -LiteralPath $log){[IO.File]::ReadAllText($log)}else{''}
 $class=if($text -match 'лиценз|license'){'LICENSING_MESSAGE_NOT_EXPORTED'}elseif($text -match 'Ошибк|Error|Синтакс|МодульУправляемогоПриложения\('){'PLATFORM_DIAGNOSTIC'}else{'OPERATION_LOG'};$steps.Add([pscustomobject]@{name=$Name;exitCode=$p.ExitCode;classification=$class});if($p.ExitCode -ne 0 -or $class -eq 'PLATFORM_DIAGNOSTIC'){throw ('Не выполнен '+$Name)}
}
function Hash-Text([string]$s){$h=[Security.Cryptography.SHA256]::Create();try{([BitConverter]::ToString($h.ComputeHash($enc.GetBytes($s)))).Replace('-','').ToLowerInvariant()}finally{$h.Dispose()}}
$xml=[IO.File]::ReadAllText((Join-Path $Repo 'courses\onec-education\native\service-desk-advanced\CommonModules\УчебныеЗадания.xml')).Replace('УчебныеЗадания','УчебнаяИтоговая').Replace('1f0db6e0-2d5c-41ed-ae43-0dcc40799bb8','b0238c14-b361-44a1-9dd6-eeb28f227c4d').Replace('Оригинальная учебная фоновая операция','Оригинальные учебные опыты документа и транзакций в отдельной базе')
$commonPath=Join-Path $source 'CommonModules\УчебнаяИтоговая\Ext\Module.bsl';New-Item -ItemType Directory -Path (Split-Path $commonPath -Parent) -Force|Out-Null
[IO.File]::WriteAllText((Join-Path $source 'CommonModules\УчебнаяИтоговая.xml'),$xml,$enc)
$cfg=Join-Path $source 'Configuration.xml';[IO.File]::WriteAllText($cfg,[IO.File]::ReadAllText($cfg).Replace('<ChildObjects>','<ChildObjects><CommonModule>УчебнаяИтоговая</CommonModule>'),$enc)

$moduleSource=Join-Path $Repo 'docs\ru\03-content\onec\pedagogy-v2-20261102\engineering\capstone-current-common.bsl'
[IO.File]::WriteAllText($commonPath,[IO.File]::ReadAllText($moduleSource),$enc)
$startup=@'
Процедура ПриНачалеРаботыСистемы()
    Части = СтрРазделить(ПараметрЗапуска,"|");
    Попытка
        Итог = УчебнаяИтоговая.ИтоговыйОпыт(Части[0]); Текст = Новый ТекстовыйДокумент; Текст.УстановитьТекст(Итог); Текст.Записать(Части[1],КодировкаТекста.UTF8);
    Исключение
        Текст = Новый ТекстовыйДокумент; Текст.УстановитьТекст(ОписаниеОшибки()); Текст.Записать(Части[1]+".private-error",КодировкаТекста.UTF8);
    КонецПопытки;
    ЗавершитьРаботуСистемы(Ложь);
КонецПроцедуры
'@
[IO.File]::WriteAllText((Join-Path $source 'Ext\ManagedApplicationModule.bsl'),$startup,$enc)
function Run-Own([string]$Name,[string]$Base,[string]$Mode){$file=Join-Path $dest ($Name+'.txt');Invoke-Own $Name @('ENTERPRISE','/F',('"'+$Base+'"'),'/C',('"'+$Mode+'|'+$file+'"'));if(-not(Test-Path -LiteralPath $file)){throw 'Нет снимка итоговой работы'};return [IO.File]::ReadAllText($file)}
$base=Join-Path $dest 'own-original';$copy=Join-Path $dest 'own-restored-copy';$dump=Join-Path $dest 'before.private.dt'
Invoke-Own 'create-original' @('CREATEINFOBASE',('File="'+$base+'";'))
Invoke-Own 'load-original' @('DESIGNER','/F',('"'+$base+'"'),'/LoadConfigFromFiles',('"'+$source+'"'),'/UpdateDBCfg')
Invoke-Own 'check-contexts' @('DESIGNER','/F',('"'+$base+'"'),'/CheckConfig','-ThinClient','-ThickClientManagedApplication','-Server','-ConfigLogicalIntegrity')
$before=Run-Own 'seed-12-440' $base 'seed';$reopen=Run-Own 'reopen-original' $base 'verify'
if($before -cne $reopen){throw 'Повторное открытие изменило ключи/поля'}
Invoke-Own 'backup' @('DESIGNER','/F',('"'+$base+'"'),'/DumpIB',('"'+$dump+'"'))
Invoke-Own 'create-copy' @('CREATEINFOBASE',('File="'+$copy+'";'))
Invoke-Own 'restore-copy' @('DESIGNER','/F',('"'+$copy+'"'),'/RestoreIB',('"'+$dump+'"'))
$restored=Run-Own 'restored-identical' $copy 'verify';if($before -cne $restored){throw 'DT не сохранил ключи/поля'}
$invalid=Run-Own 'invalid-1441-preserves-30' $copy 'invalid';if($before -cne $invalid){throw 'Отказ изменил источник'}
$edited=Run-Own 'copy-455' $copy 'edit';$again=Run-Own 'copy-reopen-455' $copy 'verify-copy';if($edited -cne $again -or $before -ceq $edited){throw 'Изменение копии не доказано'}
$after=Run-Own 'original-still-440' $base 'verify';if($before -cne $after){throw 'Исходные ключи/поля изменены'}
$checks=@('twelve-records-440','odd-customer-six-225','even-customer-six-215','same-label-distinct-empty-reference','reopen-identities-and-fields','dt-restore-identities-and-fields','invalid-1441-keeps-30','copy-last-65-to-80-total-455','copy-reopen-455','original-still-440')
$r=[ordered]@{schemaVersion=1;status='AUTOMATED PASS';platformVersion=(Get-Item -LiteralPath $platform).VersionInfo.ProductVersion;onlyOwnSyntheticInfobase=$true;separateDtRestoredCopy=$true;oldIdentitiesAndFieldsPreserved=$true;originalControlMinutes=440;changedCopyControlMinutes=455;studentWorkAssessed=$false;authorshipProved=$false;allLearnerGuiStepsVerified=$false;training1508Verified=($platform -match '1508');progressWritten=$false;codeVerifiedServer=$false;runnerSha256=(Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash.ToLowerInvariant();moduleSourceSha256=(Get-FileHash -LiteralPath $moduleSource -Algorithm SHA256).Hash.ToLowerInvariant();originalSnapshotSha256=(Hash-Text $before);restoredSnapshotSha256=(Hash-Text $restored);finalOriginalSnapshotSha256=(Hash-Text $after);changedCopySnapshotSha256=(Hash-Text $edited);checks=$checks;fixture=$fixtureFiles;steps=$steps}
[IO.File]::WriteAllText((Join-Path $dest 'PEDAGOGY_CAPSTONE_RESULT.json'),($r|ConvertTo-Json -Depth 8),$enc)
Write-Output ([pscustomobject]@{status=$r.status;checks=$checks.Count;originalPreserved=$true}|ConvertTo-Json -Compress)
