param([Parameter(Mandatory=$true)][string]$Repo,[Parameter(Mandatory=$true)][string]$OutputDirectory,[Parameter(Mandatory=$true)][string]$SourceInfobase,[Parameter(Mandatory=$true)][string]$SourceDirectory,[Parameter(Mandatory=$true)][string]$ExpectedSnapshot)
$ErrorActionPreference='Stop'
$dest=[IO.Path]::GetFullPath($OutputDirectory)
if(Test-Path -LiteralPath $dest){throw 'Нужна новая собственная папка проверки'}
New-Item -ItemType Directory -Path $dest | Out-Null
$enc=[Text.UTF8Encoding]::new($false);$steps=[Collections.Generic.List[object]]::new()
$platform='C:\Program Files\1cv8\8.3.27.2214\bin\1cv8.exe'
function Invoke-Own([string]$Name,[string[]]$Arguments){
 $log=Join-Path $dest ($Name+'.private.log')
 $p=Start-Process -FilePath $platform -ArgumentList ($Arguments+@('/DisableStartupDialogs','/DisableStartupMessages','/Out',('"'+$log+'"'))) -WindowStyle Hidden -PassThru
 if(-not $p.WaitForExit(60000)){$p.Kill();throw 'Таймаут собственного процесса'}
 $p.Refresh();$text=if(Test-Path -LiteralPath $log){[IO.File]::ReadAllText($log)}else{''}
 $class=if($text -match 'лиценз|license'){'LICENSING_MESSAGE_NOT_EXPORTED'}elseif($text -match 'Ошибк|Error|Синтакс|МодульУправляемогоПриложения\('){'PLATFORM_DIAGNOSTIC'}else{'OPERATION_LOG'}
 $steps.Add([pscustomobject]@{name=$Name;exitCode=$p.ExitCode;classification=$class});if($p.ExitCode -ne 0 -or $class -eq 'PLATFORM_DIAGNOSTIC'){throw ('Не выполнен '+$Name)}
}
$upgradeRunner=[IO.File]::ReadAllText((Join-Path $Repo 'tools\check-onec-report-upgrade.ps1'))
$match=[regex]::Match($upgradeRunner,'(?s)\$snapshot=@''\r?\n(.*?)\r?\n''@')
if(-not $match.Success){throw 'Не найден исходный независимый наблюдатель'}
$snapshot=$match.Groups[1].Value
$note=@'
    Клиент = Справочники.Клиенты.НайтиПоКоду("000000001");
    ПроверкаЗаметки = Новый ТекстовыйДокумент;
    ПроверкаЗаметки.УстановитьТекст(Клиент.УчебнаяЗаметка);
    ПроверкаЗаметки.Записать("__NOTE_FILE__",КодировкаТекста.UTF8);
'@
$source=Join-Path $dest 'observer-source';Copy-Item -LiteralPath $SourceDirectory -Destination $source -Recurse
$module=Join-Path $source 'Ext\ManagedApplicationModule.bsl';$original=[IO.File]::ReadAllBytes($module)
$observed=Join-Path $dest 'observed.txt';$noteFile=Join-Path $dest 'note.txt';$backup=Join-Path $dest 'own-gui-state.dt';$base=Join-Path $dest 'observer-base'
$body=$snapshot.Replace('__SNAPSHOT__',$observed).Replace('__REPORT__',$note.Replace('__NOTE_FILE__',$noteFile))
[IO.File]::WriteAllText($module,("#Если ТолстыйКлиентУправляемоеПриложение Тогда`r`nПроцедура ПриНачалеРаботыСистемы()`r`n"+$body+"`r`nКонецПроцедуры`r`n#КонецЕсли`r`n"),$enc)
Invoke-Own 'export-own-gui-base' @('DESIGNER','/F',('"'+$SourceInfobase+'"'),'/DumpIB',('"'+$backup+'"'))
$ownBaseHash=(Get-FileHash -LiteralPath (Join-Path $SourceInfobase '1Cv8.1CD') -Algorithm SHA256).Hash.ToLowerInvariant()
Invoke-Own 'create-observer-base' @('CREATEINFOBASE',('File="'+$base+'";'))
Invoke-Own 'restore-only-in-observer' @('DESIGNER','/F',('"'+$base+'"'),'/RestoreIB',('"'+$backup+'"'))
Invoke-Own 'load-readonly-observer' @('DESIGNER','/F',('"'+$base+'"'),'/LoadConfigFromFiles',('"'+$source+'"'),'/UpdateDBCfg')
Invoke-Own 'check-observer' @('DESIGNER','/F',('"'+$base+'"'),'/CheckConfig','-ThinClient','-ThickClientManagedApplication','-Server','-ConfigLogicalIntegrity')
Invoke-Own 'read-observer-state' @('ENTERPRISE','/F',('"'+$base+'"'))
$beforeLines=@([IO.File]::ReadAllLines($ExpectedSnapshot)|Where-Object{$_}|Sort-Object)
$afterLines=@([IO.File]::ReadAllLines($observed)|Where-Object{$_}|Sort-Object)
if($beforeLines.Count -ne 7 -or (Compare-Object $beforeLines $afterLines)){throw 'Прежние идентичности или поля отличаются'}
if([IO.File]::ReadAllText($noteFile).Trim() -ne 'Учебная заметка сохранена в новой копии.'){throw 'Заметка не сохранилась'}
if((Get-FileHash -LiteralPath (Join-Path $SourceInfobase '1Cv8.1CD') -Algorithm SHA256).Hash.ToLowerInvariant() -ne $ownBaseHash){throw 'Наблюдатель изменил собственную GUI базу'}
[IO.File]::WriteAllBytes($module,$original)
Invoke-Own 'restore-observer-startup' @('DESIGNER','/F',('"'+$base+'"'),'/LoadConfigFromFiles',('"'+$source+'"'),'/UpdateDBCfg')
$r=[ordered]@{schemaVersion=1;status='AUTOMATED PASS';platformVersion='8.3.27.2214';scope='Separate synthetic copy after GUI-added attribute; old fields compared with pre-upgrade independent snapshot';documentIdentitiesPreserved=4;catalogIdentitiesPreserved=3;oldNamesCodesNumbersDatesReferencesMinutesStatusesCommentsMarksPostingPreserved=$true;newNotePersisted=$true;sourceGuiBaseUnchangedByObserver=$true;observerUsesSeparateRestoredBase=$true;observerStartupRestored=$true;training1508Verified=$false;codeVerifiedServer=$false;progressWritten=$false;realAccountUsed=$false;runnerSha256=(Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash.ToLowerInvariant();originalObserverRunnerSha256=(Get-FileHash -LiteralPath (Join-Path $Repo 'tools\check-onec-report-upgrade.ps1') -Algorithm SHA256).Hash.ToLowerInvariant();catalogMetadataSha256=(Get-FileHash -LiteralPath (Join-Path $SourceDirectory 'Catalogs\Клиенты.xml') -Algorithm SHA256).Hash.ToLowerInvariant();steps=$steps}
[IO.File]::WriteAllText((Join-Path $dest 'ATTRIBUTE_PRESERVATION_RESULT.json'),($r|ConvertTo-Json -Depth 8),$enc)
Write-Output ($r|ConvertTo-Json -Depth 8 -Compress)
