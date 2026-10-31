param(
 [Parameter(Mandatory=$true)][string]$PlatformPath,
 [Parameter(Mandatory=$true)][string]$OutputDirectory
)
$ErrorActionPreference='Stop'
$repoRoot=Split-Path $PSScriptRoot -Parent
$nativeSource=Join-Path $repoRoot 'courses\onec-education\native\service-desk'
if(-not(Test-Path -LiteralPath $nativeSource)){$nativeSource=Join-Path $repoRoot 'native\service-desk'}
$nativeOutput=[IO.Path]::GetFullPath($OutputDirectory)
if(Test-Path -LiteralPath $nativeOutput){throw 'Каталог уже существует. Выберите новое место; прежняя попытка сохранена.'}
if(-not(Test-Path -LiteralPath $PlatformPath -PathType Leaf)){throw 'Укажите официальный 1cv8.exe.'}
$nativeVersion=(Get-Item -LiteralPath $PlatformPath).VersionInfo.ProductVersion
if($nativeVersion -notmatch '^8\.3\.27\.'){throw 'Этот gate рассчитан на 8.3.27.x; другая версия требует отдельного анализа совместимости.'}
New-Item -ItemType Directory -Path $nativeOutput | Out-Null
$steps=[Collections.Generic.List[object]]::new()
function Invoke-Native([string]$Name,[string[]]$Arguments,[bool]$ExpectedFailure=$false){
 $rawLog=Join-Path $nativeOutput ($Name+'.private.log')
 $nativeArgs=$Arguments+@('/DisableStartupDialogs','/DisableStartupMessages','/Out',('"'+$rawLog+'"'))
 $nativeProcess=Start-Process -FilePath $PlatformPath -ArgumentList $nativeArgs -WindowStyle Hidden -PassThru
 if(-not $nativeProcess.WaitForExit(45000)){$nativeProcess.Kill();throw ('Таймаут только тестового процесса: '+$Name)}
 $nativeText=if(Test-Path $rawLog){Get-Content -LiteralPath $rawLog -Raw}else{''}
 $classification=if($nativeText -match 'лиценз|license'){'LICENSING_MESSAGE_NOT_EXPORTED'}elseif($nativeText -match 'Ошибка доступа|access denied'){'FILE_ACCESS_ERROR'}elseif($nativeText -match 'Ожидается|Синтакс|Ошибка в модуле|Ошибка при проверке|Ошибки|МодульУправляемогоПриложения\('){'SYNTAX_DIAGNOSTIC'}else{'OPERATION_LOG'}
 $steps.Add([pscustomobject]@{step=$Name;exitCode=$nativeProcess.ExitCode;classification=$classification;expectedFailure=$ExpectedFailure})
 if($ExpectedFailure){if($nativeProcess.ExitCode -eq 0 -or $classification -ne 'SYNTAX_DIAGNOSTIC'){throw ('Отрицательный синтаксический контроль не доказан: '+$Name)}}
 elseif($nativeProcess.ExitCode -ne 0){throw ('Ошибка нативной операции: '+$Name+'; '+$classification)}
}
function New-NativeBase([string]$Name){
 $newBase=Join-Path $nativeOutput $Name
 if(Test-Path -LiteralPath $newBase){throw 'База назначения уже существует.'}
 Invoke-Native ('create-'+$Name) @('CREATEINFOBASE',('File="'+$newBase+'";'))
 return $newBase
}
function Run-Probe([string]$Name,[string]$Base){
 $resultFile=Join-Path $nativeOutput ($Name+'.txt')
 Invoke-Native $Name @('ENTERPRISE','/F',('"'+$Base+'"'),'/C',('"'+$resultFile+'"'))
 if(-not(Test-Path $resultFile)){throw 'Вывод BSL отсутствует.'}
 $actual=(Get-Content -LiteralPath $resultFile -Raw).Trim()
 if($actual -ne 'NEXUS_1C_P1|requests=3|minutes=105|negative=2|PASS'){throw 'Вывод BSL не соответствует ожидаемому.'}
 $costFile=$resultFile+'.service-cost.txt'
 if(-not(Test-Path -LiteralPath $costFile)){throw 'Вывод ServiceCost отсутствует.'}
 $cost=(Get-Content -LiteralPath $costFile -Raw).Trim()
 if($cost -ne 'NEXUS_1C_SERVICE_COST|normal=3|boundary=2|PASS'){throw 'ServiceCost не соответствует ожидаемому.'}
 return $actual
}
try{
 $base=New-NativeBase 'base'
 Invoke-Native 'load' @('DESIGNER','/F',('"'+$base+'"'),'/LoadConfigFromFiles',('"'+$nativeSource+'"'),'/UpdateDBCfg')
 Invoke-Native 'check' @('DESIGNER','/F',('"'+$base+'"'),'/CheckConfig','-ConfigLogIntegrity','-ThinClient','-ThickClientManagedApplication','-Server')
 $actual=Run-Probe 'BSL_RESULT' $base
 $dump=Join-Path $nativeOutput 'service-desk.private.dt'
 Invoke-Native 'backup' @('DESIGNER','/F',('"'+$base+'"'),'/DumpIB',('"'+$dump+'"'))
 $restored=New-NativeBase 'restored'
 Invoke-Native 'restore' @('DESIGNER','/F',('"'+$restored+'"'),'/RestoreIB',('"'+$dump+'"'))
 $restoredActual=Run-Probe 'RESTORED_BSL_RESULT' $restored
 $badSource=Join-Path $nativeOutput 'negative-source'
 Copy-Item -LiteralPath $nativeSource -Destination $badSource -Recurse
 $badModule=Join-Path $badSource 'Ext\ManagedApplicationModule.bsl'
 Add-Content -LiteralPath $badModule -Value "`nСообщить(;" -Encoding utf8
 $negative=New-NativeBase 'negative-base'
 Invoke-Native 'load-negative' @('DESIGNER','/F',('"'+$negative+'"'),'/LoadConfigFromFiles',('"'+$badSource+'"'))
 Invoke-Native 'check-negative' @('DESIGNER','/F',('"'+$negative+'"'),'/CheckConfig','-ThinClient','-ThickClientManagedApplication','-Server') $true
 $sourceHashes=Get-ChildItem -LiteralPath $nativeSource -Recurse -File | ForEach-Object {[pscustomobject]@{path=$_.FullName.Substring($nativeSource.Length+1).Replace('\','/');sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}}
 $report=[pscustomobject]@{status='AUTOMATED PASS';version=$nativeVersion;environment='official-platform-local-file-base';actual=$actual;restoredActual=$restoredActual;serviceCostActual=(Get-Content -LiteralPath (Join-Path $nativeOutput 'BSL_RESULT.txt.service-cost.txt') -Raw).Trim();serviceCostRestored=(Get-Content -LiteralPath (Join-Path $nativeOutput 'RESTORED_BSL_RESULT.txt.service-cost.txt') -Raw).Trim();serviceCostCases=5;environmentRecord=[pscustomobject]@{operatingSystem=[Environment]::OSVersion.VersionString;runnerArchitecture=[System.Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture.ToString();platformArchitecture='NOT_INSPECTED';licenseProfile='NOT_INSPECTED';compatibilityMode='Version8_3_27';configurationRevision='0.1.0';callContext='ManagedApplicationModule, official thick client, file infobase';secretsAllowed=$false};negativeSyntaxRejected=$true;steps=$steps;sourceHashes=$sourceHashes;persistedBusinessRecordsTested=$false;licensingCredentialsCollected=$false;serverDeployed=$false;productionUsed=$false;physicalMobileTested=$false}
 $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $nativeOutput 'NATIVE_RESULT.json') -Encoding utf8
 $report | ConvertTo-Json -Depth 8
}catch{
 [pscustomobject]@{status='FAIL';version=$nativeVersion;steps=$steps;reason=$_.Exception.Message} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $nativeOutput 'NATIVE_RESULT.json') -Encoding utf8
 throw
}
