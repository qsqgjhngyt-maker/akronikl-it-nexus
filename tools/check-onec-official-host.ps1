param([string]$PlatformPath='C:\Program Files\1cv8\8.3.27.2214\bin\1cv8.exe')
$ErrorActionPreference='Stop'
$hostAdmin=([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
$sandboxCommands=@()
foreach($labSandboxName in @('WindowsSandbox.exe','wsb.exe')){
 $labResolvedCommand=Get-Command $labSandboxName -CommandType Application -ErrorAction SilentlyContinue|Select-Object -First 1
 $labSandboxPath=if($labResolvedCommand){$labResolvedCommand.Source}else{Join-Path ([Environment]::SystemDirectory) $labSandboxName}
 if(Test-Path -LiteralPath $labSandboxPath -PathType Leaf){$sandboxCommands += [pscustomobject]@{Name=$labSandboxName;Source=$labSandboxPath;Discovery=if($labResolvedCommand){'PATH'}else{'SystemDirectory'}}}
}
$labSandboxPackage=Get-AppxPackage -Name 'MicrosoftWindows.WindowsSandbox' -ErrorAction SilentlyContinue|Sort-Object Version -Descending|Select-Object -First 1
if($labSandboxPackage -and $labSandboxPackage.InstallLocation -like 'C:\Program Files\WindowsApps\MicrosoftWindows.WindowsSandbox_*__cw5n1h2txyewy'){
 $labPackageCli=Join-Path $labSandboxPackage.InstallLocation 'wsb.exe'
 if((Test-Path -LiteralPath $labPackageCli -PathType Leaf) -and -not($sandboxCommands|Where-Object {$_.Name -eq 'wsb.exe'})){$sandboxCommands += [pscustomobject]@{Name='wsb.exe';Source=$labPackageCli;Discovery='RegisteredMicrosoftPackage'}}
}
$platformFound=Test-Path -LiteralPath $PlatformPath -PathType Leaf
$signatureStatus=if($platformFound){[string](Get-AuthenticodeSignature -LiteralPath $PlatformPath).Status}else{'NOT_FOUND'}
$platformVersion=if($platformFound){(Get-Item -LiteralPath $PlatformPath).VersionInfo.ProductVersion}else{$null}
$featureState='UNKNOWN_REQUIRES_WINDOWS_ADMIN'
if($hostAdmin){$featureState=[string](Get-WindowsOptionalFeature -Online -FeatureName Containers-DisposableClientVM).State}
[pscustomobject]@{status=if($sandboxCommands.Count -gt 0){'PREFLIGHT_ONLY'}else{'BLOCKED_HOST_SANDBOX_UNAVAILABLE'};windowsAdmin=$hostAdmin;sandboxFeature=$featureState;sandboxCommands=$sandboxCommands;installedPlatformPresent=$platformFound;installedPlatformVersion=$platformVersion;platformSignature=$signatureStatus;hostLicenseKeysRead=$false;guestRightsConfirmed=$false;hostFallbackAllowed=$false;osFeaturesChanged=$false;productionChanged=$false}|ConvertTo-Json -Depth 5
