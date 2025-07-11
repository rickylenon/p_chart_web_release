# P-Chart Web - Git-Based Deploy Update Script Creator
# This script creates deployment update scripts for the git-versioned C:\p_chart_web repository

param(
    [string]$Version = "",
    [string]$GitTag = "",
    [string]$GitBranch = "main"
)

# Check if we're in the correct directory to read version
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found. Please run this script from the project root directory." -ForegroundColor Red
    exit 1
}

# Read version from package.json
try {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $currentVersion = $packageJson.version
    if ([string]::IsNullOrEmpty($Version)) {
        $Version = $currentVersion
    }
    Write-Host "Package version: $currentVersion" -ForegroundColor Green
    Write-Host "Deploy version: $Version" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Could not read version from package.json" -ForegroundColor Red
    exit 1
}

# Set git tag if not provided
if ([string]::IsNullOrEmpty($GitTag)) {
    $GitTag = "v$Version"
}

$ProductionPath = "C:\p_chart_web"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  P-Chart Web - Git-Based Deploy Update Script Creator" -ForegroundColor Yellow
Write-Host "  Version $Version" -ForegroundColor Yellow
Write-Host "======================================================" -ForegroundColor Cyan

# Check if production git repository exists
if (-not (Test-Path $ProductionPath)) {
    Write-Host "ERROR: Production directory not found at: $ProductionPath" -ForegroundColor Red
    Write-Host "Please run create-deployment-bundle.ps1 first to initialize the git repository" -ForegroundColor Yellow
    exit 1
}

$gitDir = Join-Path $ProductionPath ".git"
if (-not (Test-Path $gitDir)) {
    Write-Host "ERROR: $ProductionPath is not a git repository!" -ForegroundColor Red
    Write-Host "Please run create-deployment-bundle.ps1 first to initialize the git repository" -ForegroundColor Yellow
    exit 1
}

# Create the git-based deploy-update.ps1 content
$deployUpdateScript = @"
# P-Chart Web v$Version Git-Based Update Deployment Script
# Run this script in the production git repository to apply updates

param(
    [string]`$GitTag = "$GitTag",
    [string]`$GitBranch = "$GitBranch",
    [switch]`$Force = `$false,
    [switch]`$SkipBuild = `$false
)

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  P-Chart Web v$Version Git-Based Update Deployment" -ForegroundColor Yellow
Write-Host "======================================================" -ForegroundColor Cyan

# Verify we're in the right location (git repository)
if (-not (Test-Path ".git")) {
    Write-Host "ERROR: This is not a git repository!" -ForegroundColor Red
    Write-Host "Please run this script from the C:\p_chart_web directory" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path "server.js")) {
    Write-Host "ERROR: server.js not found in current directory" -ForegroundColor Red
    Write-Host "Please run this script from the production directory" -ForegroundColor Yellow
    exit 1
}

