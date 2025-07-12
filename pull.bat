@echo off
REM =================================================================
REM P-Chart Web - Automatic Update Script
REM =================================================================
REM
REM To set up as a scheduled task in Windows:
REM 1. Open Task Scheduler (taskschd.msc)
REM 2. Click "Create Basic Task" in the right panel
REM 3. Name: "P-Chart Web Auto Update"
REM    Description: "Automatically pulls updates and restarts if needed"
REM 4. Trigger: Choose how often to check (e.g., Daily)
REM 5. Action: Start a program
REM    - Program/script: C:\p_chart_web\pull.bat
REM    - Start in: C:\p_chart_web
REM 6. Optional settings in properties:
REM    - Run whether user is logged in or not
REM    - Run with highest privileges
REM
REM Note: The working directory must be set to ensure proper execution
REM =================================================================

setlocal enabledelayedexpansion

echo Checking for updates in P-Chart Web Application...

REM Always work from production directory
cd /d "C:\p_chart_web"

REM Store current commit hash
for /f %%i in ('git rev-parse HEAD') do set "BEFORE_PULL=%%i"

REM Fetch and pull changes
echo Fetching changes...
git fetch
if %ERRORLEVEL% neq 0 (
    echo Error: Failed to fetch changes from repository
    exit /b 1
)

echo Pulling changes...
git pull
if %ERRORLEVEL% neq 0 (
    echo Error: Failed to pull changes from repository
    exit /b 1
)

REM Get new commit hash
for /f %%i in ('git rev-parse HEAD') do set "AFTER_PULL=%%i"

REM Compare hashes to detect changes
if not "!BEFORE_PULL!"=="!AFTER_PULL!" (
    echo Changes detected - restarting application...
    call ".\restart.bat"
) else (
    echo No changes detected - application is up to date
)

endlocal 