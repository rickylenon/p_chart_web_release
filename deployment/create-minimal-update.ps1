# P-Chart Web - Minimal Update Package Creator
# This script creates a minimal update package by reading version from package.json

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
    $OutputPath = "C:\p_chart_web_update_v$currentVersion"
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
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed" -ForegroundColor Red
    exit 1
}

# Verify build output
if (-not (Test-Path ".next/standalone/server.js")) {
    Write-Host "ERROR: Standalone server.js not found. Build may have failed." -ForegroundColor Red
    Write-Host "Make sure output: 'standalone' is configured in next.config.js" -ForegroundColor Yellow
    exit 1
}

Write-Host "Build completed successfully" -ForegroundColor Green

# Step 2: Copy Essential Files Only
Write-Host "Copying essential files for v2.0.1 update..." -ForegroundColor Cyan

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

# Step 3: Create README for the update package
$readmeContent = @"
# P-Chart Web v$currentVersion Update Package

## What's Included
- server.js - Main application with latest improvements
- .next/* - Complete build directory (all build artifacts, manifests, chunks)
- package.json - Version $currentVersion
- public/* - Public assets
- deploy-update.ps1 - Automated deployment script

## Installation
1. Copy this entire folder to your production server
2. Run: .\deploy-update.ps1

## Manual Installation
If you prefer to update manually:
1. Stop service: .\service-manager.ps1 stop
2. Replace C:\p_chart_web\server.js with server.js
3. Replace C:\p_chart_web\.next with .next
4. Replace C:\p_chart_web\package.json with package.json
5. Replace C:\p_chart_web\public with public
6. Start service: .\service-manager.ps1 start

## Size Comparison
This update package: ~10-30MB
Full deployment bundle: ~500MB+
Space saved: ~95%

## Rollback
If you need to rollback:
1. Stop service: .\service-manager.ps1 stop
2. Restore server.js.backup to server.js
3. Start service: .\service-manager.ps1 start
"@

$readmeContent | Out-File -FilePath "$OutputPath/README.md" -Encoding UTF8
Write-Host "Created README.md" -ForegroundColor Green

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