# Check current version
if (Test-Path "package.json") {
    try {
        `$currentVersionInstalled = (Get-Content "package.json" | ConvertFrom-Json).version
        Write-Host "Current version: `$currentVersionInstalled" -ForegroundColor White
        Write-Host "Target version: $Version" -ForegroundColor White
        
        if (`$currentVersionInstalled -eq "$Version" -and -not `$Force) {
            Write-Host "WARNING: Version $Version may already be installed!" -ForegroundColor Yellow
            Write-Host "Use -Force to reinstall, or press Ctrl+C to cancel" -ForegroundColor Yellow
            Write-Host "Continue anyway? (y/n): " -ForegroundColor Yellow -NoNewline
            `$response = Read-Host
            if (`$response -ne "y" -and `$response -ne "Y") {
                Write-Host "Update cancelled by user" -ForegroundColor Yellow
                exit 0
            }
        }
    } catch {
        Write-Host "WARNING: Could not read current version" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Applying P-Chart Web v$Version git-based update..." -ForegroundColor Cyan

# Step 1: Stop the service
Write-Host "Step 1: Stopping service..." -ForegroundColor Yellow
try {
    & ".\service-manager.ps1" stop
    if (`$LASTEXITCODE -eq 0) {
        Write-Host "Service stopped successfully" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Service stop may have failed (exit code: `$LASTEXITCODE)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERROR: Could not stop service: `$(`$_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please stop the service manually and try again" -ForegroundColor Yellow
    exit 1
}

# Step 2: Create backups of ignored files
Write-Host "Step 2: Creating backups of important files..." -ForegroundColor Yellow
`$backupSuffix = Get-Date -Format "yyyyMMdd_HHmmss"

# Backup .env file
if (Test-Path ".env") {
    Copy-Item -Path ".env" -Destination ".env.backup_`$backupSuffix" -Force
    Write-Host "Backed up .env file" -ForegroundColor Green
}

# Backup data directory
if (Test-Path "data") {
    Copy-Item -Path "data" -Destination "data.backup_`$backupSuffix" -Recurse -Force
    Write-Host "Backed up data directory" -ForegroundColor Green
}

# Backup logs directory
if (Test-Path "logs") {
    Copy-Item -Path "logs" -Destination "logs.backup_`$backupSuffix" -Recurse -Force
    Write-Host "Backed up logs directory" -ForegroundColor Green
}

# Step 3: Check git status and stash changes
Write-Host "Step 3: Preparing git repository..." -ForegroundColor Yellow

# Check if there are uncommitted changes
`$gitStatus = & git status --porcelain
if (`$gitStatus) {
    Write-Host "Found uncommitted changes:" -ForegroundColor Yellow
    Write-Host `$gitStatus -ForegroundColor Gray
    
    # Stash changes to ignored files that we want to preserve
    Write-Host "Stashing changes..." -ForegroundColor White
    & git stash push -m "Pre-update stash `$backupSuffix"
    if (`$LASTEXITCODE -eq 0) {
        Write-Host "Changes stashed successfully" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Git stash may have failed" -ForegroundColor Yellow
    }
}

# Step 4: Fetch and checkout the update
Write-Host "Step 4: Fetching and applying git update..." -ForegroundColor Yellow

# Fetch latest changes
Write-Host "Fetching latest changes..." -ForegroundColor White
& git fetch origin
if (`$LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Git fetch failed!" -ForegroundColor Red
    Write-Host "Please check network connection and git remote configuration" -ForegroundColor Yellow
    exit 1
}

# Checkout the specified tag or branch
if (`$GitTag -and `$GitTag -ne "") {
    Write-Host "Checking out tag: `$GitTag" -ForegroundColor White
    & git checkout `$GitTag
    if (`$LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Could not checkout tag `$GitTag" -ForegroundColor Red
        Write-Host "Available tags:" -ForegroundColor Yellow
        & git tag --list
        exit 1
    }
} elseif (`$GitBranch -and `$GitBranch -ne "") {
    Write-Host "Checking out branch: `$GitBranch" -ForegroundColor White
    & git checkout `$GitBranch
    if (`$LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Could not checkout branch `$GitBranch" -ForegroundColor Red
        exit 1
    }
    
    # Pull latest changes for branch
    Write-Host "Pulling latest changes for branch: `$GitBranch" -ForegroundColor White
    & git pull origin `$GitBranch
    if (`$LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Git pull failed!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "ERROR: No valid git tag or branch specified" -ForegroundColor Red
    exit 1
}

Write-Host "Git update completed successfully" -ForegroundColor Green

# Step 5: Restore ignored files
Write-Host "Step 5: Restoring non-git files..." -ForegroundColor Yellow

# Restore .env file
if (Test-Path ".env.backup_`$backupSuffix") {
    Copy-Item -Path ".env.backup_`$backupSuffix" -Destination ".env" -Force
    Write-Host "Restored .env file" -ForegroundColor Green
}

# Restore data directory
if (Test-Path "data.backup_`$backupSuffix") {
    if (Test-Path "data") {
        Remove-Item -Path "data" -Recurse -Force
    }
    Copy-Item -Path "data.backup_`$backupSuffix" -Destination "data" -Recurse -Force
    Write-Host "Restored data directory" -ForegroundColor Green
}

# Restore logs directory
if (Test-Path "logs.backup_`$backupSuffix") {
    if (Test-Path "logs") {
        Remove-Item -Path "logs" -Recurse -Force
    }
    Copy-Item -Path "logs.backup_`$backupSuffix" -Destination "logs" -Recurse -Force
    Write-Host "Restored logs directory" -ForegroundColor Green
}

# Step 6: Update dependencies and rebuild
Write-Host "Step 6: Updating dependencies and rebuilding..." -ForegroundColor Yellow

if (-not `$SkipBuild) {
    # Install/update dependencies
    Write-Host "Installing/updating dependencies..." -ForegroundColor White
    if (Get-Command "pnpm" -ErrorAction SilentlyContinue) {
        & pnpm install
    } else {
        & npm install
    }
    
    if (`$LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Dependency installation failed!" -ForegroundColor Red
        exit 1
    }
    
    # Build the application
    Write-Host "Building application..." -ForegroundColor White
    if (Get-Command "pnpm" -ErrorAction SilentlyContinue) {
        & pnpm run build
    } else {
        & npm run build
    }
    
    if (`$LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Build failed!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Build completed successfully" -ForegroundColor Green
} else {
    Write-Host "Skipping build as requested" -ForegroundColor Yellow
}

# Step 7: Start the service
Write-Host "Step 7: Starting service..." -ForegroundColor Yellow
try {
    & ".\service-manager.ps1" start
    if (`$LASTEXITCODE -eq 0) {
        Write-Host "Service started successfully" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Service start may have failed (exit code: `$LASTEXITCODE)" -ForegroundColor Yellow
        Write-Host "Please check service status manually" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERROR: Could not start service: `$(`$_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please start the service manually: .\service-manager.ps1 start" -ForegroundColor Yellow
}

# Step 8: Verify update
Write-Host "Step 8: Verifying update..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

try {
    & ".\service-manager.ps1" status
    Write-Host "Service status check completed" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Could not check service status" -ForegroundColor Yellow
}

# Show current version
if (Test-Path "package.json") {
    try {
        `$newVersion = (Get-Content "package.json" | ConvertFrom-Json).version
        Write-Host "New version installed: `$newVersion" -ForegroundColor Green
    } catch {
        Write-Host "Could not read new version" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "GIT-BASED UPDATE COMPLETED!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Update Summary:" -ForegroundColor Cyan
Write-Host "  - Git checkout: `$GitTag" -ForegroundColor Green
Write-Host "  - Version $Version applied successfully" -ForegroundColor Green
Write-Host ""
Write-Host "Backups created:" -ForegroundColor Yellow
Write-Host "  - .env.backup_`$backupSuffix" -ForegroundColor White
Write-Host "  - data.backup_`$backupSuffix" -ForegroundColor White
Write-Host "  - logs.backup_`$backupSuffix" -ForegroundColor White
Write-Host ""
Write-Host "Application URL: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "If you encounter any issues:" -ForegroundColor Yellow
Write-Host "1. Check service status: .\service-manager.ps1 status" -ForegroundColor White
Write-Host "2. Check logs: Get-Content logs\service.log -Tail 50" -ForegroundColor White
Write-Host "3. Rollback if needed:" -ForegroundColor White
Write-Host "   - Stop service: .\service-manager.ps1 stop" -ForegroundColor White
Write-Host "   - Checkout previous version: git checkout [previous-tag]" -ForegroundColor White
Write-Host "   - Start service: .\service-manager.ps1 start" -ForegroundColor White
Write-Host ""
Write-Host "Git-based update deployment completed successfully!" -ForegroundColor Green
"@

# Save the deploy-update.ps1 script to the production repository
$deployScriptPath = "$ProductionPath\deploy-update.ps1"
$deployUpdateScript | Out-File -FilePath $deployScriptPath -Encoding UTF8

Write-Host "Created deploy-update.ps1 script at:" -ForegroundColor Green
Write-Host "  $deployScriptPath" -ForegroundColor White

# Create a quick update script for convenience
$quickUpdateScript = @"
# Quick Update Script - Updates to latest main branch
# This is a convenience script for quick updates during development

Write-Host "Quick Update - Latest Main Branch" -ForegroundColor Cyan
& ".\deploy-update.ps1" -GitBranch "main" -SkipBuild
"@

$quickUpdateScriptPath = "$ProductionPath\quick-update.ps1"
$quickUpdateScript | Out-File -FilePath $quickUpdateScriptPath -Encoding UTF8

Write-Host "Created quick-update.ps1 script at:" -ForegroundColor Green
Write-Host "  $quickUpdateScriptPath" -ForegroundColor White

# Create a rollback script
$rollbackScript = @"
# Rollback Script - Rollback to previous version
# This script helps rollback to a previous git tag/commit

param(
    [string]`$PreviousTag = "",
    [string]`$PreviousCommit = ""
)

Write-Host "P-Chart Web Rollback Script" -ForegroundColor Cyan

if (-not `$PreviousTag -and -not `$PreviousCommit) {
    Write-Host "Available tags:" -ForegroundColor Yellow
    & git tag --list --sort=-version:refname | Select-Object -First 10
    Write-Host ""
    Write-Host "Recent commits:" -ForegroundColor Yellow
    & git log --oneline -10
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Cyan
    Write-Host "  .\rollback.ps1 -PreviousTag v1.0.0" -ForegroundColor White
    Write-Host "  .\rollback.ps1 -PreviousCommit abc123" -ForegroundColor White
    exit 0
}

if (`$PreviousTag) {
    Write-Host "Rolling back to tag: `$PreviousTag" -ForegroundColor Yellow
    & ".\deploy-update.ps1" -GitTag `$PreviousTag
} elseif (`$PreviousCommit) {
    Write-Host "Rolling back to commit: `$PreviousCommit" -ForegroundColor Yellow
    & ".\service-manager.ps1" stop
    & git checkout `$PreviousCommit
    & ".\service-manager.ps1" start
}
"@

$rollbackScriptPath = "$ProductionPath\rollback.ps1"
$rollbackScript | Out-File -FilePath $rollbackScriptPath -Encoding UTF8

Write-Host "Created rollback.ps1 script at:" -ForegroundColor Green
Write-Host "  $rollbackScriptPath" -ForegroundColor White

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "GIT-BASED DEPLOYMENT SCRIPTS CREATED!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "The deployment scripts include:" -ForegroundColor Cyan
Write-Host "  ✓ Git-based update deployment" -ForegroundColor Green
Write-Host "  ✓ Automatic backup/restore of ignored files" -ForegroundColor Green
Write-Host "  ✓ Service stop/start automation" -ForegroundColor Green
Write-Host "  ✓ Dependency and build management" -ForegroundColor Green
Write-Host "  ✓ Version verification and rollback support" -ForegroundColor Green
Write-Host ""
Write-Host "Usage on production server:" -ForegroundColor Yellow
Write-Host "  .\deploy-update.ps1 -GitTag v1.0.0    # Deploy specific version" -ForegroundColor White
Write-Host "  .\deploy-update.ps1 -GitBranch main   # Deploy latest main branch" -ForegroundColor White
Write-Host "  .\quick-update.ps1                    # Quick update to latest main" -ForegroundColor White
Write-Host "  .\rollback.ps1 -PreviousTag v0.9.0    # Rollback to previous version" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Tag your release: git tag v$Version" -ForegroundColor White
Write-Host "2. Push to production repo: git push origin main --tags" -ForegroundColor White
Write-Host "3. Run update on production: .\deploy-update.ps1 -GitTag v$Version" -ForegroundColor White
Write-Host ""
Write-Host "Git-based deployment scripts created successfully!" -ForegroundColor Green 