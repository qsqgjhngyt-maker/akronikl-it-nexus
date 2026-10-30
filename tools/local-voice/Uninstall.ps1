$ErrorActionPreference='Stop'
Add-Type -AssemblyName PresentationFramework
if ([Windows.MessageBox]::Show('Удалить локальный Qwen TTS и его загрузки с этого компьютера? История и настройки аккаунта Nexus сохранятся.','Удаление голоса','YesNo') -ne 'Yes') { exit }
$voiceHome=[IO.Path]::GetFullPath((Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Akronikl\LocalVoice'))
$versions=Join-Path $voiceHome 'versions'
$ownNode=@(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.ExecutablePath -and $_.ExecutablePath.StartsWith($versions+'\',[StringComparison]::OrdinalIgnoreCase) -and $_.CommandLine -like '*local-voice.mjs*' })
foreach($item in $ownNode) {
 foreach($child in @(Get-CimInstance Win32_Process -Filter ('ParentProcessId='+$item.ProcessId) | Where-Object { $_.ExecutablePath -and $_.ExecutablePath.StartsWith($versions+'\',[StringComparison]::OrdinalIgnoreCase) })) { Stop-Process -Id $child.ProcessId -ErrorAction SilentlyContinue }
 Stop-Process -Id $item.ProcessId -ErrorAction SilentlyContinue
}
if (Test-Path -LiteralPath $voiceHome) {
 if ((Get-Item -LiteralPath $voiceHome).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Папка голоса перенаправлена. Автоматическое удаление остановлено.' }
 foreach($folder in Get-ChildItem -LiteralPath $voiceHome -Directory -Recurse -Force) { if ($folder.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Найдена ссылка на другую папку. Автоматическое удаление остановлено.' } }
 if ([IO.Path]::GetFullPath($voiceHome) -ne (Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Akronikl\LocalVoice')) { throw 'Недопустимая папка удаления.' }
 Remove-Item -LiteralPath $voiceHome -Recurse -Force
}
$shortcut=Join-Path ([Environment]::GetFolderPath('Programs')) 'Akronikl\Голос Уют-7 Qwen TTS.lnk'
if (Test-Path -LiteralPath $shortcut) { Remove-Item -LiteralPath $shortcut -Force }
Remove-Item -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\AkroniklLocalQwenVoice' -ErrorAction SilentlyContinue
$protocol='HKCU:\Software\Classes\akronikl-nexus-voice'
if (Test-Path -LiteralPath ($protocol+'\shell\open\command')) { $command=(Get-Item -LiteralPath ($protocol+'\shell\open\command')).GetValue(''); if ($command -and $command.IndexOf($versions,[StringComparison]::OrdinalIgnoreCase) -ge 0) { Remove-Item -LiteralPath $protocol -Recurse -Force } }
[Windows.MessageBox]::Show('Локальный голос удалён. Данные аккаунта Nexus сохранены.','Голос Nexus') | Out-Null
