@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] Node.js introuvable dans le PATH.
  pause
  exit /b 1
)
if not exist node_modules\jsdom (
  echo Installation des dependances de test...
  call npm.cmd install
  if errorlevel 1 (
    echo [ERREUR] npm install a echoue.
    pause
    exit /b 1
  )
)
node tests\run.js
set ERR=%ERRORLEVEL%
echo.
if %ERR% neq 0 (
  echo Resultat : ECHEC - voir tests\report.md
) else (
  echo Resultat : OK - voir tests\report.md
)
pause
exit /b %ERR%
