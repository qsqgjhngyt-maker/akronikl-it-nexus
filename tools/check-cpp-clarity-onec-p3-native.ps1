param([Parameter(Mandatory=$true)][string]$OutputDirectory,[string]$Platform='C:/Program Files/1cv8/8.3.27.2214/bin/1cv8.exe')
$ErrorActionPreference='Stop'
$taskRepo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskFixture=Join-Path $taskRepo 'docs/ru/03-content/cpp-clarity-01/R3_EVIDENCE/onec-p3-module/native'
$taskOut=[IO.Path]::GetFullPath($OutputDirectory)
if(Test-Path -LiteralPath $taskOut){throw 'Нужен новый отдельный каталог; существующие данные не перезаписываются.'}
if($taskOut.StartsWith($taskRepo+[IO.Path]::DirectorySeparatorChar)){throw 'Каталог воспроизведения должен находиться вне исходного репозитория.'}
[IO.Directory]::CreateDirectory($taskOut)|Out-Null
$taskSource=Join-Path $taskOut 'source';$taskBase=Join-Path $taskOut 'base';$taskActual=Join-Path $taskOut 'ACTUAL_REPLAY.txt'
Copy-Item -LiteralPath (Join-Path $taskFixture 'source') -Destination $taskSource -Recurse
$taskAppPath=Join-Path $taskSource 'Ext/ManagedApplicationModule.bsl'
$taskApp=[IO.File]::ReadAllText($taskAppPath)
$taskMatch=[regex]::Matches($taskApp,'Новый ЗаписьТекста\("([^"]+)"')
if($taskMatch.Count -ne 1){throw 'Не найден единственный путь QA-протокола'}
$taskBeforeHash=(Get-FileHash -LiteralPath $taskAppPath -Algorithm SHA256).Hash.ToLowerInvariant()
$taskApp=$taskApp.Replace($taskMatch[0].Groups[1].Value,$taskActual.Replace('\','/'))
[IO.File]::WriteAllText($taskAppPath,$taskApp,[Text.UTF8Encoding]::new($true))
$taskSteps=[Collections.Generic.List[object]]::new()
function Invoke-Native([string]$name,[string[]]$operation){
 $log=Join-Path $taskOut ($name+'.private.log')
 $p=Start-Process -FilePath $Platform -ArgumentList ($operation+@('/DisableStartupDialogs','/DisableStartupMessages','/Out',('"'+$log+'"'))) -WindowStyle Hidden -PassThru
 if(-not $p.WaitForExit(45000)){$p.Kill();throw ('Таймаут собственного процесса: '+$name)}
 $taskSteps.Add(@{operation=$name;exitCode=$p.ExitCode})
 $taskSteps|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $taskOut 'STEPS.json') -Encoding utf8
 if($p.ExitCode -ne 0){throw ('Нативная операция не прошла: '+$name+'; приватный журнал не экспортируется.')}
 Write-Output ($name+': PASS')
}
Invoke-Native 'create' @('CREATEINFOBASE',('File="'+$taskBase+'";'))
Invoke-Native 'load' @('DESIGNER','/F',('"'+$taskBase+'"'),'/LoadConfigFromFiles',('"'+$taskSource+'"'),'/UpdateDBCfg')
Invoke-Native 'check' @('DESIGNER','/F',('"'+$taskBase+'"'),'/CheckConfig','-ThinClient','-ThickClientManagedApplication')
Invoke-Native 'run' @('ENTERPRISE','/F',('"'+$taskBase+'"'),'/C','qa-all')
$taskCases=(Get-Content -LiteralPath (Join-Path $taskFixture 'CASE_SOURCES.json') -Raw -Encoding utf8|ConvertFrom-Json).cases
$taskLines=Get-Content -LiteralPath $taskActual -Encoding utf8
$taskResults=@()
foreach($case in $taskCases){
 $prefix=if($case.expectedErrorContains){'ERROR:'+$case.id+':'}else{'VALUE:'+$case.id+':'}
 $matches=@($taskLines|Where-Object {$_.StartsWith($prefix)})
 if($matches.Count -ne 1){throw ('Нет единственного результата: '+$case.id)}
 $value=$matches[0].Substring($prefix.Length)
 if($case.expectedErrorContains){if(-not $value.Contains($case.expectedErrorContains)){throw ('Не совпал точный отказ: '+$case.id)}}elseif($value -cne $case.expectedValue){throw ('Не совпало значение: '+$case.id)}
 $taskResults+=@{id=$case.id;status='PASS';actual=$value}
}
@{status='NATIVE QA REPLAY PASS';cases=$taskResults;guiCases=0;appChange='Только путь нового QA-протокола';originalAppSha256=$taskBeforeHash;studentBodiesChanged=$false;ownerDataUsed=$false}|ConvertTo-Json -Depth 6|Set-Content -LiteralPath (Join-Path $taskOut 'RESULT.json') -Encoding utf8
Write-Output ('Нативное воспроизведение: '+$taskResults.Count+'/42 PASS; GUI и понимание этим не проверяются.')
