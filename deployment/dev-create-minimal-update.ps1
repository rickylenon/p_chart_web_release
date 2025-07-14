# P-Chart Web - Minimal Update Package Creator
# This script creates a minimal update package by reading version from package.json
# Compress-Archive -Path server.js,package.json,.next,public -DestinationPath ..\system-update-fixed-v2.0.4.zip -Force

param(
    [string]$OutputPath = ""
)

# Check if we're in the correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found. Please run this script from the project root directory." -ForegroundColor Red
    exit 1
}

# Read version from package.json
try {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $currentVersion = $packageJson.version
    Write-Host "Detected version: $currentVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Could not read version from package.json" -ForegroundColor Red
    exit 1
}

# Set output path if not provided
if ([string]::IsNullOrEmpty($OutputPath)) {
    $OutputPath = "C:\dev\p_chart_web_update_v$currentVersion"
}

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  P-Chart Web - Minimal Update Package Creator" -ForegroundColor Yellow
Write-Host "  Version $currentVersion Update" -ForegroundColor Yellow
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "Creating minimal update package at: $OutputPath" -ForegroundColor Cyan

# Remove existing update directory
if (Test-Path $OutputPath) {
    Remove-Item -Path $OutputPath -Recurse -Force
    Write-Host "Removed existing update directory" -ForegroundColor Green
}

# Create update directory
New-Item -Path $OutputPath -ItemType Directory -Force | Out-Null

# Step 1: Build Application
Write-Host "Building application..." -ForegroundColor Cyan
Write-Host "This may take a moment..." -ForegroundColor Gray

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor White
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: npm install failed" -ForegroundColor Red
        exit 1
    }
}

# Build the application
npm run build
# Check if build actually produced the required files (Next.js may return non-zero exit code for warnings)
if (-not (Test-Path ".next/standalone/server.js")) {
    Write-Host "ERROR: Build failed - server.js not found" -ForegroundColor Red
    Write-Host "Build output should be in .next/standalone/server.js" -ForegroundColor Yellow
    exit 1
}

Write-Host "Build completed successfully (warnings ignored)" -ForegroundColor Green

# Step 2: Copy Essential Files Only
Write-Host "Copying essential files for v$currentVersion update..." -ForegroundColor Cyan

# Copy main server file (contains all compiled components)
Copy-Item -Path ".next/standalone/server.js" -Destination "$OutputPath/server.js" -Force
Write-Host "server.js (main application with Navigation/UserMenu fixes)" -ForegroundColor Green

# Copy entire .next directory (contains all build artifacts)
$nextSource = ".next"
$nextDest = "$OutputPath/.next"
if (Test-Path $nextSource) {
    Copy-Item -Path $nextSource -Destination $nextDest -Recurse -Force
    Write-Host "Complete .next directory (all build artifacts)" -ForegroundColor Green
} else {
    Write-Host "WARNING: No .next directory found" -ForegroundColor Yellow
}

# Copy package.json (version update)
Copy-Item -Path "package.json" -Destination "$OutputPath/package.json" -Force
Write-Host "package.json (version $currentVersion)" -ForegroundColor Green

# Copy public assets if they exist
if (Test-Path "public") {
    Copy-Item -Path "public" -Destination "$OutputPath/public" -Recurse -Force
    Write-Host "Public assets" -ForegroundColor Green
}

# Step 2.5: Add Essential CLI Tools and Prisma Engines (from standalone deployment)
Write-Host "Adding essential CLI tools and Prisma engines..." -ForegroundColor Cyan

# Create node_modules directory structure
$nodeModulesPath = "$OutputPath/node_modules"
if (-not (Test-Path $nodeModulesPath)) {
    New-Item -Path $nodeModulesPath -ItemType Directory -Force | Out-Null
}

# Copy entire .bin directory (includes all CLI tools)
$binSource = "node_modules\.bin"
$binDest = Join-Path $nodeModulesPath ".bin"
if (Test-Path $binSource) {
    Copy-Item -Path $binSource -Destination $binDest -Recurse -Force
    $binCount = (Get-ChildItem -Path $binDest | Measure-Object).Count
    Write-Host "  Copied entire .bin directory ($binCount tools)" -ForegroundColor Gray
} else {
    Write-Host "  WARNING: .bin directory not found" -ForegroundColor Yellow
}

