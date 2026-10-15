@echo off
echo Creation du zip du package minimal dcc-spells-reader (sorts + reference contentref)...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0_gen-spell-content.ps1"
pause
