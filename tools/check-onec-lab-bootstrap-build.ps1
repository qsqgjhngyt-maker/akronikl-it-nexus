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
