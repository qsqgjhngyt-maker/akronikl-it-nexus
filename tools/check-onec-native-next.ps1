param([Parameter(Mandatory=$true)][string]$PlatformPath,[Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference='Stop'
$labRoot=Split-Path $PSScriptRoot -Parent
$labSource=Join-Path $labRoot 'courses\onec-education\native\service-desk-a2p2'
if(-not(Test-Path -LiteralPath $labSource)){$labSource=Join-Path $labRoot 'native\service-desk-a2p2'}
$labOutput=[IO.Path]::GetFullPath($OutputDirectory)
if(Test-Path -LiteralPath $labOutput){throw 'Каталог существует: прежняя работа сохраняется. Выберите новый каталог.'}
if(-not(Test-Path -LiteralPath $PlatformPath -PathType Leaf)){throw 'Нужен официальный 1cv8.exe'}
$labVersion=(Get-Item -LiteralPath $PlatformPath).VersionInfo.ProductVersion
if($labVersion -notmatch '^8\.3\.27\.'){throw 'Другая версия требует отдельной матрицы совместимости'}
New-Item -ItemType Directory -Path $labOutput | Out-Null
$labSteps=[Collections.Generic.List[object]]::new()
function Invoke-Lab([string]$Step,[string[]]$Arguments,[bool]$Negative=$false){
 $labLog=Join-Path $labOutput ($Step+'.private.log')
 $labProcess=Start-Process -FilePath $PlatformPath -ArgumentList ($Arguments+@('/DisableStartupDialogs','/DisableStartupMessages','/Out',('"'+$labLog+'"'))) -WindowStyle Hidden -PassThru
 if(-not $labProcess.WaitForExit(45000)){$labProcess.Kill();throw ('Таймаут только тестового процесса '+$Step)}
 $labText=if(Test-Path -LiteralPath $labLog){Get-Content -LiteralPath $labLog -Raw}else{''}
 $labClass=if($labText -match 'лиценз|license'){'LICENSING_MESSAGE_NOT_EXPORTED'}elseif($labText -match 'Ожидается|Синтакс|Ошибка в модуле|Ошибка при проверке|Ошибки|МодульУправляемогоПриложения\('){'SYNTAX_DIAGNOSTIC'}else{'OPERATION_LOG'}
 $labSteps.Add([pscustomobject]@{step=$Step;exitCode=$labProcess.ExitCode;classification=$labClass;expectedFailure=$Negative})
 if($Negative){if($labProcess.ExitCode -eq 0 -or $labClass -ne 'SYNTAX_DIAGNOSTIC'){throw ('Отрицательный синтаксический контроль не доказан '+$Step)}}elseif($labProcess.ExitCode -ne 0){throw ('Нативная операция не прошла '+$Step+' '+$labClass)}
}
function New-LabBase([string]$Name){$p=Join-Path $labOutput $Name;if(Test-Path -LiteralPath $p){throw 'База назначения существует'};Invoke-Lab ('create-'+$Name) @('CREATEINFOBASE',('File="'+$p+'";'));return $p}
function Run-Lab([string]$Name,[string]$Base,[string]$Mode,[int]$Minutes){
 $p=Join-Path $labOutput ($Name+'.txt');Invoke-Lab $Name @('ENTERPRISE','/F',('"'+$Base+'"'),'/C',('"'+$Mode+'|'+$p+'"'))
 $expected='NEXUS_A2P2|customers=3|services=2|documents=2|minutes='+$Minutes+'|checks=46|PASS'
 if(-not(Test-Path -LiteralPath $p) -or (Get-Content -LiteralPath $p -Raw).Trim() -ne $expected){throw ('Фактический результат не совпал '+$Name)}
 $cases=@(Get-Content -LiteralPath ($p+'.cases.txt') | Where-Object {$_})
 if($cases.Count -ne 46 -or @($cases|Sort-Object -Unique).Count -ne 46 -or @($cases|Where-Object {$_ -notmatch '^(A2\.|P2\.[1-5]\.)[-a-z.]+\|PASS$'}).Count){throw 'Набор нативных cases не доказан'}
 return (Get-Content -LiteralPath ($p+'.snapshot.txt') -Raw).Trim()
}
try{
 $base=New-LabBase 'source-base'
 Invoke-Lab 'load' @('DESIGNER','/F',('"'+$base+'"'),'/LoadConfigFromFiles',('"'+$labSource+'"'),'/UpdateDBCfg')
 Invoke-Lab 'check' @('DESIGNER','/F',('"'+$base+'"'),'/CheckConfig','-ConfigLogIntegrity','-ThinClient','-ThickClientManagedApplication','-Server')
 $seed=Run-Lab 'SEED' $base 'seed' 75
 $repeat=Run-Lab 'REPEAT_SEED' $base 'seed' 75
 if($seed -ne $repeat){throw 'Повторное заполнение изменило identity'}
 $reopened=Run-Lab 'REOPEN' $base 'verify' 75
 if($seed -ne $reopened){throw 'Повторный сеанс не сохранил данные'}
 $dump=Join-Path $labOutput 'service-desk.private.dt'
 Invoke-Lab 'backup' @('DESIGNER','/F',('"'+$base+'"'),'/DumpIB',('"'+$dump+'"'))
 $copy=New-LabBase 'copy-base'
 Invoke-Lab 'restore' @('DESIGNER','/F',('"'+$copy+'"'),'/RestoreIB',('"'+$dump+'"'))
 $restored=Run-Lab 'RESTORED' $copy 'verify' 75
 if($seed -ne $restored){throw 'Restore изменил записи/identity'}
 $edited=Run-Lab 'EDIT_COPY' $copy 'edit-copy' 90
 if($edited -eq $seed){throw 'Копия не изменилась'}
 $copyReopened=Run-Lab 'REOPEN_COPY' $copy 'verify-copy' 90
 if($edited -ne $copyReopened){throw 'Изменение копии не сохранилось'}
 $original=Run-Lab 'ORIGINAL_PRESERVED' $base 'verify' 75
 if($original -ne $seed){throw 'Исходная работа изменилась'}
 $negativeSource=Join-Path $labOutput 'negative-source';Copy-Item -LiteralPath $labSource -Destination $negativeSource -Recurse
 Add-Content -LiteralPath (Join-Path $negativeSource 'Ext\ManagedApplicationModule.bsl') -Value "`nСообщить(;" -Encoding utf8
 $negativeBase=New-LabBase 'negative-base'
 Invoke-Lab 'load-negative' @('DESIGNER','/F',('"'+$negativeBase+'"'),'/LoadConfigFromFiles',('"'+$negativeSource+'"'))
 Invoke-Lab 'check-negative' @('DESIGNER','/F',('"'+$negativeBase+'"'),'/CheckConfig','-ThinClient','-ThickClientManagedApplication','-Server') $true
 $semanticSource=Join-Path $labOutput 'semantic-source';Copy-Item -LiteralPath $labSource -Destination $semanticSource -Recurse
 $semanticModule=Join-Path $semanticSource 'Ext\ManagedApplicationModule.bsl'
 $semanticText=[IO.File]::ReadAllText($semanticModule).Replace('Возврат Первое + Второе;','Возврат Первое - Второе;')
 [IO.File]::WriteAllText($semanticModule,$semanticText,[Text.UTF8Encoding]::new($false))
 $semanticBase=New-LabBase 'semantic-base'
 Invoke-Lab 'load-semantic' @('DESIGNER','/F',('"'+$semanticBase+'"'),'/LoadConfigFromFiles',('"'+$semanticSource+'"'),'/UpdateDBCfg')
 Invoke-Lab 'check-semantic' @('DESIGNER','/F',('"'+$semanticBase+'"'),'/CheckConfig','-ThickClientManagedApplication','-Server')
 $semanticResult=Join-Path $labOutput 'SEMANTIC_REJECTION.txt'
 Invoke-Lab 'run-semantic' @('ENTERPRISE','/F',('"'+$semanticBase+'"'),'/C',('"seed|'+$semanticResult+'"'))
 if(-not(Test-Path -LiteralPath $semanticResult) -or (Get-Content -LiteralPath $semanticResult -Raw) -notmatch 'NEXUS_A2P2\|FAIL\|NEXUS_CHECK_FAILED: P2\.1\.russian-keywords'){throw 'Семантическая мутация не обнаружена'}
 $hashes=Get-ChildItem -LiteralPath $labSource -Recurse -File|ForEach-Object {[pscustomobject]@{path=$_.FullName.Substring($labSource.Length+1).Replace('\','/');sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}}
 $report=[pscustomobject]@{status='AUTOMATED PASS';version=$labVersion;configurationRevision='0.2.0-a2p2';environment='official-platform-local-file-base';customers=3;services=2;documents=2;sourceMinutes=75;copyMinutes=90;nativeCasesPerSession=46;realSessions=8;positiveSessions=7;persistedRecordsTested=$true;idempotentSeed=$true;referenceIdentityPreserved=$true;sourcePreserved=$true;copyChangedAndReopened=$true;negativeBusinessWritesRejected=2;negativeSyntaxRejected=$true;postingImplemented=$false;platformArchitecture='NOT_INSPECTED';licenseProfile='NOT_INSPECTED';trainingBuildTested=$false;physicalMobileTested=$false;productionUsed=$false;licensingCredentialsCollected=$false;steps=$labSteps;sourceHashes=$hashes}
 $sourceWorkId=[Guid]::NewGuid().ToString();$copyWorkId=[Guid]::NewGuid().ToString()
 $report|Add-Member -NotePropertyName workspaces -NotePropertyValue @{source=@{id=$sourceWorkId;alias='source-base'};copy=@{id=$copyWorkId;alias='copy-base';sourceWorkId=$sourceWorkId;credit='none'}}
 $report|Add-Member -NotePropertyName semanticMutationRejected -NotePropertyValue $true
 $report|Add-Member -NotePropertyName semanticNegativeSessions -NotePropertyValue 1
 $report|Add-Member -NotePropertyName runnerSha256 -NotePropertyValue (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash.ToLowerInvariant()
 $report|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $labOutput 'NATIVE_A2P2_RESULT.json') -Encoding utf8
 $report|ConvertTo-Json -Depth 8
}catch{[pscustomobject]@{status='FAIL';version=$labVersion;steps=$labSteps;reason=$_.Exception.Message}|ConvertTo-Json -Depth 6|Set-Content -LiteralPath (Join-Path $labOutput 'NATIVE_A2P2_RESULT.json') -Encoding utf8;throw}
