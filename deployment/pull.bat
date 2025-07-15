@echo off
REM =================================================================
REM P-Chart Web - Automatic Update Script (Compatible with Manual Updates)
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

REM Check if manual system update is in progress or recently applied
if exist "temp\system-updates\MANUAL_UPDATE_ACTIVE" (
    echo Manual system update in progress - skipping git pull
    exit /b 0
)

if exist "temp\system-updates\MANUAL_UPDATE_APPLIED" (
    echo Recent manual update detected - checking if safe to pull...
    
    REM Check if manual update was applied in last 24 hours
    for /f %%i in ('powershell -command "(Get-Date) - (Get-Item 'temp\system-updates\MANUAL_UPDATE_APPLIED').LastWriteTime | Select-Object -ExpandProperty TotalHours"') do (
        if %%i lss 24 (
            echo Manual update too recent - skipping git pull for safety
            echo To force git pull, delete: temp\system-updates\MANUAL_UPDATE_APPLIED
            exit /b 0
        )
    )
    
    echo Manual update is old enough - proceeding with git pull
    del "temp\system-updates\MANUAL_UPDATE_APPLIED" >nul 2>&1
)

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
    echo.
    echo Checking for merge conflicts...
    git status | find "unmerged" >nul
    if %ERRORLEVEL% equ 0 (
        echo.
        echo ===============================================
        echo MERGE CONFLICT DETECTED
        echo ===============================================
        echo This usually happens when:
        echo - Manual updates were applied recently
        echo - Version numbers conflict between local and remote
        echo.
        echo TO RESOLVE:
        echo 1. Check conflicts: git status
        echo 2. Edit conflicted files (usually package.json)
        echo 3. Remove conflict markers (^<^<^<^<^<^<^<, =======, ^>^>^>^>^>^>^>)
        echo 4. Add resolved files: git add package.json
        echo 5. Commit changes: git commit -m "Resolve merge conflict"
        echo 6. Run pull.bat again
        echo.
        echo Or to reset to remote version:
        echo   git reset --hard origin/main
        echo   ^(WARNING: This will lose local manual updates^)
        echo ===============================================
    ) else (
        echo This might be due to network issues or other git problems
        echo Consider using manual system update instead
    )
    exit /b 1
)

REM Apply updated .gitignore patterns (cleanup tracked files that should be ignored)
echo Applying updated ignore patterns...
git rm --cached .env* >nul 2>&1
git rm --cached -r data/ >nul 2>&1
git rm --cached -r logs/ >nul 2>&1
git rm --cached *.log >nul 2>&1
git rm --cached -r tmp/ >nul 2>&1
git rm --cached -r temp/system-updates/ >nul 2>&1
git rm --cached production-data*.sql >nul 2>&1
git rm --cached *.backup >nul 2>&1
git rm --cached *.bak >nul 2>&1
git rm --cached .eslintcache >nul 2>&1

REM Reset staged changes (don't commit in production - it can't push)
git reset HEAD >nul 2>&1

REM Only discard changes that are not from manual updates
echo Cleaning up tracked files while preserving manual updates...
git status --porcelain | findstr "^??" > temp_untracked.txt
git checkout -- . >nul 2>&1

REM Get new commit hash
for /f %%i in ('git rev-parse HEAD') do set "AFTER_PULL=%%i"

REM Compare hashes to detect changes
if not "!BEFORE_PULL!"=="!AFTER_PULL!" (
    echo Git changes detected - restarting application...
    echo GIT_UPDATE > temp\system-updates\UPDATE_SOURCE
    call ".\restart.bat"
) else (
    echo No git changes detected - application is up to date
)

REM Cleanup
if exist temp_untracked.txt del temp_untracked.txt >nul 2>&1

endlocal 