# Copy Prisma CLI package
$prismaPackageSource = "node_modules\prisma"
$prismaPackageDest = Join-Path $nodeModulesPath "prisma"
if (Test-Path $prismaPackageSource) {
    Copy-Item -Path $prismaPackageSource -Destination $prismaPackageDest -Recurse -Force
    Write-Host "  Copied Prisma CLI package" -ForegroundColor Gray
}

# Copy entire @prisma organization folder (complete Prisma ecosystem)
$prismaOrgSource = "node_modules\@prisma"
$prismaOrgDest = Join-Path $nodeModulesPath "@prisma"
if (Test-Path $prismaOrgSource) {
    Copy-Item -Path $prismaOrgSource -Destination $prismaOrgDest -Recurse -Force
    $prismaPackages = (Get-ChildItem -Path $prismaOrgDest -Directory | Measure-Object).Count
    Write-Host "  Copied complete @prisma folder structure ($prismaPackages packages)" -ForegroundColor Gray
}

# Copy .prisma generated client directory (CRITICAL for engines)
$prismaClientSource = "node_modules\.prisma"
$prismaClientDest = Join-Path $nodeModulesPath ".prisma"
if (Test-Path $prismaClientSource) {
    Copy-Item -Path $prismaClientSource -Destination $prismaClientDest -Recurse -Force
    Write-Host "  Copied .prisma generated client with engines" -ForegroundColor Gray
} else {
    Write-Host "  WARNING: .prisma client not found - generating..." -ForegroundColor Yellow
    & npx prisma generate
    if (Test-Path $prismaClientSource) {
        Copy-Item -Path $prismaClientSource -Destination $prismaClientDest -Recurse -Force
        Write-Host "  Generated and copied .prisma client" -ForegroundColor Gray
    }
}

# Copy database driver packages and their dependencies
$databasePackages = @(
    # PostgreSQL packages
    "pg", "pg-cloudflare", "pg-connection-string", "pg-int8", 
    "pg-pool", "pg-protocol", "pg-types", "pgpass",
    "postgres-array", "postgres-bytea", "postgres-date", "postgres-interval",
    # MySQL packages
    "mysql2",
    # Utility packages (common dependencies)
    "xtend", "extend",
    # Buffer and split utilities that database drivers often need
    "buffer", "safe-buffer", "split2", "sqlstring", "lru.min", "denque", "long", "iconv-lite", "safer-buffer", "generate-function", "is-property"
)
foreach ($packageName in $databasePackages) {
    $packageSource = "node_modules\$packageName"
    $packageDest = Join-Path $nodeModulesPath $packageName
    if (Test-Path $packageSource) {
        Copy-Item -Path $packageSource -Destination $packageDest -Recurse -Force
        Write-Host "  Copied $packageName database package" -ForegroundColor Gray
    } else {
        Write-Host "  WARNING: $packageName package not found" -ForegroundColor Yellow
    }
}

Write-Host "CLI tools and Prisma engines added successfully" -ForegroundColor Green

# Copy essential project files for database operations
if (Test-Path "prisma") {
    Copy-Item -Path "prisma" -Destination "$OutputPath/prisma" -Recurse -Force
    Write-Host "Copied prisma directory (schema and migrations)" -ForegroundColor Green
}

if (Test-Path "scripts") {
    Copy-Item -Path "scripts" -Destination "$OutputPath/scripts" -Recurse -Force
    $scriptCount = (Get-ChildItem -Path "scripts" -File | Measure-Object).Count
    Write-Host "Copied scripts directory ($scriptCount files)" -ForegroundColor Green
}

# Copy apply-update.bat (CRITICAL for system update mechanism)
if (Test-Path "apply-update.bat") {
    Copy-Item -Path "apply-update.bat" -Destination "$OutputPath/apply-update.bat" -Force
    Write-Host "Copied apply-update.bat (CRITICAL for system updates)" -ForegroundColor Green
} else {
    Write-Host "ERROR: apply-update.bat not found - system updates will fail!" -ForegroundColor Red
}

