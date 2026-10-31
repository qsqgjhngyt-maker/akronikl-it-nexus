# Операторская сборка собственного guest verifier, без установки ПО и запуска 1С.
param([Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference='Stop'
$labOutput=[IO.Path]::GetFullPath($OutputDirectory)
if(Test-Path -LiteralPath $labOutput){throw 'Нужен новый каталог; прежние сборки не перезаписываются.'}
$labCompiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if(-not(Test-Path -LiteralPath $labCompiler -PathType Leaf)){throw 'Нужен установленный компилятор .NET Framework; автоматической установки нет.'}
$labSource=Join-Path $PSScriptRoot '..\courses\onec-education\runtime\NexusLabBootstrap.cs'
New-Item -ItemType Directory -Path $labOutput|Out-Null
$labExecutable=Join-Path $labOutput 'NexusLabBootstrap.exe'
& $labCompiler /nologo /target:winexe /platform:x64 /optimize+ /utf8output /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Management.dll /reference:System.Runtime.Serialization.dll (('/out:'+$labExecutable)) $labSource
if($LASTEXITCODE -ne 0){throw 'Сборка собственного проверяющего модуля не прошла.'}
[pscustomobject]@{status='IMPLEMENTED / own guest verifier; no 1C execution';sourceSha256=(Get-FileHash -LiteralPath $labSource -Algorithm SHA256).Hash.ToLowerInvariant();binarySha256=(Get-FileHash -LiteralPath $labExecutable -Algorithm SHA256).Hash.ToLowerInvariant();platformIncluded=$false;licenseIncluded=$false;learnerCodeExecuted=$false;securityPolicyChanged=$false}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $labOutput 'BUILD_RESULT.json') -Encoding UTF8
$labTrainingSource=Join-Path $PSScriptRoot '..\courses\onec-education\runtime\NexusTrainingRunner.cs'
$labTrainingLock=Join-Path $PSScriptRoot '..\courses\onec-education\runtime\training-media-8.3.27.1508.lock.json'
$labTrainingSpec=Join-Path $PSScriptRoot '..\courses\onec-education\native\full-spec.v1.json'
if((Test-Path -LiteralPath $labTrainingSource) -and (Test-Path -LiteralPath $labTrainingLock)){
 $labTrainingExe=Join-Path $labOutput 'NexusTrainingRunner.exe'
 & $labCompiler /nologo /target:winexe /main:NexusTrainingRunner /platform:x64 /optimize+ /utf8output /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Management.dll /reference:System.Runtime.Serialization.dll (('/resource:'+$labTrainingLock+',NexusTrainingLock')) (('/resource:'+$labTrainingSpec+',NexusFullSpec')) (('/out:'+$labTrainingExe)) $labSource $labTrainingSource
 if($LASTEXITCODE -ne 0){throw 'Сборка изолированного training QA не прошла.'}
 [pscustomobject]@{status='IMPLEMENTED / trusted reference inside guest only';bootstrapSourceSha256=(Get-FileHash -LiteralPath $labSource -Algorithm SHA256).Hash.ToLowerInvariant();runnerSourceSha256=(Get-FileHash -LiteralPath $labTrainingSource -Algorithm SHA256).Hash.ToLowerInvariant();trainingLockSha256=(Get-FileHash -LiteralPath $labTrainingLock -Algorithm SHA256).Hash.ToLowerInvariant();specSha256=(Get-FileHash -LiteralPath $labTrainingSpec -Algorithm SHA256).Hash.ToLowerInvariant();binarySha256=(Get-FileHash -LiteralPath $labTrainingExe -Algorithm SHA256).Hash.ToLowerInvariant();platformIncluded=$false;hostExecutionAllowed=$false;arbitraryLearnerCodeAdmission=$false;securityPolicyChanged=$false}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $labOutput 'TRAINING_BUILD_RESULT.json') -Encoding UTF8
 $labStatusSource=Join-Path $PSScriptRoot '..\courses\onec-education\runtime\NexusTrainingStatus.cs'
 $labStatusExe=Join-Path $labOutput 'NexusTrainingStatus.exe'
 & $labCompiler /nologo /target:winexe /main:NexusTrainingStatus /platform:x64 /optimize+ /utf8output /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Management.dll /reference:System.Runtime.Serialization.dll (('/out:'+$labStatusExe)) $labSource $labStatusSource
 if($LASTEXITCODE -ne 0){throw 'Сборка ограниченного статуса training QA не прошла.'}
 [pscustomobject]@{status='IMPLEMENTED / bounded guest status; no raw file transfer';bootstrapSourceSha256=(Get-FileHash -LiteralPath $labSource -Algorithm SHA256).Hash.ToLowerInvariant();statusSourceSha256=(Get-FileHash -LiteralPath $labStatusSource -Algorithm SHA256).Hash.ToLowerInvariant();binarySha256=(Get-FileHash -LiteralPath $labStatusExe -Algorithm SHA256).Hash.ToLowerInvariant();hostExecutionAllowed=$false;securityPolicyChanged=$false}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $labOutput 'STATUS_BUILD_RESULT.json') -Encoding UTF8
 $labLearnerSource=Join-Path $PSScriptRoot '..\courses\onec-education\runtime\NexusLearnerRunner.cs'
 if(Test-Path -LiteralPath $labLearnerSource){
  $labLearnerExe=Join-Path $labOutput 'NexusLearnerRunner.exe'
  & $labCompiler /nologo /target:winexe /main:NexusLearnerRunner /platform:x64 /optimize+ /utf8output /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Management.dll /reference:System.Runtime.Serialization.dll (('/resource:'+$labTrainingLock+',NexusTrainingLock')) (('/resource:'+$labTrainingSpec+',NexusFullSpec')) (('/out:'+$labLearnerExe)) $labSource $labTrainingSource $labLearnerSource
  if($LASTEXITCODE -ne 0){throw 'Сборка guest learner runner не прошла.'}
  [pscustomobject]@{status='IMPLEMENTED / personal disposable guest; no server attestation';bootstrapSourceSha256=(Get-FileHash -LiteralPath $labSource -Algorithm SHA256).Hash.ToLowerInvariant();trainingSourceSha256=(Get-FileHash -LiteralPath $labTrainingSource -Algorithm SHA256).Hash.ToLowerInvariant();learnerSourceSha256=(Get-FileHash -LiteralPath $labLearnerSource -Algorithm SHA256).Hash.ToLowerInvariant();trainingLockSha256=(Get-FileHash -LiteralPath $labTrainingLock -Algorithm SHA256).Hash.ToLowerInvariant();specSha256=(Get-FileHash -LiteralPath $labTrainingSpec -Algorithm SHA256).Hash.ToLowerInvariant();binarySha256=(Get-FileHash -LiteralPath $labLearnerExe -Algorithm SHA256).Hash.ToLowerInvariant();hostExecutionAllowed=$false;serverAttestation=$false;securityPolicyChanged=$false}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $labOutput 'LEARNER_BUILD_RESULT.json') -Encoding UTF8
  $labProbeSource=Join-Path $PSScriptRoot '..\courses\onec-education\runtime\NexusJobSelfTest.cs'
  $labProbeExe=Join-Path $labOutput 'NexusJobSelfTest.exe'
  & $labCompiler /nologo /target:winexe /main:NexusJobSelfTest /platform:x64 /optimize+ /utf8output /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Management.dll /reference:System.Runtime.Serialization.dll (('/out:'+$labProbeExe)) $labSource $labTrainingSource $labLearnerSource $labProbeSource
  if($LASTEXITCODE -ne 0){throw 'Сборка отдельного QA Job Object не прошла.'}
  [pscustomobject]@{status='IMPLEMENTED / guest-only resource QA';bootstrapSourceSha256=(Get-FileHash -LiteralPath $labSource -Algorithm SHA256).Hash.ToLowerInvariant();trainingSourceSha256=(Get-FileHash -LiteralPath $labTrainingSource -Algorithm SHA256).Hash.ToLowerInvariant();learnerSourceSha256=(Get-FileHash -LiteralPath $labLearnerSource -Algorithm SHA256).Hash.ToLowerInvariant();probeSourceSha256=(Get-FileHash -LiteralPath $labProbeSource -Algorithm SHA256).Hash.ToLowerInvariant();binarySha256=(Get-FileHash -LiteralPath $labProbeExe -Algorithm SHA256).Hash.ToLowerInvariant();hostExecutionAllowed=$false;securityPolicyChanged=$false}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $labOutput 'JOB_PROBE_BUILD_RESULT.json') -Encoding UTF8
 }
}
