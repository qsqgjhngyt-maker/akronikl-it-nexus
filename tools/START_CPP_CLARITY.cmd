@echo off
chcp 65001 >nul
setlocal
set "CLARITY_NODE=C:\Program Files\nodejs\node.exe"
if not exist "%CLARITY_NODE%" set "CLARITY_NODE=node"
set "CLARITY_FRONTEND=%~dp0frontend"
if not "%~1"=="" set "CLARITY_FRONTEND=%~1"
echo Локальный просмотр CPP-CLARITY-01. Публичный сайт и рабочие данные не используются.
"%CLARITY_NODE%" "%~dp0preview-cpp-clarity.mjs" --frontend "%CLARITY_FRONTEND%" --port 63368 --profile "%~dp0browser-profile" --receipt "%~dp0PREVIEW_SERVER.json" --open
if errorlevel 1 pause
endlocal