# Step 3: Create README for the update package
$readmeContent = @"
# P-Chart Web v$currentVersion Update Package

## What's Included
- server.js - Main application with latest improvements
- .next/* - Complete build directory (all build artifacts, manifests, chunks)
- package.json - Version $currentVersion
- public/* - Public assets
- node_modules/* - Essential CLI tools and Prisma engines (.bin, @prisma, .prisma, database drivers)
- prisma/* - Database schema and migrations
- scripts/* - Database and utility scripts
- apply-update.bat - System update applicator script (required for system updates)
- deploy-update.bat - Automated deployment script with Prisma client regeneration

## Installation
1. Copy this entire folder to your production server
2. Run: .\deploy-update.bat

## Manual Installation
If you prefer to update manually:
1. Stop application: .\stop.bat
2. Replace C:\p_chart_web\server.js with server.js
3. Replace C:\p_chart_web\.next with .next
4. Replace C:\p_chart_web\package.json with package.json
5. Replace C:\p_chart_web\public with public
6. Replace C:\p_chart_web\node_modules with node_modules
7. Replace C:\p_chart_web\prisma with prisma
8. Replace C:\p_chart_web\scripts with scripts
9. Copy apply-update.bat to C:\p_chart_web\apply-update.bat
10. Regenerate Prisma client: npx prisma generate
11. Start application: .\start.bat

## Size Comparison
This update package: ~50-100MB (includes Prisma engines)
Full deployment bundle: ~500MB+
Space saved: ~80-90%

## Rollback
If you need to rollback:
1. Stop application: .\stop.bat
2. Restore server.js.backup to server.js
3. Start application: .\start.bat
"@

$readmeContent | Out-File -FilePath "$OutputPath/README.md" -Encoding UTF8
Write-Host "Created README.md" -ForegroundColor Green

# Step 4: Create deploy-update.bat script
Write-Host "Creating deploy-update.bat script..." -ForegroundColor White
$deployUpdateScript = @"
@echo off
echo P-Chart Web v$currentVersion Update Deployment
echo =============================================

REM Change to production directory
cd /d "C:\p_chart_web"

echo Step 1: Stopping application...
call ".\stop.bat"

echo Waiting 3 seconds for clean shutdown...
timeout /t 3 /nobreak >nul

echo Step 2: Creating backup of current server.js...
if exist "server.js" (
    copy "server.js" "server.js.backup" >nul
    echo Backup created: server.js.backup
) else (
    echo WARNING: No existing server.js found to backup
)

echo Step 3: Updating application files...

REM Get the directory where this script is located
set "UPDATE_DIR=%~dp0"

REM Replace server.js
if exist "%UPDATE_DIR%server.js" (
    copy "%UPDATE_DIR%server.js" "server.js" >nul
    echo Updated: server.js
) else (
    echo ERROR: server.js not found in update package!
    goto :error
)

REM Replace .next directory
if exist "%UPDATE_DIR%.next" (
    if exist ".next" rmdir /s /q ".next"
    xcopy "%UPDATE_DIR%.next" ".next" /e /i /y >nul
    echo Updated: .next directory
) else (
    echo ERROR: .next directory not found in update package!
    goto :error
)

REM Replace package.json
if exist "%UPDATE_DIR%package.json" (
    copy "%UPDATE_DIR%package.json" "package.json" >nul
    echo Updated: package.json
) else (
    echo WARNING: package.json not found in update package
)

REM Replace public directory
if exist "%UPDATE_DIR%public" (
    if exist "public" rmdir /s /q "public"
    xcopy "%UPDATE_DIR%public" "public" /e /i /y >nul
    echo Updated: public directory
) else (
    echo WARNING: public directory not found in update package
)

REM Update node_modules with Prisma engines and CLI tools
if exist "%UPDATE_DIR%node_modules" (
    echo Updating node_modules with Prisma engines and CLI tools...
    if exist "node_modules" rmdir /s /q "node_modules"
    xcopy "%UPDATE_DIR%node_modules" "node_modules" /e /i /y >nul
    echo Updated: node_modules (Prisma engines and CLI tools)
) else (
    echo WARNING: node_modules not found in update package
)

REM Update prisma directory
if exist "%UPDATE_DIR%prisma" (
    if exist "prisma" rmdir /s /q "prisma"
    xcopy "%UPDATE_DIR%prisma" "prisma" /e /i /y >nul
    echo Updated: prisma directory
) else (
    echo WARNING: prisma directory not found in update package
)

REM Update scripts directory
if exist "%UPDATE_DIR%scripts" (
    if exist "scripts" rmdir /s /q "scripts"
    xcopy "%UPDATE_DIR%scripts" "scripts" /e /i /y >nul
    echo Updated: scripts directory
) else (
    echo WARNING: scripts directory not found in update package
)

echo Step 4: Regenerating Prisma client...
if exist "node_modules\.bin\prisma.cmd" (
    call "node_modules\.bin\prisma.cmd" generate
    if %errorlevel% equ 0 (
        echo Prisma client regenerated successfully
    ) else (
        echo Warning: Prisma client regeneration failed, but continuing...
    )
) else (
    echo Warning: Prisma CLI not found, using existing client
)

echo Step 5: Starting application...
call ".\start.bat"

echo.
echo =============================================
echo Update to v$currentVersion completed successfully!
echo Application should be running at: http://localhost:3000
echo =============================================
goto :end

:error
echo.
echo =============================================
echo ERROR: Update failed!
echo.
echo To rollback:
echo 1. Stop application: .\stop.bat
echo 2. Restore backup: copy server.js.backup server.js
echo 3. Start application: .\start.bat
echo =============================================
pause
exit /b 1

:end
pause
"@

$deployUpdatePath = Join-Path $OutputPath "deploy-update.bat"
$deployUpdateScript | Out-File -FilePath $deployUpdatePath -Encoding UTF8
Write-Host "Created deploy-update.bat" -ForegroundColor Green

# Calculate package size
$packageSize = (Get-ChildItem -Path $OutputPath -Recurse | Measure-Object -Property Length -Sum).Sum
$packageSizeMB = [math]::Round($packageSize / 1MB, 2)

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "MINIMAL UPDATE PACKAGE CREATED!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Package Details:" -ForegroundColor Cyan
Write-Host "  Location: $OutputPath" -ForegroundColor White
Write-Host "  Size: $packageSizeMB MB (vs ~500MB+ for full bundle)" -ForegroundColor White
Write-Host "  Version: $currentVersion" -ForegroundColor White
Write-Host "  Files: $((Get-ChildItem -Path $OutputPath -Recurse | Measure-Object).Count)" -ForegroundColor White
Write-Host ""
Write-Host "Files included:" -ForegroundColor Yellow
Write-Host "  - server.js (compiled application with all v$currentVersion fixes)" -ForegroundColor White
Write-Host "  - .next/* (complete build directory with all artifacts)" -ForegroundColor White
Write-Host "  - package.json (version update)" -ForegroundColor White
Write-Host "  - public/* (public assets)" -ForegroundColor White
Write-Host "  - node_modules/* (essential CLI tools and Prisma engines)" -ForegroundColor White
Write-Host "  - prisma/* (database schema and migrations)" -ForegroundColor White
Write-Host "  - scripts/* (database and utility scripts)" -ForegroundColor White
Write-Host "  - apply-update.bat (system update applicator - CRITICAL)" -ForegroundColor White
Write-Host "  - README.md (installation guide)" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Create deployment script: .\deployment\create-deploy-update.ps1" -ForegroundColor White
Write-Host "2. Copy update package to production server" -ForegroundColor White
Write-Host "3. Run deploy-update.ps1 on production server" -ForegroundColor White
Write-Host ""
Write-Host "Version $currentVersion update created successfully!" -ForegroundColor Cyan
Write-Host ""
$spaceSaved = [math]::Round(((500 - $packageSizeMB) / 500) * 100, 1)
Write-Host "Space saved: ~$spaceSaved% vs full deployment bundle!" -ForegroundColor Green
Write-Host "Now includes complete Prisma engine support for reliable system updates!" -ForegroundColor Green 