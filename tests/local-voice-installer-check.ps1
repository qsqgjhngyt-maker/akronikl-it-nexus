param([Parameter(Mandatory=$true)][string]$Build,[Parameter(Mandatory=$true)][string]$Evidence)
$ErrorActionPreference='Stop'
Add-Type -Path (Join-Path $Build 'InstallerCore.dll')
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$root=Join-Path $Evidence ('fixture-'+[Guid]::NewGuid().ToString('N'));New-Item -ItemType Directory -Path $root | Out-Null
$results=[Collections.Generic.List[object]]::new()
function Check([string]$Name,[scriptblock]$Action){try{& $Action;$results.Add(@{name=$Name;status='PASS'})}catch{$results.Add(@{name=$Name;status='FAIL';error=$_.Exception.GetType().Name});throw}}
function Need($condition){if(-not $condition){throw 'CHECK_FAILED'}}
function Reject([scriptblock]$Action){$rejected=$false;try{& $Action}catch{$rejected=$true};Need $rejected}
Check 'hardware-preflight-actual' { $gpu=[VoiceInstallCore]::Gpu();Need ($gpu -like '*NVIDIA*') }
$file=Join-Path $root 'payload.txt';[IO.File]::WriteAllText($file,'verified voice payload');$hash=[VoiceInstallCore]::HashFile($file);$length=(Get-Item -LiteralPath $file).Length
Check 'valid-size-and-sha256' { [VoiceInstallCore]::Verify($file,$length,$hash) }
Check 'tampered-payload-blocked' { Reject { [VoiceInstallCore]::Verify($file,$length,('0'*64)) } }
Check 'wrong-size-blocked' { Reject { [VoiceInstallCore]::Verify($file,($length+1),$hash) } }
function Zip([string]$name,[string]$entry){$z=[IO.Compression.ZipFile]::Open($name,[IO.Compression.ZipArchiveMode]::Create);try{$e=$z.CreateEntry($entry);$writer=[IO.StreamWriter]::new($e.Open());$writer.Write('abc');$writer.Dispose()}finally{$z.Dispose()}}
$good=Join-Path $root 'good.zip';Zip $good 'Start.ps1'
Check 'normal-extraction' { [VoiceInstallCore]::Extract($good,(Join-Path $root 'installed'),3,[Action[long]]{});Need (Test-Path -LiteralPath (Join-Path $root 'installed\Start.ps1')) }
$bad=Join-Path $root 'bad.zip';Zip $bad '../outside.txt'
Check 'zip-traversal-blocked' { Reject { [VoiceInstallCore]::Extract($bad,(Join-Path $root 'blocked'),3,[Action[long]]{}) };Need (-not (Test-Path -LiteralPath (Join-Path $root 'outside.txt'))) }
Check 'zip-size-limit-blocked' { Reject { [VoiceInstallCore]::Extract($good,(Join-Path $root 'too-small'),2,[Action[long]]{}) } }
$overlay=Join-Path $root 'overlay-bad.zip';Zip $overlay 'runtime/python.exe'
Check 'application-overlay-cannot-replace-runtime' { Reject { [VoiceInstallCore]::Extract($overlay,(Join-Path $root 'overlay'),3,[Action[long]]{},$true) } }
Check 'cancelled-extraction-does-not-install' { $token=[Threading.CancellationTokenSource]::new();$token.Cancel();Reject { [VoiceInstallCore]::Extract($good,(Join-Path $root 'cancelled'),3,[Action[long]]{},$false,$token.Token) };Need (-not (Test-Path -LiteralPath (Join-Path $root 'cancelled\Start.ps1'))) }
Check 'staging-cleanup-cannot-delete-arbitrary-folder' { Reject { [VoiceInstallCore]::RemoveStaging($root) };Need (Test-Path -LiteralPath $root) }
$proof=@{status='INSTALLER_TARGETED_CHECKS_PASS';checks=$results;modelDownloads=0;cloudModelCalls=0;globalInstallations=0}
$proof | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $Evidence 'INSTALLER_CHECKS.json') -Encoding UTF8
Write-Output ($proof | ConvertTo-Json -Depth 5 -Compress)
