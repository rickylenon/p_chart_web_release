@echo off
echo Restarting P-Chart Web Application...

REM Always work from production directory
cd /d "C:\p_chart_web"

echo Step 1: Stopping application...
call ".\stop.bat"

echo Waiting 3 seconds for clean shutdown...
timeout /t 3 /nobreak >nul

echo Step 2: Starting application...
call ".\start.bat"