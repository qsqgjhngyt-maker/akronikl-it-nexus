@echo off
setlocal
set "CLARITY_FRONTEND=%~dp0frontend-final"
if not "%~1"=="" set "CLARITY_FRONTEND=%~1"
"C:\Program Files\nodejs\node.exe" "%~dp0preview-cpp-clarity.mjs" --frontend "%CLARITY_FRONTEND%" --port 63368 --profile "%~dp0browser-profile" --receipt "%~dp0PREVIEW_SERVER.json" --open
endlocal
