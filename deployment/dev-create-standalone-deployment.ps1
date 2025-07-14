param(
    [string]$dir = "C:\dev\p_chart_web_release",
    [switch]$SkipBuild = $false
)

$ProductionPath = $dir

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  P-Chart Web - TRUE STANDALONE Deployment" -ForegroundColor Yellow
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "Deploying to: $ProductionPath" -ForegroundColor Cyan

# Check if we're in the correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found. Please run this script from the project root directory." -ForegroundColor Red
    exit 1
}

# SAFETY CHECK: Prevent deploying to source/development directory
$currentDir = Get-Location
$currentDirPath = $currentDir.Path
$targetDirPath = (Resolve-Path $ProductionPath -ErrorAction SilentlyContinue).Path

# Check if target is the same as current directory
if ($targetDirPath -eq $currentDirPath) {
    Write-Host "======================================================" -ForegroundColor Red
    Write-Host "CRITICAL ERROR: DEPLOYMENT TARGET IS SOURCE DIRECTORY!" -ForegroundColor Red
    Write-Host "======================================================" -ForegroundColor Red
    Write-Host "Target: $ProductionPath" -ForegroundColor Red
    Write-Host "Current: $currentDirPath" -ForegroundColor Red
    Write-Host "" -ForegroundColor Red
    Write-Host "This would DELETE your development code!" -ForegroundColor Red
    Write-Host "Please use a different target directory." -ForegroundColor Red
    Write-Host "" -ForegroundColor Red
    Write-Host "Example: .\deployment\dev-create-standalone-deployment.ps1 -dir C:\dev\p_chart_web_release" -ForegroundColor Yellow
    exit 1
}

