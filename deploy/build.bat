@echo off
echo Creation du dossier de deploiement...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0_build.ps1"
pause
