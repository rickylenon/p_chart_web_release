@echo off
echo Stopping P-Chart Web Application...

REM Stop processes on port 3000
echo Stopping processes on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do (
    echo Killing PID: %%a
    taskkill /PID %%a /F >nul 2>&1
    if !errorlevel! equ 0 (
        echo Successfully killed PID: %%a
    ) else (
        echo Failed to kill PID: %%a
    )
)

REM Wait a moment and double-check
timeout /t 2 /nobreak >nul
echo Double-checking port 3000...
netstat -ano | findstr ":3000" >nul
if !errorlevel! equ 0 (
    echo Some processes still running on port 3000
    netstat -ano | findstr ":3000"
) else (
    echo Port 3000 is now free
)

REM Also kill any remaining Node.js processes as backup
echo Stopping any remaining Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
if !errorlevel! equ 0 (
    echo Stopped Node.js processes
) else (
    echo No Node.js processes to stop
)

echo Stop operation completed 