# Additional safety check for common development directory patterns
$devPatterns = @("*\p_chart_web", "*\p_chart_web\")
foreach ($pattern in $devPatterns) {
    if ($ProductionPath -like $pattern -and (Test-Path (Join-Path $ProductionPath "src"))) {
        Write-Host "======================================================" -ForegroundColor Red
        Write-Host "SAFETY WARNING: Target appears to be a development directory!" -ForegroundColor Red
        Write-Host "======================================================" -ForegroundColor Red
        Write-Host "Target: $ProductionPath" -ForegroundColor Red
        Write-Host "This directory contains 'src' folder, suggesting it's a development environment." -ForegroundColor Red
        Write-Host "Deployment would DELETE existing code!" -ForegroundColor Red
        Write-Host "" -ForegroundColor Red
        Write-Host "Please use a different target directory like:" -ForegroundColor Yellow
        Write-Host "  C:\dev\p_chart_web_release" -ForegroundColor Yellow
        Write-Host "  C:\deploy\p_chart_web" -ForegroundColor Yellow
        Write-Host "  C:\production\p_chart_web" -ForegroundColor Yellow
        exit 1
    }
}

# Step 1: Build Application (if not skipped)
if (-not $SkipBuild) {
    Write-Host "Building standalone application..." -ForegroundColor Cyan
    
    # Build the application
    Write-Host "Running build..." -ForegroundColor White
    & npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Build failed" -ForegroundColor Red
        exit 1
    }
    
    # Verify standalone output
    if (-not (Test-Path ".next\standalone")) {
        Write-Host "ERROR: Standalone build not found!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Build completed successfully" -ForegroundColor Green
}

# Step 2: Clean and Prepare Production Directory
if (Test-Path $ProductionPath) {
    Write-Host "Cleaning production directory..." -ForegroundColor Yellow
    
    # Preserve critical files
    $preserveFiles = @(".git", ".env", ".gitignore")
    Get-ChildItem -Path $ProductionPath -Force | Where-Object { 
        $_.Name -notin $preserveFiles 
    } | ForEach-Object {
        Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
}

New-Item -Path $ProductionPath -ItemType Directory -Force | Out-Null

# Step 3: Deploy Standalone Application
Write-Host "Deploying standalone application..." -ForegroundColor Cyan

# Copy standalone files
$standaloneSource = ".next\standalone"
Copy-Item -Path "$standaloneSource\*" -Destination $ProductionPath -Recurse -Force
Write-Host "Standalone runtime deployed" -ForegroundColor Green

# Copy static assets
$staticSource = ".next\static"
$staticDest = Join-Path $ProductionPath ".next\static"
if (Test-Path $staticSource) {
    $nextDir = Join-Path $ProductionPath ".next"
    if (-not (Test-Path $nextDir)) {
        New-Item -Path $nextDir -ItemType Directory -Force | Out-Null
    }
    Copy-Item -Path $staticSource -Destination $staticDest -Recurse -Force
    Write-Host "Static assets deployed" -ForegroundColor Green
}

# Copy public assets
if (Test-Path "public") {
    Copy-Item -Path "public" -Destination (Join-Path $ProductionPath "public") -Recurse -Force
    Write-Host "Public assets deployed" -ForegroundColor Green
}

# Step 4: Add Essential CLI Tools
Write-Host "Adding essential CLI tools..." -ForegroundColor Cyan

# Copy entire .bin directory (includes all CLI tools)
$binSource = "node_modules\.bin"
$binDest = Join-Path $ProductionPath "node_modules\.bin"
if (Test-Path $binSource) {
    Copy-Item -Path $binSource -Destination $binDest -Recurse -Force
    $binCount = (Get-ChildItem -Path $binDest | Measure-Object).Count
    Write-Host "  Copied entire .bin directory ($binCount tools)" -ForegroundColor Gray
} else {
    Write-Host "  WARNING: .bin directory not found" -ForegroundColor Yellow
}

# Copy Prisma CLI package
$prismaPackageSource = "node_modules\prisma"
$prismaPackageDest = Join-Path $ProductionPath "node_modules\prisma"
if (Test-Path $prismaPackageSource) {
    Copy-Item -Path $prismaPackageSource -Destination $prismaPackageDest -Recurse -Force
    Write-Host "  Copied Prisma CLI package" -ForegroundColor Gray
}

# Copy entire @prisma organization folder (complete Prisma ecosystem)
$prismaOrgSource = "node_modules\@prisma"
$prismaOrgDest = Join-Path $ProductionPath "node_modules\@prisma"
if (Test-Path $prismaOrgSource) {
    # Ensure parent directory exists
    $prismaParentDir = Split-Path $prismaOrgDest -Parent
    if (-not (Test-Path $prismaParentDir)) {
        New-Item -ItemType Directory -Path $prismaParentDir -Force | Out-Null
    }
    
    # Copy entire @prisma folder structure recursively
    Copy-Item -Path $prismaOrgSource -Destination $prismaParentDir -Recurse -Force
    $prismaPackages = (Get-ChildItem -Path $prismaOrgDest -Directory | Measure-Object).Count
    Write-Host "  Copied complete @prisma folder structure ($prismaPackages packages)" -ForegroundColor Gray
}

# Copy .prisma generated client directory (CRITICAL for engines)
$prismaClientSource = "node_modules\.prisma"
$prismaClientDest = Join-Path $ProductionPath "node_modules\.prisma"
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

# Copy database driver packages and their dependencies (needed for database scripts)
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
    $packageParentDest = Join-Path $ProductionPath "node_modules"
    if (Test-Path $packageSource) {
        # Ensure the node_modules directory exists
        if (-not (Test-Path $packageParentDest)) {
            New-Item -ItemType Directory -Path $packageParentDest -Force | Out-Null
        }
        # Copy to parent directory so PowerShell creates the correct structure
        Copy-Item -Path $packageSource -Destination $packageParentDest -Recurse -Force
        Write-Host "  Copied $packageName database package" -ForegroundColor Gray
    } else {
        Write-Host "  WARNING: $packageName package not found" -ForegroundColor Yellow
    }
}

# Note: Individual @prisma packages are now included in the complete folder copy above

Write-Host "CLI tools and engines added successfully" -ForegroundColor Green

# Step 5: Copy Essential Files
Write-Host "Copying essential files..." -ForegroundColor Cyan

# Copy prisma directory
if (Test-Path "prisma") {
    Copy-Item -Path "prisma" -Destination (Join-Path $ProductionPath "prisma") -Recurse -Force
    Write-Host "Copied prisma" -ForegroundColor Green
}

# Copy package.json
if (Test-Path "package.json") {
    Copy-Item -Path "package.json" -Destination (Join-Path $ProductionPath "package.json") -Force
    Write-Host "Copied package.json" -ForegroundColor Green
}

# Copy scripts directory
if (Test-Path "scripts") {
    Copy-Item -Path "scripts" -Destination (Join-Path $ProductionPath "scripts") -Recurse -Force
    $scriptCount = (Get-ChildItem -Path "scripts" -File | Measure-Object).Count
    Write-Host "Copied scripts directory ($scriptCount files)" -ForegroundColor Green
}

# Copy deployment directory (excluding create-*.ps1 files)
if (Test-Path "deployment") {
    $deploymentDest = Join-Path $ProductionPath "deployment"
    New-Item -Path $deploymentDest -ItemType Directory -Force | Out-Null
    
    # Copy all files except create-*.ps1
    Get-ChildItem -Path "deployment" -File | Where-Object { 
        $_.Name -notlike "create-*.ps1" 
    } | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination (Join-Path $deploymentDest $_.Name) -Force
    }
    
    $copiedCount = (Get-ChildItem -Path $deploymentDest -File | Measure-Object).Count
    Write-Host "Copied deployment directory ($copiedCount files, excluding create-*.ps1)" -ForegroundColor Green
}

