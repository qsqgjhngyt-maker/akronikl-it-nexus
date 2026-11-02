# Сборка собственного закреплённого QA; 1С не поставляется и на host не запускается.
param([Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference='Stop'
$qaOut=[IO.Path]::GetFullPath($OutputDirectory);if(Test-Path -LiteralPath $qaOut){throw 'Нужен новый каталог сборки.'}
$qaRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'));$qaNative=Join-Path $qaRoot 'courses\onec-education\native';$qaRuntime=Join-Path $qaRoot 'courses\onec-education\runtime'
$qaSpec=Get-Content -Raw -LiteralPath (Join-Path $qaNative 'advanced-spec.v1.json')|ConvertFrom-Json
$qaFull=Get-Content -Raw -LiteralPath (Join-Path $qaNative 'full-spec.v1.json')|ConvertFrom-Json
$qaUtf8=New-Object Text.UTF8Encoding($false);$qaRows=@()
foreach($qaRow in $qaSpec.files){$qaSource=[IO.Path]::GetFullPath((Join-Path (Join-Path $qaNative 'service-desk-advanced') $qaRow.path));if(-not $qaSource.StartsWith((Join-Path $qaNative 'service-desk-advanced')+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'SOURCE_ESCAPE'};$qaBytes=[IO.File]::ReadAllBytes($qaSource);if($qaBytes.Length -ne $qaRow.bytes -or (Get-FileHash -LiteralPath $qaSource -Algorithm SHA256).Hash.ToLowerInvariant() -ne $qaRow.sha256){throw 'SOURCE_HASH'};$qaRows+=@{path=$qaRow.path;bytes=$qaRow.bytes;sha256=$qaRow.sha256;content=[Convert]::ToBase64String($qaBytes)}}
if($qaRows.Count -ne 18 -or $qaSpec.advancedCaseIds.Count -ne 76 -or $qaSpec.readerCaseIds.Count -ne 6){throw 'SPEC_COUNT'}
New-Item -ItemType Directory -Path $qaOut|Out-Null
[IO.File]::WriteAllText((Join-Path $qaOut 'source.json'),(@{files=$qaRows}|ConvertTo-Json -Depth 6 -Compress),$qaUtf8)
$qaSets=@{advanced=@($qaSpec.advancedCaseIds);reader=@($qaSpec.readerCaseIds);setup=@($qaFull.caseIds)+@('ADV.roles.synthetic-users-created')}
foreach($qaName in $qaSets.Keys){[IO.File]::WriteAllText((Join-Path $qaOut ($qaName+'.cases.txt')),(($qaSets[$qaName]|ForEach-Object {$_+'|PASS'}) -join "`n"),$qaUtf8)}
$qaArgs=@('/nologo','/target:winexe','/main:NexusAdvancedRunner','/platform:x64','/optimize+','/utf8output','/reference:System.Windows.Forms.dll','/reference:System.Drawing.dll','/reference:System.Management.dll','/reference:System.Runtime.Serialization.dll',('/out:'+(Join-Path $qaOut 'NexusAdvancedRunner.exe')),('/resource:'+(Join-Path $qaRuntime 'training-media-8.3.27.1508.lock.json')+',NexusTrainingLock'),('/resource:'+(Join-Path $qaOut 'source.json')+',NexusAdvancedSource'))
foreach($qaPair in @(@('advanced','NexusAdvancedCases'),@('setup','NexusSetupCases'),@('reader','NexusReaderCases'))){$qaArgs+=('/resource:'+(Join-Path $qaOut ($qaPair[0]+'.cases.txt'))+','+$qaPair[1])}
foreach($qaName in @('NexusLabBootstrap','NexusTrainingRunner','NexusLearnerRunner','NexusAdvancedRunner')){$qaArgs+=(Join-Path $qaRuntime ($qaName+'.cs'))}
& (Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe') @qaArgs
if($LASTEXITCODE -ne 0){throw 'BUILD_FAILED'}
$qaExe=Join-Path $qaOut 'NexusAdvancedRunner.exe';$qaProbe=Start-Process -FilePath $qaExe -ArgumentList '--trusted-advanced-qa' -WindowStyle Hidden -PassThru -Wait
if($qaProbe.ExitCode -ne 101){throw 'HOST_GUARD_REQUIRED'}
@{status='IMPLEMENTED';binarySha256=(Get-FileHash -LiteralPath $qaExe -Algorithm SHA256).Hash.ToLowerInvariant();sourceSnapshotSha256=$qaSpec.sourceSnapshotSha256;hostRefusal=$qaProbe.ExitCode;platformIncluded=$false;arbitraryLearnerCode=$false}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $qaOut 'BUILD.json') -Encoding UTF8
