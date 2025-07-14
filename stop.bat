@echo off
echo Stopping P-Chart Web Application...
cd /d "%~dp0"
taskkill /f /im node.exe >nul 2>&1
echo Application stopped
