@echo off
set PHP_BIN=D:\VS_Code_Workspaces\php\php.exe
set ROOT=%~dp0..\..
echo === DCC Fiches de Personnage ===
echo Demarrage du serveur PHP...
echo Ouvrez http://localhost:8000/dcc-sheet/
echo Appuyez sur Ctrl+C pour arreter
REM Plafonds d'upload de l'export/import global (ZIP json + images, 11/10/2026) :
REM php -S ignore api/.user.ini (SAPI cli-server) -> -d explicites, memes
REM valeurs que le php-wasm de l'APK (cgi-worker.mjs : 64M/64M).
"%PHP_BIN%" -d post_max_size=70M -d upload_max_filesize=64M -S localhost:8000 -t "%ROOT%"
