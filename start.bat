@echo off
echo Starting P-Chart Web Application...
echo Production location: %~dp0
cd /d "%~dp0"

REM Load environment variables from .env if it exists
if exist ".env" (
    echo Loading environment variables from .env...
    for /f "usebackq tokens=*" %%a in (".env") do (
        set "%%a"
    )
    echo Environment variables loaded
)

echo Regenerating Prisma client...
if exist "node_modules\.bin\prisma.cmd" (
    call "node_modules\.bin\prisma.cmd" generate
    if %errorlevel% equ 0 (
        echo Prisma client generated successfully
    ) else (
        echo Warning: Prisma client regeneration failed, but continuing...
    )
) else (
    echo Warning: Prisma CLI not found, using existing client
)

echo Starting standalone server on port 3000...
echo Access: http://localhost:3000
node server.js
