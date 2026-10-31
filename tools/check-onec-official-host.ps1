param([string]$PlatformPath='C:\Program Files\1cv8\8.3.27.2214\bin\1cv8.exe')
$ErrorActionPreference='Stop'
$hostAdmin=([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
$sandboxCommands=@()
foreach($labSandboxName in @('WindowsSandbox.exe','wsb.exe')){
 $labResolvedCommand=Get-Command $labSandboxName -CommandType Application -ErrorAction SilentlyContinue|Select-Object -First 1
 $labSandboxPath=if($labResolvedCommand){$labResolvedCommand.Source}else{Join-Path ([Environment]::SystemDirectory) $labSandboxName}
 if(Test-Path -LiteralPath $labSandboxPath -PathType Leaf){$sandboxCommands += [pscustomobject]@{Name=$labSandboxName;Source=$labSandboxPath;Discovery=if($labResolvedCommand){'PATH'}else{'SystemDirectory'}}}
}
$platformFound=Test-Path -LiteralPath $PlatformPath -PathType Leaf
$signatureStatus=if($platformFound){[string](Get-AuthenticodeSignature -LiteralPath $PlatformPath).Status}else{'NOT_FOUND'}
$platformVersion=if($platformFound){(Get-Item -LiteralPath $PlatformPath).VersionInfo.ProductVersion}else{$null}
$featureState='UNKNOWN_REQUIRES_WINDOWS_ADMIN'
if($hostAdmin){$featureState=[string](Get-WindowsOptionalFeature -Online -FeatureName Containers-DisposableClientVM).State}
[pscustomobject]@{status=if($sandboxCommands.Count -gt 0){'PREFLIGHT_ONLY'}else{'BLOCKED_HOST_SANDBOX_UNAVAILABLE'};windowsAdmin=$hostAdmin;sandboxFeature=$featureState;sandboxCommands=$sandboxCommands;installedPlatformPresent=$platformFound;installedPlatformVersion=$platformVersion;platformSignature=$signatureStatus;hostLicenseKeysRead=$false;guestRightsConfirmed=$false;hostFallbackAllowed=$false;osFeaturesChanged=$false;productionChanged=$false}|ConvertTo-Json -Depth 5