# Step 6: Convert .gitignore-release to .gitignore
Write-Host "Converting .gitignore-release to .gitignore..." -ForegroundColor Cyan

if (Test-Path ".gitignore-release") {
    $gitignoreContent = Get-Content ".gitignore-release" -Raw
    $gitignoreDest = Join-Path $ProductionPath ".gitignore"
    Set-Content -Path $gitignoreDest -Value $gitignoreContent -NoNewline
    Write-Host "Converted .gitignore-release to .gitignore for release repository" -ForegroundColor Green
} else {
    Write-Host "Warning: .gitignore-release not found - using default .gitignore" -ForegroundColor Yellow
    
    # Create basic .gitignore for release (includes node_modules by default)
    $defaultGitignore = @"
# Environment files (sensitive data)
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env*.local

# Logs
logs/
*.log

# Production data (sensitive)
/data/
production-data*.sql

# Database files
*.db
*.sqlite
*.sqlite3

# Temporary files
tmp/
temp/
*.tmp
*.temp

# Cache directories
.cache

# Deployment artifacts
*.msi
*.exe
update-logs/
.ssh/
"@
    
    $gitignoreDest = Join-Path $ProductionPath ".gitignore"
    Set-Content -Path $gitignoreDest -Value $defaultGitignore -NoNewline
    Write-Host "Created default .gitignore for release repository" -ForegroundColor Green
}

# Step 7: Create Production Scripts
Write-Host "Creating production scripts..." -ForegroundColor Cyan

# Create optimized start.bat with full Prisma engines support
$startBat = Join-Path $ProductionPath "start.bat"
$startContent = @"
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
"@
$startContent | Out-File -FilePath $startBat -Encoding ASCII

# Create restart.bat
$restartBat = Join-Path $ProductionPath "restart.bat"
$restartContent = @"
@echo off
echo Restarting P-Chart Web Application...
cd /d "%~dp0"
call ".\stop.bat"
timeout /t 3 /nobreak >nul
call ".\start.bat"
"@
$restartContent | Out-File -FilePath $restartBat -Encoding ASCII

# Create stop.bat
$stopBat = Join-Path $ProductionPath "stop.bat"
$stopContent = @"
@echo off
echo Stopping P-Chart Web Application...
cd /d "%~dp0"
taskkill /f /im node.exe >nul 2>&1
echo Application stopped
"@
$stopContent | Out-File -FilePath $stopBat -Encoding ASCII

Write-Host "Production scripts created" -ForegroundColor Green

# Step 7: Final Check
Write-Host "Verifying deployment..." -ForegroundColor Cyan

if (Test-Path "$ProductionPath\server.js") {
    Write-Host "server.js found" -ForegroundColor Green
} else {
    Write-Host "server.js MISSING" -ForegroundColor Red
}

if (Test-Path "$ProductionPath\node_modules") {
    $packageCount = (Get-ChildItem -Path "$ProductionPath\node_modules" -Directory | Measure-Object).Count
    Write-Host "node_modules: $packageCount packages" -ForegroundColor Green
} else {
    Write-Host "node_modules MISSING" -ForegroundColor Red
}

# Verify Prisma engines specifically
Write-Host "Verifying Prisma engines..." -ForegroundColor Cyan

# Check core Prisma components
if (Test-Path "$ProductionPath\node_modules\.prisma") {
    Write-Host "  .prisma client: found" -ForegroundColor Green
} else {
    Write-Host "  .prisma client: MISSING" -ForegroundColor Yellow
}

if (Test-Path "$ProductionPath\node_modules\@prisma") {
    $prismaPackages = (Get-ChildItem -Path "$ProductionPath\node_modules\@prisma" -Directory | Measure-Object).Count
    Write-Host "  @prisma organization: found ($prismaPackages packages)" -ForegroundColor Green
} else {
    Write-Host "  @prisma organization: MISSING" -ForegroundColor Yellow
}

if (Test-Path "$ProductionPath\node_modules\prisma") {
    Write-Host "  prisma CLI: found" -ForegroundColor Green
} else {
    Write-Host "  prisma CLI: MISSING" -ForegroundColor Yellow
}

# Verify database driver packages
Write-Host "Verifying database drivers..." -ForegroundColor Cyan
$databaseDrivers = @("pg", "mysql2")
foreach ($driver in $databaseDrivers) {
    if (Test-Path "$ProductionPath\node_modules\$driver") {
        Write-Host "  $driver driver: found" -ForegroundColor Green
    } else {
        Write-Host "  $driver driver: MISSING" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "STANDALONE DEPLOYMENT COMPLETED!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "To run: cd `"$ProductionPath`"; .\restart.bat" -ForegroundColor Yellow 