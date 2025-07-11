@echo off
echo Starting P-Chart Web Application...

REM Always work from production directory
cd /d "C:\p_chart_web"
echo Production location: C:\p_chart_web

REM Set environment variables for production
set NODE_ENV=production
set PORT=3000

REM Load environment variables from .env if it exists
if exist ".env" (
    echo Loading environment variables from .env...
    for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
        if not "%%a"=="" if not "%%a"=="#" set %%a=%%b
    )
    echo Environment variables loaded
) else (
    echo No .env file found, using defaults
    set DATABASE_URL=postgresql://pchart_user:pchart_password@localhost:5432/pchart_web
    set NEXTAUTH_URL=http://localhost:3000
)

REM Regenerate Prisma client to prevent version mismatch errors
if exist "node_modules\.bin\prisma.cmd" (
    echo Regenerating Prisma client...
    call "node_modules\.bin\prisma.cmd" generate
    if !errorlevel! equ 0 (
        echo Prisma client regenerated successfully
    ) else (
        echo Warning: Prisma client regeneration failed, but continuing...
    )
) else (
    echo Warning: Prisma CLI not found, skipping client regeneration
)

REM Verify server.js exists
if not exist "server.js" (
    echo ERROR: server.js not found!
    echo Expected: C:\p_chart_web\server.js
    echo Run deployment script first to create standalone build
    exit /b 1
)

echo Starting standalone server on port %PORT%...
echo Access: http://localhost:%PORT%

REM Start the standalone server
node server.js