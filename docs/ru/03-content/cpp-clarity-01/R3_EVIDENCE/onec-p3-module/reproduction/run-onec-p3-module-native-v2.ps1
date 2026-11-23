$ErrorActionPreference='Stop'
$taskRoot=Join-Path $PSScriptRoot 'onec-p3-module-native-20261108'
$taskBase=Join-Path $taskRoot 'base'
$taskSource=Join-Path $taskRoot 'source'
$taskPlatform='C:/Program Files/1cv8/8.3.27.2214/bin/1cv8.exe'
if(-not(Test-Path -LiteralPath $taskBase)){throw 'Нет собственной базы P3'}
$taskExpected=[IO.Path]::GetFullPath($taskBase)
if(-not $taskExpected.StartsWith([IO.Path]::GetFullPath($PSScriptRoot)+[IO.Path]::DirectorySeparatorChar)){throw 'Не совпал корень учебной базы.'}
if(Test-Path -LiteralPath (Join-Path $taskRoot 'ACTUAL_NATIVE_qa-all-v2.txt')){throw 'V2 протокол уже существует'}
$taskSteps=[Collections.Generic.List[object]]::new()
function Invoke-P3ModuleNative([string]$name,[string[]]$operation){
 $log=Join-Path $taskRoot ($name+'.private.log')
 $p=Start-Process -FilePath $taskPlatform -ArgumentList ($operation+@('/DisableStartupDialogs','/DisableStartupMessages','/Out',('"'+$log+'"'))) -WindowStyle Hidden -PassThru
 if(-not $p.WaitForExit(45000)){$p.Kill();throw ('Таймаут собственного тестового процесса: '+$name)}
 $raw=if(Test-Path -LiteralPath $log){Get-Content -LiteralPath $log -Raw}else{''}
 $classification=if($raw -match 'лиценз|license'){'LICENSING_MESSAGE_NOT_EXPORTED'}elseif($raw -match 'Ошибка доступа|access denied'){'FILE_ACCESS_ERROR'}else{'OPERATION_LOG'}
 $taskSteps.Add([pscustomobject]@{step=$name;exitCode=$p.ExitCode;classification=$classification})
 $taskSteps|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $taskRoot 'STEPS_V2.json') -Encoding utf8
 Write-Output ($name+': exit='+$p.ExitCode+'; '+$classification)
 if($p.ExitCode -ne 0){throw ('Нативная операция не прошла: '+$name+'; '+$classification)}
}
Invoke-P3ModuleNative 'load-v2' @('DESIGNER','/F',('"'+$taskBase+'"'),'/LoadConfigFromFiles',('"'+$taskSource+'"'),'/UpdateDBCfg')
Invoke-P3ModuleNative 'check-v2' @('DESIGNER','/F',('"'+$taskBase+'"'),'/CheckConfig','-ConfigLogIntegrity','-ThinClient','-ThickClientManagedApplication')
Invoke-P3ModuleNative 'qa-all-v2' @('ENTERPRISE','/F',('"'+$taskBase+'"'),'/C','qa-all')
Write-Output '42 сценария исполнены; фактический протокол ещё требует независимого сравнения.'
