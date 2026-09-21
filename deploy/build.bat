@echo off
echo Creation de l'archive de deploiement...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0_build.ps1"
if exist "%~dp0dcc-sheet.zip" (
  for %%A in ("%~dp0dcc-sheet.zip") do echo Taille : %%~zA octets
) else (
  echo ERREUR : Impossible de creer l'archive.
)
pause
