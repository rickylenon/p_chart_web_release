@echo off
echo Restarting P-Chart Web Application...
cd /d "%~dp0"
call ".\stop.bat"
timeout /t 3 /nobreak >nul
call ".\start.bat"
