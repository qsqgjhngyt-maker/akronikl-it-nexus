param([string]$Python='', [string]$ModelDirectory='')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName PresentationFramework
function Fail-Voice([string]$Message) { [System.Windows.MessageBox]::Show($Message, 'Локальный голос Akronikl') | Out-Null; exit 1 }
$voiceNode = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $voiceNode) { Fail-Voice 'Для этого пробного модуля нужен Node.js 22 или новее. Установите его с nodejs.org. Быстрый голос Piper в Nexus работает без установки модуля.' }
if (-not $Python) { $Python = Join-Path $env:USERPROFILE 'Kitsune-Qwen-Voice\.venv\Scripts\python.exe' }
if (-not (Test-Path -LiteralPath $Python -PathType Leaf)) { Fail-Voice 'Не найдена среда локальной Qwen TTS из Kitsune. Этот пробный модуль использует уже установленную Qwen; новые модели автоматически не скачиваются. Быстрый голос Piper доступен прямо в Nexus.' }
if (-not $ModelDirectory) {
 $voiceHub = if ($env:HUGGINGFACE_HUB_CACHE) { $env:HUGGINGFACE_HUB_CACHE } elseif ($env:HF_HOME) { Join-Path $env:HF_HOME 'hub' } else { Join-Path $env:USERPROFILE '.cache\huggingface\hub' }
 $voiceRussian = Join-Path $voiceHub 'models--siriusfreak--qwen3-tts-12hz-1.7b-ru-stress-cf\snapshots\c16b3af3db3095120efc1ebb73f6522442bcb3b1'
 if (Test-Path -LiteralPath (Join-Path $voiceRussian 'config.json') -PathType Leaf) { $ModelDirectory = $voiceRussian }
 else {
  $voiceSnapshots = Join-Path $voiceHub 'models--Qwen--Qwen3-TTS-12Hz-1.7B-Base\snapshots'
  if (Test-Path -LiteralPath $voiceSnapshots -PathType Container) { $voiceModel = Get-ChildItem -LiteralPath $voiceSnapshots -Directory | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'config.json') } | Sort-Object LastWriteTime -Descending | Select-Object -First 1; $ModelDirectory = $voiceModel.FullName }
 }
}
if (-not $ModelDirectory -or -not (Test-Path -LiteralPath (Join-Path $ModelDirectory 'config.json') -PathType Leaf)) { Fail-Voice 'Не найдена установленная Qwen3 TTS 1.7B Base. Пробный модуль предназначен для компьютера с этой моделью. Ничего автоматически не скачано.' }
$voiceHome = Join-Path $env:LOCALAPPDATA 'Akronikl\LocalVoice'
New-Item -ItemType Directory -Path $voiceHome -Force | Out-Null
$voiceConfig = Join-Path $voiceHome 'voice-config.json'
@{ python=$Python; modelDirectory=$ModelDirectory; privateDirectory=(Join-Path $voiceHome 'cache') } | ConvertTo-Json | Set-Content -LiteralPath $voiceConfig -Encoding UTF8
try { $voiceExisting=Invoke-WebRequest -Uri 'http://127.0.0.1:18791/' -TimeoutSec 2 -UseBasicParsing; if ($voiceExisting.Headers['X-Akronikl-Local-Voice'] -eq 'v1') { Start-Process 'http://127.0.0.1:18791/'; exit 0 } else { Fail-Voice 'Порт локального модуля занят другим приложением.' } } catch {}
$voiceEntry = Join-Path $PSScriptRoot 'local-voice.mjs'
$voiceArguments = @('"'+$voiceEntry+'"', '"'+$voiceConfig+'"')
Start-Process -FilePath $voiceNode.Source -ArgumentList $voiceArguments -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $voiceHome 'module.log') -RedirectStandardError (Join-Path $voiceHome 'module-error.log') | Out-Null
$voiceReady=$false
for ($voiceAttempt=0; $voiceAttempt -lt 20; $voiceAttempt++) {
 try { $voiceResponse=Invoke-WebRequest -Uri 'http://127.0.0.1:18791/' -TimeoutSec 2 -UseBasicParsing; if ($voiceResponse.Headers['X-Akronikl-Local-Voice'] -eq 'v1') { $voiceReady=$true; break } } catch {}
 Start-Sleep -Milliseconds 300
}
if (-not $voiceReady) { Fail-Voice ('Не удалось запустить локальный модуль. Сведения: '+(Join-Path $voiceHome 'module-error.log')) }
Start-Process 'http://127.0.0.1:18791/'
