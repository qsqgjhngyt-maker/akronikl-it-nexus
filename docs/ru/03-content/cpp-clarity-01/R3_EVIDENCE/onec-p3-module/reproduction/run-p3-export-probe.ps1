$ErrorActionPreference='Stop';$taskRoot=Join-Path $PSScriptRoot 'onec-p3-export-probe';$taskBase=Join-Path $taskRoot 'base';$taskSource=Join-Path $taskRoot 'source';$taskExe='C:/Program Files/1cv8/8.3.27.2214/bin/1cv8.exe';$taskSteps=[Collections.Generic.List[object]]::new()
function Invoke-Probe([string]$name,[string[]]$ops){$log=Join-Path $taskRoot ($name+'.private.log');$p=Start-Process -FilePath $taskExe -ArgumentList ($ops+@('/DisableStartupDialogs','/DisableStartupMessages','/Out',('"'+$log+'"'))) -WindowStyle Hidden -PassThru;if(-not $p.WaitForExit(45000)){$p.Kill();throw 'Таймаут'};$taskSteps.Add(@{step=$name;exitCode=$p.ExitCode});$taskSteps|ConvertTo-Json|Set-Content (Join-Path $taskRoot 'STEPS.json') -Encoding utf8;if($p.ExitCode -ne 0){throw ('Не прошла операция '+$name)};Write-Output ($name+': 0')}
if(-not(Test-Path $taskBase)){Invoke-Probe 'create' @('CREATEINFOBASE',('File="'+$taskBase+'";'))}
Invoke-Probe 'load-no-export' @('DESIGNER','/F',('"'+$taskBase+'"'),'/LoadConfigFromFiles',('"'+$taskSource+'"'),'/UpdateDBCfg')
Invoke-Probe 'run-no-export' @('ENTERPRISE','/F',('"'+$taskBase+'"'))
$taskRejection=Get-Content (Join-Path $taskRoot 'ACTUAL_WITHOUT_EXPORT.txt') -Raw -Encoding utf8
if($taskRejection -notmatch 'REJECTION:.*' -or $taskRejection -notmatch 'Стоимость' -or $taskRejection -match 'VALUE:600'){throw 'Не доказан точный отказ без Экспорт'}
$taskCost=Get-Content (Join-Path $taskRoot 'COST_WITH_EXPORT.bsl') -Raw -Encoding utf8
[IO.File]::WriteAllText((Join-Path $taskSource 'CommonModules/УчебныеРасчеты/Ext/Module.bsl'),$taskCost,[Text.UTF8Encoding]::new($true))
$taskApp=Get-Content (Join-Path $taskRoot 'APP_WITHOUT_EXPORT.bsl') -Raw -Encoding utf8
$taskApp=$taskApp.Replace('ACTUAL_WITHOUT_EXPORT.txt','ACTUAL_RESTORED_EXPORT.txt')
[IO.File]::WriteAllText((Join-Path $taskSource 'Ext/ManagedApplicationModule.bsl'),$taskApp,[Text.UTF8Encoding]::new($true))
Invoke-Probe 'load-restored-export' @('DESIGNER','/F',('"'+$taskBase+'"'),'/LoadConfigFromFiles',('"'+$taskSource+'"'),'/UpdateDBCfg')
Invoke-Probe 'check-restored-export' @('DESIGNER','/F',('"'+$taskBase+'"'),'/CheckConfig','-ThinClient','-ThickClientManagedApplication')
Invoke-Probe 'run-restored-export' @('ENTERPRISE','/F',('"'+$taskBase+'"'))
if((Get-Content (Join-Path $taskRoot 'ACTUAL_RESTORED_EXPORT.txt') -Raw -Encoding utf8).Trim() -ne 'VALUE:600'){throw 'Восстановление не дало600'}
@{status='PASS';withoutExport='qualified method unavailable';restoredExport='600';privilegedChanged=$false;ownerDataUsed=$false}|ConvertTo-Json|Set-Content (Join-Path $taskRoot 'RESULT.json') -Encoding utf8
Write-Output 'Отказ без Экспорт и600 после восстановления: PASS'
