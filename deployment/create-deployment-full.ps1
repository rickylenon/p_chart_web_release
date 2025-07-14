# P-Chart Web Application - Deployment Bundle Creator
#
# Deployment Workflow:
# 1. Development:
#    - Make changes in development environment
#    - Test changes locally
#
# 2. Create Release Build:
#    - Run: .\deployment\create-deployment-full.ps1
#    - This creates a production build in C:\dev\p_chart_web_release by default
#    - Push changes from dev/p_chart_web_release to the release git repository
#
# 3. Production Update:
#    - Production environment (C:/p_chart_web) pulls from the release repository
#    - Application automatically picks up the updates
#
# Usage Examples:
# .\deployment\create-deployment-full.ps1                                    # Uses default directory C:\dev\p_chart_web_release
# .\deployment\create-deployment-full.ps1 -dir "C:/p_chart_web"             # Creates production build
# .\deployment\create-deployment-full.ps1 -dir "C:/dev/p_chart_web_release" -SkipBuild  # Creates release without rebuilding

param(
    [string]$dir = "C:\dev\p_chart_web_release",
    [switch]$SkipBuild = $false
)

$ProductionPath = $dir

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  P-Chart Web - Deployment Bundle Creator" -ForegroundColor Yellow
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "Deploying to: $ProductionPath" -ForegroundColor Cyan

# Check if we're in the correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found. Please run this script from the project root directory." -ForegroundColor Red
    exit 1
}

