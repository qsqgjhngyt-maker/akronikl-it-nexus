param([Parameter(Mandatory=$true)][string]$Repo,[Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference='Stop'
$platform='C:\Program Files\1cv8\8.3.27.2214\bin\1cv8.exe'
if(-not(Test-Path -LiteralPath $platform -PathType Leaf)){throw 'Официальная платформа отсутствует'}
$dest=[IO.Path]::GetFullPath($OutputDirectory)
if(Test-Path -LiteralPath $dest){throw 'Нужен новый каталог проверки'}
New-Item -ItemType Directory -Path $dest | Out-Null
$steps=[Collections.Generic.List[object]]::new()
function Invoke-OwnPlatform([string]$Name,[string[]]$Arguments){
 $log=Join-Path $dest ($Name+'.private.log')
 $process=Start-Process -FilePath $platform -ArgumentList ($Arguments+@('/DisableStartupDialogs','/DisableStartupMessages','/Out',('"'+$log+'"'))) -WindowStyle Hidden -PassThru
 if(-not $process.WaitForExit(60000)){$process.Kill();throw ('Таймаут только своего тестового процесса: '+$Name)}
 $text=if(Test-Path -LiteralPath $log){[IO.File]::ReadAllText($log)}else{''}
 $class=if($text -match 'лиценз|license'){'LICENSING_MESSAGE_NOT_EXPORTED'}elseif($text -match 'Ошибк|Error|Синтакс|МодульУправляемогоПриложения\('){'PLATFORM_DIAGNOSTIC'}else{'OPERATION_LOG'}
 $steps.Add([pscustomobject]@{name=$Name;exitCode=$process.ExitCode;classification=$class})
 if($process.ExitCode -ne 0 -or $class -eq 'PLATFORM_DIAGNOSTIC'){throw ('Не выполнен '+$Name+'; '+$class)}
}
$source=Join-Path $Repo 'courses\onec-education\native\service-desk-reports-v2'
$base=Join-Path $dest 'assembled';$copy=Join-Path $dest 'roundtrip';$cf=Join-Path $dest 'NexusTrainingServiceDeskReportsV2.cf';$roundtrip=Join-Path $dest 'roundtrip-source'
Invoke-OwnPlatform 'create' @('CREATEINFOBASE',('File="'+$base+'";'))
Invoke-OwnPlatform 'load-original-source' @('DESIGNER','/F',('"'+$base+'"'),'/LoadConfigFromFiles',('"'+$source+'"'),'/UpdateDBCfg')
Invoke-OwnPlatform 'check-source' @('DESIGNER','/F',('"'+$base+'"'),'/CheckConfig','-ThinClient','-ThickClientManagedApplication','-Server','-ConfigLogicalIntegrity')
Invoke-OwnPlatform 'dump-cf' @('DESIGNER','/F',('"'+$base+'"'),'/DumpCfg',('"'+$cf+'"'))
Invoke-OwnPlatform 'create-roundtrip' @('CREATEINFOBASE',('File="'+$copy+'";'))
Invoke-OwnPlatform 'load-cf' @('DESIGNER','/F',('"'+$copy+'"'),'/LoadCfg',('"'+$cf+'"'),'/UpdateDBCfg')
Invoke-OwnPlatform 'check-roundtrip' @('DESIGNER','/F',('"'+$copy+'"'),'/CheckConfig','-ThinClient','-ThickClientManagedApplication','-Server','-ConfigLogicalIntegrity')
New-Item -ItemType Directory -Path $roundtrip | Out-Null
Invoke-OwnPlatform 'dump-roundtrip-source' @('DESIGNER','/F',('"'+$copy+'"'),'/DumpConfigToFiles',('"'+$roundtrip+'"'))
$module='Ext\ManagedApplicationModule.bsl';$expected=[IO.File]::ReadAllText((Join-Path $source $module)).Replace("`r`n","`n").Trim();$observed=[IO.File]::ReadAllText((Join-Path $roundtrip $module)).Replace("`r`n","`n").Trim()
if($expected -ne $observed){throw 'Исходник модуля после CF не совпал'}
$manifest=[ordered]@{schemaVersion=1;status='AUTOMATED PASS';platformVersion='8.3.27.2214';artifact='NexusTrainingServiceDeskReportsV2.cf';artifactSha256=(Get-FileHash -LiteralPath $cf -Algorithm SHA256).Hash.ToLowerInvariant();bytes=(Get-Item -LiteralPath $cf).Length;moduleRoundtripEqual=$true;applicationDataIncluded=$false;platformRedistributed=$false;training1508CfImportVerified=$false;runtimeExecutionClaimed=$false;steps=$steps}
[IO.File]::WriteAllText((Join-Path $dest 'REPORT_CF_RESULT.json'),($manifest|ConvertTo-Json -Depth 8),[Text.UTF8Encoding]::new($false))
Write-Output ($manifest|ConvertTo-Json -Depth 8 -Compress)
