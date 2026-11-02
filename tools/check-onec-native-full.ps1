param([Parameter(Mandatory=$true)][string]$PlatformPath,[Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference='Stop'
$courseRoot=Split-Path $PSScriptRoot -Parent
$courseNative=Join-Path $courseRoot 'courses\onec-education\native'
if(-not(Test-Path -LiteralPath $courseNative)){$courseNative=Join-Path $courseRoot 'native'}
$courseSource=Join-Path $courseNative 'service-desk-full'
$courseSpec=Get-Content -LiteralPath (Join-Path $courseNative 'full-spec.v1.json') -Raw|ConvertFrom-Json
$courseOut=[IO.Path]::GetFullPath($OutputDirectory)
if(Test-Path -LiteralPath $courseOut){throw 'Существующая работа сохранена: выберите новый каталог проверки.'}
if(-not(Test-Path -LiteralPath $PlatformPath -PathType Leaf)){throw 'Нужна официальная установленная платформа 1С.'}
$courseVersion=(Get-Item -LiteralPath $PlatformPath).VersionInfo.ProductVersion
if($courseVersion -notmatch '^8\.3\.27\.'){throw 'Версия требует отдельной матрицы совместимости.'}
foreach($item in $courseSpec.sourceHashes){$p=Join-Path $courseSource $item.path;if((Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash.ToLowerInvariant() -ne $item.sha256){throw 'Доверенный эталон изменён; сначала требуется review точного исходника.'}}
New-Item -ItemType Directory -Path $courseOut|Out-Null
$courseSteps=[Collections.Generic.List[object]]::new();$courseMock=$null
function Invoke-Course([string]$Step,[string[]]$Arguments,[bool]$Negative=$false){
 $courseLog=Join-Path $courseOut ($Step+'.private.log')
 $courseProcess=Start-Process -FilePath $PlatformPath -ArgumentList ($Arguments+@('/DisableStartupDialogs','/DisableStartupMessages','/Out',('"'+$courseLog+'"'))) -WindowStyle Hidden -PassThru
 if(-not $courseProcess.WaitForExit(45000)){$courseProcess.Kill();throw ('Таймаут собственного тестового процесса '+$Step)}
 $courseText=if(Test-Path -LiteralPath $courseLog){Get-Content -LiteralPath $courseLog -Raw}else{''}
 $class=if($courseText -match 'лиценз|license'){'LICENSING_DIAGNOSTIC_PRIVATE'}elseif($courseText -match 'Ожидается|Синтакс|Ошибка в модуле|МодульУправляемогоПриложения\('){'SYNTAX_DIAGNOSTIC'}else{'OPERATION_LOG'}
 $courseSteps.Add([pscustomobject]@{step=$Step;exitCode=$courseProcess.ExitCode;classification=$class;expectedFailure=$Negative})
 if($Negative){if($courseProcess.ExitCode -eq 0 -or $class -ne 'SYNTAX_DIAGNOSTIC'){throw 'Синтаксический отрицательный контроль не доказан.'}}elseif($courseProcess.ExitCode -ne 0){throw ('Нативная операция не прошла: '+$Step+' '+$class)}
}
function New-CourseBase([string]$Name){$p=Join-Path $courseOut $Name;if(Test-Path -LiteralPath $p){throw 'Назначение уже существует.'};Invoke-Course ('create-'+$Name) @('CREATEINFOBASE',('File="'+$p+'";'));return $p}
function Run-Course([string]$Name,[string]$Base,[string]$Mode,[int]$Minutes,[bool]$Http=$false){
 $p=Join-Path $courseOut ($Name+'.txt');Invoke-Course $Name @('ENTERPRISE','/F',('"'+$Base+'"'),'/C',('"'+$Mode+'|'+$p+'"'))
 $expectedCount=if($Http){73}else{70};$expected='NEXUS_FULL|documents=12|minutes='+$Minutes+'|checks='+$expectedCount+'|PASS'
 if(-not(Test-Path -LiteralPath $p) -or (Get-Content -LiteralPath $p -Raw).Trim() -ne $expected){throw ('Ожидаемые утверждения не выполнены: '+$Name)}
 $cases=@(Get-Content -LiteralPath ($p+'.cases.txt')|Where-Object {$_});$expectedCases=@($courseSpec.caseIds);if($Http){$expectedCases+=@($courseSpec.httpCaseIds)}
 if($cases.Count -ne $expectedCount -or (Compare-Object @($cases|Sort-Object) @($expectedCases|ForEach-Object {$_+'|PASS'}|Sort-Object))){throw 'Набор native case IDs не совпадает со спецификацией.'}
 return(Get-Content -LiteralPath ($p+'.snapshot.txt') -Raw).Trim()
}
try{
 $base=New-CourseBase 'source-base';Invoke-Course 'load' @('DESIGNER','/F',('"'+$base+'"'),'/LoadConfigFromFiles',('"'+$courseSource+'"'),'/UpdateDBCfg')
 Invoke-Course 'check' @('DESIGNER','/F',('"'+$base+'"'),'/CheckConfig','-ConfigLogIntegrity','-ThinClient','-ThickClientManagedApplication','-Server')
 $seed=Run-Course 'SEED' $base 'seed' 440
 foreach($step in @(@('REPEAT_SEED','seed'),@('REOPEN','verify'))){$snapshot=Run-Course $step[0] $base $step[1] 440;if($snapshot -ne $seed){throw 'Повтор изменил принятые ключи или данные.'}}
 $ready=Join-Path $courseOut 'mock.ready.json';$node=(Get-Command node -ErrorAction Stop).Source
 $courseMock=Start-Process -FilePath $node -ArgumentList @(('"'+(Join-Path $courseNative 'full-support\http-mock.mjs')+'"'),('"'+$ready+'"')) -WindowStyle Hidden -PassThru
 for($i=0;$i -lt 40 -and -not(Test-Path -LiteralPath $ready);$i++){if($courseMock.HasExited){throw 'Loopback mock не запущен; существующий сервис не используется.'};Start-Sleep -Milliseconds 50}
 if(-not(Test-Path -LiteralPath $ready)){throw 'Loopback mock не подтвердил готовность.'}
 $httpSnapshot=Run-Course 'HTTP' $base 'verify-http' 440 $true;if($httpSnapshot -ne $seed){throw 'HTTP-проверка изменила принятые данные.'}
 if(-not $courseMock.HasExited){$courseMock.Kill()};$courseMock=$null
 $dump=Join-Path $courseOut 'course.private.dt';Invoke-Course 'backup' @('DESIGNER','/F',('"'+$base+'"'),'/DumpIB',('"'+$dump+'"'))
 $copy=New-CourseBase 'copy-base';Invoke-Course 'restore' @('DESIGNER','/F',('"'+$copy+'"'),'/RestoreIB',('"'+$dump+'"'))
 $restored=Run-Course 'RESTORED' $copy 'verify' 440;if($restored -ne $seed){throw 'Восстановление изменило принятые записи.'}
 $edited=Run-Course 'EDIT_COPY' $copy 'edit-copy' 455;$copyReopen=Run-Course 'REOPEN_COPY' $copy 'verify-copy' 455
 if($edited -eq $seed -or $copyReopen -ne $edited){throw 'Изменение отдельной копии не доказано.'}
 $preserved=Run-Course 'ORIGINAL_PRESERVED' $base 'verify' 440;if($preserved -ne $seed){throw 'Источник изменён операцией на копии.'}
 $syntax=Join-Path $courseOut 'syntax-source';Copy-Item -LiteralPath $courseSource -Destination $syntax -Recurse
 Add-Content -LiteralPath (Join-Path $syntax 'Ext\ManagedApplicationModule.bsl') -Value "`nСообщить(;" -Encoding utf8
 $syntaxBase=New-CourseBase 'syntax-base';Invoke-Course 'load-syntax' @('DESIGNER','/F',('"'+$syntaxBase+'"'),'/LoadConfigFromFiles',('"'+$syntax+'"'))
 Invoke-Course 'reject-syntax' @('DESIGNER','/F',('"'+$syntaxBase+'"'),'/CheckConfig','-ThickClientManagedApplication') $true
 $semantic=Join-Path $courseOut 'semantic-source';Copy-Item -LiteralPath $courseSource -Destination $semantic -Recurse
 $module=Join-Path $semantic 'Ext\ManagedApplicationModule.bsl';$text=[IO.File]::ReadAllText($module);$needle='Возврат Окр(Минуты * Тариф / 60, 2);';if(-not $text.Contains($needle)){throw 'Мутация не найдена.'}
 [IO.File]::WriteAllText($module,$text.Replace($needle,'Возврат Минуты * Тариф / 60;'),[Text.UTF8Encoding]::new($false))
 $semanticBase=New-CourseBase 'semantic-base';Invoke-Course 'load-semantic' @('DESIGNER','/F',('"'+$semanticBase+'"'),'/LoadConfigFromFiles',('"'+$semantic+'"'),'/UpdateDBCfg')
 Invoke-Course 'check-semantic' @('DESIGNER','/F',('"'+$semanticBase+'"'),'/CheckConfig','-ThickClientManagedApplication')
 $semanticOut=Join-Path $courseOut 'SEMANTIC_REJECTION.txt';Invoke-Course 'reject-semantic' @('ENTERPRISE','/F',('"'+$semanticBase+'"'),'/C',('"seed|'+$semanticOut+'"'))
 if(-not(Test-Path -LiteralPath $semanticOut) -or (Get-Content -LiteralPath $semanticOut -Raw) -notmatch 'NEXUS_CHECK_FAILED: P3.numeric-rounding-and-zero'){throw 'Компилируемый семантический дефект не обнаружен.'}
 $sourceId=[Guid]::NewGuid().ToString();$copyId=[Guid]::NewGuid().ToString()
 $report=[pscustomobject]@{status='AUTOMATED PASS';scope='original trusted reference kit only; not untrusted learner-code sandbox';version=$courseVersion;configurationRevision='1.0.0-rc.1';documents=12;sourceMinutes=440;copyMinutes=455;coreCases=70;httpCases=3;positiveSessions=8;sourcePreserved=$true;referenceIdentityPreserved=$true;backupRestoreVerified=$true;idempotentSeed=$true;postingRepostingUnpostingVerified=$true;transactionRollbackVerified=$true;informationRegisterVerified=$true;balanceRegisterVerified=$true;queryParameterJoinTemporaryTableVerified=$true;jsonAndRealHttpVerified=$true;negativeSyntaxRejected=$true;semanticMutationRejected=$true;trainingBuildTested=$false;untrustedCodeIsolationImplemented=$false;rolesConcurrencyFormsDcsSchedulingTested=$false;codeVerifiedServer=$false;credentialEligible=$false;productionUsed=$false;steps=$courseSteps;sourceHashes=$courseSpec.sourceHashes;runnerSha256=(Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash.ToLowerInvariant();workspaces=@{source=@{id=$sourceId;alias='source-base'};copy=@{id=$copyId;alias='copy-base';sourceWorkId=$sourceId;credit='none'}}}
 $report|ConvertTo-Json -Depth 10|Set-Content -LiteralPath (Join-Path $courseOut 'NATIVE_FULL_RESULT.json') -Encoding utf8
 $report|ConvertTo-Json -Depth 10
}catch{
 [pscustomobject]@{status='FAIL';version=$courseVersion;reason=$_.Exception.Message;steps=$courseSteps;productionUsed=$false}|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $courseOut 'NATIVE_FULL_RESULT.json') -Encoding utf8
 throw
}finally{if($courseMock -and -not $courseMock.HasExited){$courseMock.Kill()}}