# Preserve existing production directory structure (.git, .env, .gitignore)
if (Test-Path $ProductionPath) {
    Write-Host "Production directory exists - preserving .git, .env, and .gitignore..." -ForegroundColor Yellow
    
    # Stop any Node.js processes that might be using the directory
    Write-Host "Stopping any Node.js processes..." -ForegroundColor White
    try {
        # Get all Node.js processes
        $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
        if ($nodeProcesses) {
            Write-Host "Found $($nodeProcesses.Count) Node.js processes, checking for production directory usage..." -ForegroundColor Gray
            
            # Try to stop processes that might be using the production directory
            foreach ($process in $nodeProcesses) {
                try {
                    # Check if the process is using files in the production directory
                    $processPath = $process.MainModule.FileName
                    if ($processPath -and $processPath -like "*$ProductionPath*") {
                        Write-Host "Stopping Node.js process (PID: $($process.Id)) using production directory..." -ForegroundColor Yellow
                        $process | Stop-Process -Force
                    }
                } catch {
                    # Ignore errors for individual process checks
                }
            }
            Start-Sleep -Seconds 2
        }
    } catch {
        Write-Host "No Node.js processes found or already stopped" -ForegroundColor Gray
    }
    
    # Clean up old files but preserve .git, .env, .gitignore
    Write-Host "Cleaning up old deployment files (preserving .git, .env, .gitignore)..." -ForegroundColor White
    try {
        $preserveFiles = @(".git", ".env", ".gitignore")
        Get-ChildItem -Path $ProductionPath -Force | Where-Object { 
            $_.Name -notin $preserveFiles 
        } | ForEach-Object {
            Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
        }
        Write-Host "Cleaned up existing files while preserving git and environment files" -ForegroundColor Green
    } catch {
        Write-Host "WARNING: Some files could not be cleaned up: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Create production directory
New-Item -Path $ProductionPath -ItemType Directory -Force | Out-Null
Write-Host "Created production directory: $ProductionPath" -ForegroundColor Green

# Step 1: Build Application (if not skipped)
if (-not $SkipBuild) {
    Write-Host "Building application..." -ForegroundColor Cyan
    
    # Check if node_modules exists
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing dependencies..." -ForegroundColor White
        if (Get-Command "pnpm" -ErrorAction SilentlyContinue) {
            & pnpm install
        } else {
            & npm install
        }
    }
    
    # Generate Prisma client first
    Write-Host "Generating Prisma client..." -ForegroundColor White
    if (Get-Command "pnpm" -ErrorAction SilentlyContinue) {
        & pnpm prisma generate
    } else {
        & npx prisma generate
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Prisma client generation failed" -ForegroundColor Red
        exit 1
    }
    
    # Build the application
    Write-Host "Running build..." -ForegroundColor White
    if (Get-Command "pnpm" -ErrorAction SilentlyContinue) {
        & pnpm run build
    } else {
        & npm run build
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Build failed" -ForegroundColor Red
        exit 1
    }
    
    # Verify build output
    if (-not (Test-Path ".next")) {
        Write-Host "ERROR: Build output (.next directory) not found" -ForegroundColor Red
        exit 1
    }
    
    # Verify standalone output specifically
    if (-not (Test-Path ".next\standalone")) {
        Write-Host "ERROR: Standalone build not found! Make sure output: 'standalone' is in next.config.js" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Build completed successfully" -ForegroundColor Green
} else {
    Write-Host "Skipping build - using existing build" -ForegroundColor Yellow
}

# Step 2: Deploy Standalone Application
Write-Host "Deploying standalone application..." -ForegroundColor Cyan

# Copy .next/standalone as the base
$standaloneSource = ".next\standalone"
if (Test-Path $standaloneSource) {
    Copy-Item -Path "$standaloneSource\*" -Destination $ProductionPath -Recurse -Force
    Write-Host "Standalone server deployed" -ForegroundColor Green
} else {
    Write-Host "ERROR: Standalone build not found! Make sure output: 'standalone' is in next.config.js" -ForegroundColor Red
    exit 1
}

# Copy static assets to the correct location for standalone
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

# Copy public folder to production root
$publicSource = "public"
$publicDest = Join-Path $ProductionPath "public"
if (Test-Path $publicSource) {
    Copy-Item -Path $publicSource -Destination $publicDest -Recurse -Force
    Write-Host "Public assets deployed" -ForegroundColor Green
}

# Step 3: Copy Essential Files for Offline Operation
Write-Host "Copying essential files for offline operation..." -ForegroundColor Cyan

$essentialFiles = @(
    @{ Source = "prisma"; Dest = "prisma"; Recurse = $true },
    @{ Source = "package.json"; Dest = "package.json"; Recurse = $false },
    @{ Source = "scripts"; Dest = "scripts"; Recurse = $true },
    @{ Source = "deployment"; Dest = "deployment"; Recurse = $true },
    @{ Source = "docs"; Dest = "docs"; Recurse = $true },
    @{ Source = "node_modules"; Dest = "node_modules"; Recurse = $true; IsLarge = $true },
    @{ Source = "setup-autostart.bat"; Dest = "setup-autostart.bat"; Recurse = $false },
    @{ Source = ".gitignore-release"; Dest = ".gitignore"; Recurse = $false }
)

foreach ($file in $essentialFiles) {
    $sourcePath = $file.Source
    $destPath = Join-Path $ProductionPath $file.Dest
    
    if (Test-Path $sourcePath) {
        Write-Host "Copying $($file.Source)..." -ForegroundColor White
        
        # Special handling for large directories like node_modules
        if ($file.IsLarge) {
            Write-Host "  This is a large directory, copying may take a while..." -ForegroundColor Yellow
            
            # Check available disk space for large directories
            $sourceSize = (Get-ChildItem -Path $sourcePath -Recurse -Force | Measure-Object -Property Length -Sum).Sum
            $destDrive = Split-Path -Qualifier $ProductionPath
            $destFreeSpace = (Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='$destDrive'").FreeSpace
            
            if ($sourceSize -gt $destFreeSpace) {
                Write-Host "  ERROR: Insufficient disk space!" -ForegroundColor Red
                Write-Host "  Required: $([math]::Round($sourceSize / 1GB, 2)) GB" -ForegroundColor Red
                Write-Host "  Available: $([math]::Round($destFreeSpace / 1GB, 2)) GB" -ForegroundColor Red
                exit 1
            }
            
            Write-Host "  Estimated size: $([math]::Round($sourceSize / 1MB, 2)) MB" -ForegroundColor Gray
        }
        
        try {
            if ($file.Recurse) {
                # Use robocopy for better handling of large directories
                if ($file.IsLarge) {
                    Write-Host "  Using robocopy for large directory..." -ForegroundColor Gray
                    $robocopyArgs = @($sourcePath, $destPath, "/E", "/COPY:DAT", "/R:3", "/W:1", "/NP", "/TEE")
                    $robocopyResult = & robocopy @robocopyArgs
                    $robocopyExitCode = $LASTEXITCODE
                    
                    # Robocopy exit codes: 0-7 are success, 8+ are errors
                    if ($robocopyExitCode -le 7) {
                        Write-Host "Copied $($file.Source)" -ForegroundColor Green
                    } else {
                        Write-Host "ERROR: Failed to copy $($file.Source) with robocopy (exit code: $robocopyExitCode)" -ForegroundColor Red
                        exit 1
                    }
                } else {
                    Copy-Item -Path $sourcePath -Destination $destPath -Recurse -Force -ErrorAction Stop
                    Write-Host "Copied $($file.Source)" -ForegroundColor Green
                }
            } else {
                Copy-Item -Path $sourcePath -Destination $destPath -Force -ErrorAction Stop
                Write-Host "Copied $($file.Source)" -ForegroundColor Green
            }
        } catch {
            Write-Host "ERROR: Failed to copy $($file.Source): $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "Source: $sourcePath" -ForegroundColor Red
            Write-Host "Destination: $destPath" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "WARNING: $($file.Source) not found - skipping" -ForegroundColor Yellow
    }
}

# Copy .env file from development directory
Write-Host "Copying .env file from development directory..." -ForegroundColor White
$envSource = ".env"
$envDest = Join-Path $ProductionPath ".env"

if (Test-Path $envSource) {
    Copy-Item -Path $envSource -Destination $envDest -Force
    Write-Host "Copied .env file from development directory" -ForegroundColor Green
} else {
    Write-Host "WARNING: .env file not found in development directory - production may need manual .env setup" -ForegroundColor Yellow
}

# Step 4: Create Production Scripts
Write-Host "Creating production scripts..." -ForegroundColor Cyan

# Copy lifecycle scripts from root
$lifecycleScripts = @("start.bat", "stop.bat", "restart.bat", "setup-autostart.bat")

# Copy pull.bat from deployment directory
Write-Host "Copying pull.bat from deployment directory..." -ForegroundColor White
$pullBatSource = Join-Path $PSScriptRoot "pull.bat"
$pullBatDest = Join-Path $ProductionPath "pull.bat"

if (Test-Path $pullBatSource) {
    Copy-Item -Path $pullBatSource -Destination $pullBatDest -Force
    Write-Host "Copied pull.bat" -ForegroundColor Green
} else {
    Write-Host "WARNING: pull.bat not found in deployment directory - skipping" -ForegroundColor Yellow
}

# Continue with existing lifecycle scripts
foreach ($script in $lifecycleScripts) {
    if (Test-Path $script) {
        Copy-Item -Path $script -Destination (Join-Path $ProductionPath $script) -Force
        Write-Host "Created $script" -ForegroundColor Green
    }
}

# Note: Deployment directory and its contents are now copied in the essential files section above
# Note: This includes all MySQL/PostgreSQL setup scripts and other deployment utilities

# Step 5: Verify Deployment
Write-Host "Verifying deployment..." -ForegroundColor Cyan

# Check server.js exists
$serverJsPath = Join-Path $ProductionPath "server.js"
if (Test-Path $serverJsPath) {
    Write-Host "server.js found" -ForegroundColor Green
} else {
    Write-Host "ERROR: server.js not found!" -ForegroundColor Red
    exit 1
}

# Check .env exists
$envPath = Join-Path $ProductionPath ".env"
if (Test-Path $envPath) {
    Write-Host ".env file included" -ForegroundColor Green
} else {
    Write-Host "WARNING: .env file not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "DEPLOYMENT BUNDLE CREATED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Production Details:" -ForegroundColor Cyan
Write-Host "  Location: $ProductionPath" -ForegroundColor White
Write-Host "  Server: server.js (standalone)" -ForegroundColor White
Write-Host ""
Write-Host "Files included for offline deployment:" -ForegroundColor Yellow
Write-Host "  - Standalone Next.js application" -ForegroundColor White
Write-Host "  - Node.js modules for Prisma CLI" -ForegroundColor White
Write-Host "  - Database schema (Prisma)" -ForegroundColor White
Write-Host "  - Production scripts and utilities" -ForegroundColor White
Write-Host "  - Deployment scripts and documentation" -ForegroundColor White
Write-Host "  - Production .gitignore patterns (from .gitignore-release)" -ForegroundColor White
Write-Host ""
Write-Host "To deploy on production server:" -ForegroundColor Yellow
Write-Host "1. Copy release directory to production server (USB/ZIP/Git)" -ForegroundColor White
Write-Host "2. Setup database and schema using deployment scripts" -ForegroundColor White
Write-Host "3. Run: .\start.bat (start the application)" -ForegroundColor White
Write-Host ""
Write-Host "Application Management Scripts:" -ForegroundColor Yellow
Write-Host "  - .\start.bat (start application)" -ForegroundColor White
Write-Host "  - .\stop.bat (stop application)" -ForegroundColor White
Write-Host "  - .\restart.bat (restart application)" -ForegroundColor White
Write-Host "  - .\setup-autostart.bat (configure auto-start)" -ForegroundColor White
Write-Host "  - .\pull.bat (pull updates from repository)" -ForegroundColor White
Write-Host ""
Write-Host "Database Setup Scripts (deployment/ directory):" -ForegroundColor Yellow
Write-Host "  - .\deployment\setup-mysql.bat (MySQL database setup)" -ForegroundColor White
Write-Host "  - .\deployment\reset-database-mysql.bat (MySQL database reset)" -ForegroundColor White
Write-Host "  - .\deployment\setup-postgres.ps1 (PostgreSQL setup)" -ForegroundColor White
Write-Host "  - .\deployment\reset-database.ps1 (PostgreSQL reset)" -ForegroundColor White
Write-Host "  - .\deployment\prisma.ps1 (Prisma operations)" -ForegroundColor White
Write-Host ""
Write-Host "Documentation (deployment/ directory):" -ForegroundColor Yellow
Write-Host "  - .\deployment\README.md (deployment guide)" -ForegroundColor White
Write-Host "  - .\deployment\pull_setup.md (pull/update process)" -ForegroundColor White
Write-Host "  - .\docs\windows-autostart-guide.md (auto-start setup)" -ForegroundColor White
Write-Host ""
Write-Host "Bundle creation completed!" -ForegroundColor Green 