@echo off
set PHP_BIN=D:\VS_Code_Workspaces\php\php.exe
set ROOT=%~dp0..\..
echo === DCC Fiches de Personnage ===
echo Demarrage du serveur PHP...
echo Ouvrez http://localhost:8000/dcc-sheet/
echo Appuyez sur Ctrl+C pour arreter
"%PHP_BIN%" -S localhost:8000 -t "%ROOT%"
