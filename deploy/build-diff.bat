@echo off
echo Creation du dossier de deploiement differentiel...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0_build.ps1" -Diff
pause
