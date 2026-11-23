$ErrorActionPreference='Stop'
$taskRoot=Join-Path $PSScriptRoot 'onec-p3-plain-gui'
$taskCases=Get-Content -LiteralPath (Join-Path $taskRoot 'MANIFEST.json') -Raw | ConvertFrom-Json
$taskPlatform='C:/Program Files/1cv8/8.3.27.2214/bin/1cv8.exe'
$taskSteps=[Collections.Generic.List[object]]::new()
foreach($case in $taskCases){
 if(-not [IO.Path]::GetFullPath($case.base).StartsWith([IO.Path]::GetFullPath($taskRoot)+[IO.Path]::DirectorySeparatorChar)){throw 'Путь вне корня GUI-баз'}
 $operations=@(
  @{name='create';args=@('CREATEINFOBASE',('File="'+$case.base+'";'))},
  @{name='load';args=@('DESIGNER','/F',('"'+$case.base+'"'),'/LoadConfigFromFiles',('"'+$case.source+'"'),'/UpdateDBCfg')},
  @{name='check';args=@('DESIGNER','/F',('"'+$case.base+'"'),'/CheckConfig','-ThinClient','-ThickClientManagedApplication','-ConfigLogIntegrity')}
 )
 foreach($op in $operations){
  if($op.name -eq 'create' -and (Test-Path -LiteralPath $case.base)){Write-Output ($case.id+' existing own base: load retry');continue}
  $log=Join-Path $case.root ($op.name+'.private.log')
  $p=Start-Process -FilePath $taskPlatform -ArgumentList ($op.args+@('/DisableStartupDialogs','/DisableStartupMessages','/Out',('"'+$log+'"'))) -WindowStyle Hidden -PassThru
  if(-not $p.WaitForExit(45000)){$p.Kill();throw 'Таймаут собственного процесса'}
  $raw=if(Test-Path -LiteralPath $log){Get-Content -LiteralPath $log -Raw}else{''}
  $classification=if($raw -match 'лиценз|license'){'LICENSING_MESSAGE_NOT_EXPORTED'}else{'OPERATION_LOG'}
  $taskSteps.Add([pscustomobject]@{case=$case.id;operation=$op.name;exitCode=$p.ExitCode;classification=$classification})
  $taskSteps|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $taskRoot 'STEPS.json') -Encoding utf8
  Write-Output ($case.id+' '+$op.name+': '+$p.ExitCode+' '+$classification)
  if($p.ExitCode -ne 0){throw 'Нативная операция не прошла; приватный журнал не экспортируется'}
 }
}
