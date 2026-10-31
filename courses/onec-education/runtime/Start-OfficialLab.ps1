param([switch]$Run,[string]$LicenseRecord='C:\NexusGuest\license.json')
$ErrorActionPreference='Stop'
# Этот script поставляется только в отдельный Windows Sandbox; host fallback отсутствует.
if($env:USERNAME -ne 'WDAGUtilityAccount'){throw 'Этот запуск разрешён только внутри отдельного Windows Sandbox.'}
$labHardware=Get-CimInstance Win32_ComputerSystem
if($labHardware.Model -notmatch 'Virtual Machine'){throw 'Изолированная виртуальная среда не подтверждена.'}
$labInput='C:\NexusInput'
$labRoot='C:\NexusGuest'
if(-not(Test-Path -LiteralPath $labRoot)){New-Item -ItemType Directory -Path $labRoot|Out-Null}
$labJob=Get-Content -LiteralPath (Join-Path $labInput 'job.json') -Raw -Encoding UTF8|ConvertFrom-Json
foreach($file in $labJob.files){
 $labSource=[IO.Path]::GetFullPath((Join-Path (Join-Path $labInput 'source') $file.path))
 if(-not $labSource.StartsWith('C:\NexusInput\source\',[StringComparison]::OrdinalIgnoreCase)){throw 'Путь источника отклонён.'}
 if((Get-Item -LiteralPath $labSource).Length -ne $file.bytes -or (Get-FileHash -LiteralPath $labSource -Algorithm SHA256).Hash.ToLowerInvariant() -ne $file.sha256){throw 'Снимок исходников изменён.'}
}
if(-not $Run){
 $labGuide='<html lang="ru"><meta charset="utf-8"><title>Nexus — официальный стенд 1С</title><body><h1>Изолированный учебный стенд</h1><p>Исходники проверены. Сеть, буфер обмена, микрофон, принтеры и запись в host отключены.</p><p>Используйте законно лицензированную установленную в guest платформу. Если её нет — отдельный официальный экземпляр учебной версии, полученный для этой среды. Ключи и лицензии host не копируются.</p><p>Для учебной версии: только учебные базы, без реального учёта и общего сервера учеников. Пакет Nexus не содержит платформу или чужие конфигурации.</p><p>Скопируйте license.template.json в C:\NexusGuest\license.json, внесите проверенное право guest и путь платформы. Затем запустите этот script с -Run внутри guest. До этого BSL не выполняется.</p><p>Результаты остаются внутри guest. До закрытия сохраните нужный протокол разрешённым оператором способом. Исходная работа и прогресс на host не меняются. Автоматического зачёта нет.</p></body></html>'
 $labWelcome=Join-Path $labRoot 'README.html'
 [IO.File]::WriteAllText($labWelcome,$labGuide,[Text.Encoding]::UTF8)
 Start-Process -FilePath $labWelcome
 return
}
if(-not(Test-Path -LiteralPath $LicenseRecord)){throw 'Нет подтверждения лицензии для guest.'}
$labRights=Get-Content -LiteralPath $LicenseRecord -Raw -Encoding UTF8|ConvertFrom-Json
if($labRights.guestUseConfirmed -ne $true -or $labRights.licenseMode -notin @('installed-licensed','official-training') -or [string]::IsNullOrWhiteSpace($labRights.evidenceReference)){throw 'Право guest не подтверждено. Изменение булевого поля не заменяет проверку лицензии.'}
$labPlatform=[IO.Path]::GetFullPath($labRights.platformPath)
if(-not $labPlatform.StartsWith('C:\Program Files\1cv8\',[StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetFileName($labPlatform) -ne '1cv8.exe' -or -not(Test-Path -LiteralPath $labPlatform -PathType Leaf)){throw 'Нужна собственная установка официальной 1С внутри guest.'}
$labSignature=Get-AuthenticodeSignature -LiteralPath $labPlatform
if($labSignature.Status -ne 'Valid' -or $labSignature.SignerCertificate.Subject -notmatch '1C|1С'){throw 'Подпись поставщика платформы не подтверждена.'}
$labVersion=(Get-Item -LiteralPath $labPlatform).VersionInfo.ProductVersion
if($labVersion -notmatch '^8\.3\.27\.'){throw 'Версия требует отдельной матрицы совместимости.'}
$labAttempt=Join-Path $labRoot ([Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $labAttempt|Out-Null
$labWorkSource=Join-Path $labAttempt 'source'
foreach($file in $labJob.files){$labTarget=Join-Path $labWorkSource $file.path;$labParent=Split-Path $labTarget -Parent;if(-not(Test-Path -LiteralPath $labParent)){New-Item -ItemType Directory -Path $labParent -Force|Out-Null};Copy-Item -LiteralPath (Join-Path (Join-Path $labInput 'source') $file.path) -Destination $labTarget}
$labBase=Join-Path $labAttempt 'base'
function Invoke-Lab([string]$Name,[string[]]$Arguments){
 $labLog=Join-Path $labAttempt ($Name+'.private.log')
 $labProcess=Start-Process -FilePath $labPlatform -ArgumentList ($Arguments+@('/DisableStartupDialogs','/DisableStartupMessages','/Out',('"'+$labLog+'"'))) -WindowStyle Hidden -PassThru
 if(-not $labProcess.WaitForExit(45000)){$labProcess.Kill();throw ('Таймаут собственного процесса '+$Name)}
 if($labProcess.ExitCode -ne 0){throw ('Операция не прошла: '+$Name+'; личный диагностический журнал остаётся внутри guest.')}
}
Invoke-Lab 'create' @('CREATEINFOBASE',('File="'+$labBase+'";'))
Invoke-Lab 'load' @('DESIGNER','/F',('"'+$labBase+'"'),'/LoadConfigFromFiles',('"'+$labWorkSource+'"'),'/UpdateDBCfg')
Invoke-Lab 'check' @('DESIGNER','/F',('"'+$labBase+'"'),'/CheckConfig')
$labOutput=Join-Path $labAttempt 'learner-result.txt'
Invoke-Lab 'execute' @('ENTERPRISE','/F',('"'+$labBase+'"'),'/C',('"seed|'+$labOutput+'"'))
$labReceipt=[pscustomobject]@{schemaVersion=1;status='EXECUTED';runtime='official-1C';version=$labVersion;jobId=$labJob.jobId;workId=$labJob.workId;sourceRevision=$labJob.sourceRevision;sourceSnapshotSha256=$labJob.sourceSnapshotSha256;sourceInputPreserved=$true;outputTrusted=$false;automaticGrade=$false;codeVerifiedServer=$false;credentialEligible=$false;progressWritten=$false;licenseMode=$labRights.licenseMode}
$labReceipt|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $labAttempt 'receipt.json') -Encoding UTF8
