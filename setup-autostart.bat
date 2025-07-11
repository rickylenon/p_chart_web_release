@echo off
setlocal enabledelayedexpansion

:: Set up logging
set "LOG_FILE=%TEMP%\pchart_autostart_setup.log"
echo Setup started at %date% %time% > "%LOG_FILE%"

:: Check for administrator privileges
echo Checking administrator privileges... >> "%LOG_FILE%"
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Administrator privileges not detected >> "%LOG_FILE%"
    echo This script requires administrator privileges.
    echo Please run as administrator.
    echo Check %LOG_FILE% for details.
    pause
    exit /b 1
)
echo Administrator privileges confirmed >> "%LOG_FILE%"

:: Set variables
set "TASK_NAME=P-Chart Web Application"
set "SCRIPT_DIR=%~dp0"
set "RESTART_SCRIPT=%SCRIPT_DIR%restart.bat"
set "TASK_XML=%TEMP%\pchart_task.xml"

echo Variables set: >> "%LOG_FILE%"
echo   TASK_NAME=%TASK_NAME% >> "%LOG_FILE%"
echo   SCRIPT_DIR=%SCRIPT_DIR% >> "%LOG_FILE%"
echo   RESTART_SCRIPT=%RESTART_SCRIPT% >> "%LOG_FILE%"
echo   TASK_XML=%TASK_XML% >> "%LOG_FILE%"

:: Check if restart.bat exists
echo Checking for restart.bat... >> "%LOG_FILE%"
if not exist "%RESTART_SCRIPT%" (
    echo ERROR: restart.bat not found at %RESTART_SCRIPT% >> "%LOG_FILE%"
    echo Error: restart.bat not found at %RESTART_SCRIPT%
    echo Check %LOG_FILE% for details.
    pause
    exit /b 1
)
echo restart.bat found >> "%LOG_FILE%"

echo Setting up auto-start for P-Chart Web Application...

:: Remove existing task if it exists
echo Checking for existing task... >> "%LOG_FILE%"
schtasks /query /tn "%TASK_NAME%" >nul 2>&1
if %errorLevel% equ 0 (
    echo Removing existing task... >> "%LOG_FILE%"
    echo Removing existing task...
    schtasks /delete /tn "%TASK_NAME%" /f
    if !errorLevel! neq 0 (
        echo ERROR: Failed to remove existing task >> "%LOG_FILE%"
        echo Failed to remove existing task.
        echo Check %LOG_FILE% for details.
        pause
        exit /b 1
    )
    echo Existing task removed successfully >> "%LOG_FILE%"
)

:: Create XML configuration file
echo Creating task XML configuration... >> "%LOG_FILE%"
echo ^<?xml version="1.0" encoding="UTF-16"?^> > "%TASK_XML%"
echo ^<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task"^> >> "%TASK_XML%"
echo   ^<RegistrationInfo^> >> "%TASK_XML%"
echo     ^<Description^>Automatically starts P-Chart Web Application on system startup^</Description^> >> "%TASK_XML%"
echo   ^</RegistrationInfo^> >> "%TASK_XML%"
echo   ^<Triggers^> >> "%TASK_XML%"
echo     ^<BootTrigger^> >> "%TASK_XML%"
echo       ^<Enabled^>true^</Enabled^> >> "%TASK_XML%"
echo       ^<Delay^>PT30S^</Delay^> >> "%TASK_XML%"
echo     ^</BootTrigger^> >> "%TASK_XML%"
echo   ^</Triggers^> >> "%TASK_XML%"
echo   ^<Principals^> >> "%TASK_XML%"
echo     ^<Principal id="Author"^> >> "%TASK_XML%"
echo       ^<UserId^>S-1-5-18^</UserId^> >> "%TASK_XML%"
echo       ^<RunLevel^>HighestAvailable^</RunLevel^> >> "%TASK_XML%"
echo       ^<LogonType^>ServiceAccount^</LogonType^> >> "%TASK_XML%"
echo     ^</Principal^> >> "%TASK_XML%"
echo   ^</Principals^> >> "%TASK_XML%"
echo   ^<Settings^> >> "%TASK_XML%"
echo     ^<MultipleInstancesPolicy^>IgnoreNew^</MultipleInstancesPolicy^> >> "%TASK_XML%"
echo     ^<DisallowStartIfOnBatteries^>false^</DisallowStartIfOnBatteries^> >> "%TASK_XML%"
echo     ^<StopIfGoingOnBatteries^>false^</StopIfGoingOnBatteries^> >> "%TASK_XML%"
echo     ^<AllowHardTerminate^>true^</AllowHardTerminate^> >> "%TASK_XML%"
echo     ^<StartWhenAvailable^>true^</StartWhenAvailable^> >> "%TASK_XML%"
echo     ^<RestartOnFailure^> >> "%TASK_XML%"
echo       ^<Interval^>PT1M^</Interval^> >> "%TASK_XML%"
echo       ^<Count^>3^</Count^> >> "%TASK_XML%"
echo     ^</RestartOnFailure^> >> "%TASK_XML%"
echo     ^<ExecutionTimeLimit^>PT0S^</ExecutionTimeLimit^> >> "%TASK_XML%"
echo     ^<WakeToRun^>false^</WakeToRun^> >> "%TASK_XML%"
echo   ^</Settings^> >> "%TASK_XML%"
echo   ^<Actions Context="Author"^> >> "%TASK_XML%"
echo     ^<Exec^> >> "%TASK_XML%"
echo       ^<Command^>%RESTART_SCRIPT%^</Command^> >> "%TASK_XML%"
echo       ^<WorkingDirectory^>%SCRIPT_DIR%^</WorkingDirectory^> >> "%TASK_XML%"
echo     ^</Exec^> >> "%TASK_XML%"
echo   ^</Actions^> >> "%TASK_XML%"
echo ^</Task^> >> "%TASK_XML%"

:: Create the scheduled task
echo Creating scheduled task... >> "%LOG_FILE%"
schtasks /create /tn "%TASK_NAME%" /xml "%TASK_XML%" /f
set TASK_RESULT=%errorLevel%

if %TASK_RESULT% equ 0 (
    echo Task created successfully >> "%LOG_FILE%"
    echo.
    echo Setup completed successfully!
    echo The application will start automatically on system startup after a 30-second delay.
    
    :: Verify task creation
    echo Verifying task creation... >> "%LOG_FILE%"
    schtasks /query /tn "%TASK_NAME%" >nul 2>&1
    if !errorLevel! equ 0 (
        echo Task verification successful >> "%LOG_FILE%"
    ) else (
        echo WARNING: Task created but verification failed >> "%LOG_FILE%"
        echo WARNING: Task created but verification failed.
        echo Check Task Scheduler manually.
    )
    
    del "%TASK_XML%"
) else (
    echo ERROR: Failed to create task. Error code: %TASK_RESULT% >> "%LOG_FILE%"
    echo.
    echo Setup failed. Please check the error messages above.
    echo For detailed logs, check: %LOG_FILE%
    del "%TASK_XML%"
    pause
    exit /b 1
)

echo Setup completed at %date% %time% >> "%LOG_FILE%"
echo Log file location: %LOG_FILE%

endlocal 