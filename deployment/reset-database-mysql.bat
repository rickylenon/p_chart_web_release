@echo off
REM P-Chart Web - MySQL Database Reset Batch Script
REM This script resets the MySQL database to empty state
REM 
REM WARNING: This will DELETE ALL DATA and DROP ALL TABLES
REM Use only for development/testing environments or fresh production setups

echo ======================================================
echo P-Chart Web - MySQL Database Reset Script
echo ======================================================
echo.
echo WARNING: This script will DELETE ALL DATA and DROP ALL TABLES!
echo Use only for development/testing or fresh production setups.
echo.

REM Fixed credentials (matching the migration scripts)
set "databaseHost=localhost"
set "databasePort=3306"
set "databaseName=pchart_web"
set "databaseUser=root"
set "databasePassword=rootroot"

REM MySQL installation paths to check
set "mysqlPath="
for %%P in (
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
    "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"
    "C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe"
    "C:\xampp\mysql\bin\mysql.exe"
    "C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe"
    "mysql.exe"
) do (
    if exist %%P (
        set "mysqlPath=%%P"
        goto :found
    )
)

REM Check if mysql is in PATH
where mysql.exe >nul 2>&1
if %errorlevel% == 0 (
    set "mysqlPath=mysql.exe"
    goto :found
)

:notfound
echo ERROR: MySQL client not found!
echo Please install MySQL or ensure mysql.exe is in PATH
pause
exit /b 1

:found
echo SUCCESS: MySQL client found: %mysqlPath%

echo.
echo Database connection details:
echo   Host: %databaseHost%
echo   Port: %databasePort%
echo   Database: %databaseName%
echo   User: %databaseUser%

REM Test database connection
echo.
echo Testing database connection...
%mysqlPath% -h %databaseHost% -P %databasePort% -u %databaseUser% -p%databasePassword% -e "SELECT VERSION();" 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Database connection failed
    echo Please verify credentials and ensure MySQL is running
    pause
    exit /b 1
)

echo SUCCESS: Database connection successful

REM Get final confirmation
echo.
echo FINAL CONFIRMATION:
echo This will permanently delete ALL data and tables in database '%databaseName%'
echo.
set /p "confirmation=Type 'DELETE ALL DATA' to proceed (case sensitive): "

if not "%confirmation%"=="DELETE ALL DATA" (
    echo Reset cancelled - confirmation text did not match exactly
    pause
    exit /b 0
)

echo.
echo Executing database reset...

REM Create temporary SQL script for reset
set "tempResetScript=%TEMP%\mysql_reset_script.sql"

echo -- P-Chart Web MySQL Database Reset Script > "%tempResetScript%"
echo -- WARNING: This drops all tables and resets the database >> "%tempResetScript%"
echo. >> "%tempResetScript%"
echo SET FOREIGN_KEY_CHECKS = 0; >> "%tempResetScript%"
echo. >> "%tempResetScript%"
echo DROP TABLE IF EXISTS audit_logs; >> "%tempResetScript%"
echo DROP TABLE IF EXISTS sessions; >> "%tempResetScript%"
echo DROP TABLE IF EXISTS notifications; >> "%tempResetScript%"
echo DROP TABLE IF EXISTS operation_defect_edit_requests; >> "%tempResetScript%"
echo DROP TABLE IF EXISTS operation_defects; >> "%tempResetScript%"
echo DROP TABLE IF EXISTS operations; >> "%tempResetScript%"
echo DROP TABLE IF EXISTS production_orders; >> "%tempResetScript%"
echo DROP TABLE IF EXISTS standard_costs; >> "%tempResetScript%"
echo DROP TABLE IF EXISTS master_defects; >> "%tempResetScript%"
echo DROP TABLE IF EXISTS operation_lines; >> "%tempResetScript%"
echo DROP TABLE IF EXISTS operation_steps; >> "%tempResetScript%"
echo DROP TABLE IF EXISTS users; >> "%tempResetScript%"
echo DROP TABLE IF EXISTS _prisma_migrations; >> "%tempResetScript%"
echo. >> "%tempResetScript%"
echo SET FOREIGN_KEY_CHECKS = 1; >> "%tempResetScript%"
echo. >> "%tempResetScript%"
echo -- Database reset completed >> "%tempResetScript%"

echo Executing SQL script...
%mysqlPath% -h %databaseHost% -P %databasePort% -u %databaseUser% -p%databasePassword% %databaseName% < "%tempResetScript%"

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Database reset encountered issues!
    echo Exit code: %errorlevel%
    echo.
    echo Please check:
    echo   - Database connection is working
    echo   - User has sufficient privileges
    echo   - Database server has sufficient resources
    del "%tempResetScript%" 2>nul
    pause
    exit /b 1
)

REM Clean up temporary script
del "%tempResetScript%" 2>nul

echo.
echo SUCCESS: Database reset completed!
echo.
echo Next steps:
echo   1. Update Prisma schema datasource to use MySQL
echo   2. Run Prisma migrations: npx prisma migrate deploy
echo   3. Generate Prisma client: npx prisma generate
echo   4. Optionally import data: node scripts/db-data-import-to-mysql.js
echo   5. Optionally seed data: npx prisma db seed
echo.
echo The database is now ready for fresh Prisma migrations!

pause 