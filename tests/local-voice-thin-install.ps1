param([Parameter(Mandatory=$true)][string]$Build,[Parameter(Mandatory=$true)][string]$Evidence,[switch]$VerifyPrepared)
$ErrorActionPreference='Stop'
Add-Type -Path (Join-Path $Build 'InstallerCore.dll')
Add-Type -AssemblyName System.Web.Extensions
Add-Type -TypeDefinition 'public static class VoiceTestProgress { public static System.Action<long> Bytes = n => {}; public static System.Action<string> Text = s => {}; }'
$config=[Web.Script.Serialization.JavaScriptSerializer]::new().Deserialize([IO.File]::ReadAllText((Join-Path $Build 'setup-config.json')),[ThinConfig])
$root=[IO.Path]::GetFullPath($Evidence)
if((Test-Path -LiteralPath $root) -and -not $VerifyPrepared){throw 'NEW_TEST_DIRECTORY_REQUIRED'}
$cache=Join-Path $root 'downloads';$installed=Join-Path $root 'installed'
[IO.Directory]::CreateDirectory($cache)|Out-Null
[IO.Directory]::CreateDirectory($installed)|Out-Null
$timer=[Diagnostics.Stopwatch]::StartNew();$completed=0;$reused=0;$downloaded=0
try{
 if(-not $VerifyPrepared){foreach($a in $config.artifacts){
  $file=Join-Path $cache ($a.sha256+'.blob')
  if($a.kind -eq 'app'){[IO.File]::Copy((Join-Path $Build $a.file),$file)}
  elseif($a.kind -eq 'model'){
   $source=[ThinInstall]::CachedModel($a)
   if(-not $source){throw 'TEST_MUST_NOT_DOWNLOAD_MODEL_WEIGHTS'}
   [ThinInstall]::LinkOrCopy($source,$file);$reused+=$a.bytes
  }else{
   $url=[ThinInstall]::Resolve($a.url,[Threading.CancellationToken]::None).GetAwaiter().GetResult()
   [VoiceInstallCore]::Download($a.Archive($url),$file,[VoiceTestProgress]::Bytes,[Threading.CancellationToken]::None).GetAwaiter().GetResult()
   $downloaded+=$a.bytes
  }
  [VoiceInstallCore]::Verify($file,$a.bytes,$a.sha256)
  $completed++;Write-Output ('COMPONENT '+$completed+'/'+$config.artifacts.Length+' '+$a.kind+' '+$a.file)
 }
 [ThinInstall]::Prepare($config,$installed,$cache,[VoiceTestProgress]::Text,[Threading.CancellationToken]::None)
 }
 $script=@'
import json,sys,pathlib,ctypes
import torch,torchaudio,qwen_tts,transformers,sox
root=pathlib.Path(sys.executable).parent.resolve()
assert all(str(pathlib.Path(m.__file__).resolve()).lower().startswith(str(root).lower()) for m in [torch,torchaudio,qwen_tts,transformers,sox])
assert torch.cuda.is_available()
modules={}
for name in ['msvcp140.dll','msvcp140_1.dll','vcruntime140.dll','vcruntime140_1.dll']:
 k=ctypes.WinDLL('kernel32',use_last_error=True);k.GetModuleHandleW.restype=ctypes.c_void_p;k.GetModuleFileNameW.argtypes=[ctypes.c_void_p,ctypes.c_wchar_p,ctypes.c_uint]
 h=k.GetModuleHandleW(name);b=ctypes.create_unicode_buffer(32768);assert h and k.GetModuleFileNameW(h,b,len(b));assert str(pathlib.Path(b.value).resolve()).lower().startswith(str(root).lower()),(name,b.value);modules[name]='private runtime'
print(json.dumps({'status':'THIN_INSTALL_ISOLATED_IMPORT_PASS','torch':torch.__version__,'cuda':torch.cuda.get_device_name(0),'crt':modules,'globalDependenciesUsed':False}))
'@
 $proofScript=Join-Path $root 'check_runtime.py';[IO.File]::WriteAllText($proofScript,$script,[Text.UTF8Encoding]::new($false))
 $info=[Diagnostics.ProcessStartInfo]::new((Join-Path $installed 'runtime/python.exe'),('-I -B "'+$proofScript+'"'));$info.UseShellExecute=$false;$info.CreateNoWindow=$true;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
 $process=[Diagnostics.Process]::Start($info);$output=$process.StandardOutput.ReadToEndAsync();$errorOutput=$process.StandardError.ReadToEndAsync();$process.WaitForExit()
 $import=$output.GetAwaiter().GetResult();[IO.File]::WriteAllText((Join-Path $root 'IMPORT_STDERR.txt'),$errorOutput.GetAwaiter().GetResult())
 if($process.ExitCode -ne 0){throw 'THIN_IMPORT_FAILED'}
 $json=@($import -split "`n"|Where-Object {$_ -like '{"status": "THIN_INSTALL_ISOLATED_IMPORT_PASS"*'})[-1];if(-not $json){throw 'IMPORT_PROOF_MISSING'}
 [IO.File]::WriteAllText((Join-Path $root 'IMPORT_PASS.json'),$json)
 @{status=if($VerifyPrepared){'PREPARED_THIN_INSTALL_IMPORT_PASS'}else{'REAL_THIN_INSTALL_PASS'};verificationOnly=[bool]$VerifyPrepared;components=$config.artifacts.Length;publisherDownloadBytes=($config.artifacts|Where-Object {$_.kind -notin @('app','model')}|Measure-Object bytes -Sum).Sum;cachedModelBytes=($config.artifacts|Where-Object {$_.kind -eq 'model'}|Measure-Object bytes -Sum).Sum;elapsedMs=$timer.ElapsedMilliseconds;modelDownloads=0;cloudModelCalls=0;globalInstallations=0}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $root 'REAL_THIN_INSTALL.json') -Encoding UTF8
 Write-Output $json
}catch{
 @{status='FAIL';components=$completed;elapsedMs=$timer.ElapsedMilliseconds;message=$_.Exception.Message}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $root 'INSTALL_FAIL.json') -Encoding UTF8
 throw
}
