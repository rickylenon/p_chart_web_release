@echo off
REM MySQL Setup Script for P-Chart
REM This script sets up the database using fixed credentials

echo Setting up MySQL for P-Chart...

REM Fixed credentials
set "mysqlUser=root"
set "mysqlPassword=rootroot"
set "appUser=pchart_user"
set "appPassword=pchart_password"
set "databaseName=pchart_web"

echo Creating database and user with fixed credentials...

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
echo Checked locations:
echo   - C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe
echo   - C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe
echo   - C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe
echo   - C:\xampp\mysql\bin\mysql.exe
echo   - C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe
echo   - mysql.exe (in PATH)
pause
exit /b 1

:found
echo SUCCESS: MySQL client found: %mysqlPath%

REM Test MySQL connection
echo.
echo Testing MySQL connection...
%mysqlPath% -u %mysqlUser% -p%mysqlPassword% -e "SELECT VERSION();" 2>nul
if %errorlevel% neq 0 (
    echo ERROR: MySQL connection failed
    echo Please verify credentials and ensure MySQL is running
    echo   User: %mysqlUser%
    echo   Password: %mysqlPassword%
    echo   Host: localhost
    echo   Port: 3306
    pause
    exit /b 1
)

echo SUCCESS: MySQL connection successful

REM Create database
echo.
echo Creating database %databaseName%...
%mysqlPath% -u %mysqlUser% -p%mysqlPassword% -e "CREATE DATABASE IF NOT EXISTS %databaseName%;"
if %errorlevel% neq 0 (
    echo ERROR: Failed to create database
    pause
    exit /b 1
)

REM Create user (drop first if exists)
echo Creating user %appUser%...
%mysqlPath% -u %mysqlUser% -p%mysqlPassword% -e "DROP USER IF EXISTS '%appUser%'@'localhost';"
%mysqlPath% -u %mysqlUser% -p%mysqlPassword% -e "CREATE USER '%appUser%'@'localhost' IDENTIFIED BY '%appPassword%';"
if %errorlevel% neq 0 (
    echo ERROR: Failed to create user
    pause
    exit /b 1
)

REM Grant privileges
echo Granting privileges...
%mysqlPath% -u %mysqlUser% -p%mysqlPassword% -e "GRANT ALL PRIVILEGES ON %databaseName%.* TO '%appUser%'@'localhost';"
%mysqlPath% -u %mysqlUser% -p%mysqlPassword% -e "FLUSH PRIVILEGES;"
if %errorlevel% neq 0 (
    echo ERROR: Failed to grant privileges
    pause
    exit /b 1
)

REM Run Prisma migrations to create table structure
echo.
echo Setting up database schema...
if exist "node_modules\.bin\prisma.cmd" (
    echo Running Prisma migrations...
    node_modules\.bin\prisma.cmd migrate deploy
    if %errorlevel% neq 0 (
        echo ERROR: Prisma migration failed
        echo This might be due to existing PostgreSQL migrations
        echo Please remove the prisma\migrations directory and run:
        echo   node_modules\.bin\prisma.cmd migrate dev --name init
        pause
        exit /b 1
    )
    echo SUCCESS: Database schema created successfully
) else (
    echo WARNING: Prisma CLI not found in node_modules\.bin\
    echo Please run: npm install
    echo Then manually run: node_modules\.bin\prisma.cmd migrate deploy
    pause
)

echo.
echo Database setup completed successfully!

echo.
echo Database Configuration:
echo   Database: %databaseName%
echo   Host: localhost
echo   Port: 3306
echo   User: %appUser%
echo   Password: %appPassword%
echo.
echo Connection String:
echo   mysql://%appUser%:%appPassword%@localhost:3306/%databaseName%
echo.

pause 