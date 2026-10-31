# Локальная CPU-сборка MIT whisper.cpp. Архивы/модели/EXE не включаются в Git.
param([Parameter(Mandatory=$true)][string]$SourceArchive,[Parameter(Mandatory=$true)][string]$CmakeExecutable,[Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference='Stop'
$asrOut=[IO.Path]::GetFullPath($OutputDirectory);if(Test-Path -LiteralPath $asrOut){throw 'Нужен новый каталог сборки.'}
$asrLock=Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot '..\courses\onec-education\voice\asr-lock.json')|ConvertFrom-Json
if((Get-FileHash -LiteralPath $SourceArchive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $asrLock.sourceSha256){throw 'SOURCE_ARCHIVE_HASH'}
if((Get-FileHash -LiteralPath $CmakeExecutable -Algorithm SHA256).Hash.ToLowerInvariant() -ne '34d7b87ef2758bb58b69de5df42fc0ce1d1b01009b19b9930bb399e0fa96419a'){throw 'CMAKE_3_31_1_WINDOWS_HASH'}
# Сначала проверяем все имена закреплённого архива, затем распаковываем в новый каталог.
$asrEntries=& tar -tzf $SourceArchive;if($LASTEXITCODE -ne 0){throw 'ARCHIVE_LIST'}
foreach($asrEntry in $asrEntries){if($asrEntry -notmatch '^whisper\.cpp-1\.9\.5/' -or $asrEntry -match '(^|/)\.\.(/|$)|^[\\/]|:'){throw 'ARCHIVE_PATH'}}
New-Item -ItemType Directory -Path $asrOut|Out-Null
& tar -xzf $SourceArchive -C $asrOut;if($LASTEXITCODE -ne 0){throw 'ARCHIVE_EXTRACT'}
$asrSource=Join-Path $asrOut 'whisper.cpp-1.9.5';$asrBuild=Join-Path $asrOut 'build'
& $CmakeExecutable -S $asrSource -B $asrBuild -G 'Visual Studio 17 2022' -A x64 -DBUILD_SHARED_LIBS=OFF -DWHISPER_CURL=OFF -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_EXAMPLES=ON -DGGML_NATIVE=OFF -DGGML_AVX512=OFF
if($LASTEXITCODE -ne 0){throw 'CMAKE_CONFIGURE'}
& $CmakeExecutable --build $asrBuild --config Release --target whisper-cli --parallel 4
if($LASTEXITCODE -ne 0){throw 'CMAKE_BUILD'}
$asrExe=Join-Path $asrOut 'whisper-cli.exe';Copy-Item -LiteralPath (Join-Path $asrBuild 'bin\Release\whisper-cli.exe') -Destination $asrExe
@{version=$asrLock.version;sourceArchiveSha256=$asrLock.sourceSha256;binarySha256=(Get-FileHash -LiteralPath $asrExe -Algorithm SHA256).Hash.ToLowerInvariant();curl=$false;sharedLibraries=$false;target='windows-x64-cpu';cmakeVersion='3.31.1';sourceLicense='MIT';systemInstallPerformed=$false}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $asrOut 'WINDOWS_ASR_BUILD.json') -Encoding UTF8
