@echo off
echo ========================================
echo P-Chart Web - System Update Applicator
echo ========================================

REM Get parameters
set UPDATE_ID=%1
set TEMP_PATH=%2
set PRODUCTION_PATH=%3

if "%UPDATE_ID%"=="" (
    echo ERROR: Update ID not provided
    pause
    exit /b 1
)

if "%TEMP_PATH%"=="" (
    set TEMP_PATH=%PRODUCTION_PATH%\temp\system-updates
)

if "%PRODUCTION_PATH%"=="" (
    set PRODUCTION_PATH=%~dp0
)

echo Update ID: %UPDATE_ID%
echo Temp Path: %TEMP_PATH%
echo Production Path: %PRODUCTION_PATH%
echo.

REM Wait for main application to fully stop
echo Waiting 5 seconds for application shutdown...
timeout /t 5 /nobreak >nul

REM Check if update files exist
if not exist "%TEMP_PATH%\%UPDATE_ID%.zip" (
    echo ERROR: Update file not found: %TEMP_PATH%\%UPDATE_ID%.zip
    pause
    exit /b 1
)

REM Extract update files
echo Extracting update files...
powershell -Command "Expand-Archive -Path '%TEMP_PATH%\%UPDATE_ID%.zip' -DestinationPath '%TEMP_PATH%\%UPDATE_ID%_extracted' -Force"

if %errorlevel% neq 0 (
    echo ERROR: Failed to extract update files
    pause
    exit /b 1
)

REM Check if extracted files have a root directory
set EXTRACTED_PATH=%TEMP_PATH%\%UPDATE_ID%_extracted
for /d %%d in ("%EXTRACTED_PATH%\*") do (
    set ROOT_DIR=%%~nxd
    goto :found_root
)

REM If no subdirectory found, files are at root level
set SOURCE_PATH=%EXTRACTED_PATH%
goto :copy_files

:found_root
REM Check if this looks like a project root directory
if exist "%EXTRACTED_PATH%\%ROOT_DIR%\server.js" (
    set SOURCE_PATH=%EXTRACTED_PATH%\%ROOT_DIR%
    echo Detected root directory in update: %ROOT_DIR%
) else (
    set SOURCE_PATH=%EXTRACTED_PATH%
)

:copy_files
echo Copying files from: %SOURCE_PATH%
echo To: %PRODUCTION_PATH%

REM Copy files, excluding .git, .env, and backup directories
robocopy "%SOURCE_PATH%" "%PRODUCTION_PATH%" /E /XD .git backup temp .env.* /XF .env /R:3 /W:5

if %errorlevel% gtr 7 (
    echo ERROR: Failed to copy update files
    pause
    exit /b 1
)

echo Update files copied successfully

REM Push changes to git (if configured)
echo Pushing changes to git...
cd /d "%PRODUCTION_PATH%"

REM Check if this is a git repository
if exist ".git" (
    echo Detected git repository, pushing manual update to remote...
    
    REM Add all changes
    git add -A
    
    REM Create commit message with update info
    git commit -m "Manual production update: %UPDATE_ID% - Applied %date% %time%"
    
    REM Push to remote (using current branch)
    git push origin HEAD
    
    if %errorlevel% equ 0 (
        echo Git push successful
    ) else (
        echo WARNING: Git push failed - manual update applied locally only
        echo This may cause conflicts with future git pulls
    )
) else (
    echo No git repository detected, skipping git push
)

REM Start the application
echo Starting application...

if exist "start.bat" (
    call start.bat
    echo Application started via start.bat
) else (
    echo WARNING: start.bat not found, please start manually
)

REM Clean up temporary files
echo Cleaning up...
rmdir /s /q "%TEMP_PATH%\%UPDATE_ID%_extracted" 2>nul

echo.
echo ========================================
echo Update completed successfully!
echo ========================================
pause 