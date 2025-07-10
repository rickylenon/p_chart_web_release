# P-Chart Web Application - Deployment Bundle Creator
# This script creates a deployment bundle to C:\p_chart_web

param(
    [switch]$SkipBuild = $false
)

$ProductionPath = "C:\p_chart_web"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  P-Chart Web - Deployment Bundle Creator" -ForegroundColor Yellow
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "Deploying to: $ProductionPath" -ForegroundColor Cyan

# Check if we're in the correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found. Please run this script from the project root directory." -ForegroundColor Red
    exit 1
}

# Remove existing production directory
if (Test-Path $ProductionPath) {
    Write-Host "Removing existing production directory..." -ForegroundColor Yellow
    
    # Stop any running services that might be using the directory
    Write-Host "Stopping any running services..." -ForegroundColor White
    try {
        $service = Get-Service "P-ChartWeb" -ErrorAction SilentlyContinue
        if ($service -and $service.Status -eq "Running") {
            Write-Host "Stopping P-ChartWeb service..." -ForegroundColor Yellow
            Stop-Service "P-ChartWeb" -Force
            Start-Sleep -Seconds 2
        }
    } catch {
        Write-Host "No P-ChartWeb service found or already stopped" -ForegroundColor Gray
    }
    
    # Stop any Node.js processes that might be using the directory
    Write-Host "Stopping any Node.js processes..." -ForegroundColor White
    try {
        # Get all Node.js processes
        $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
        if ($nodeProcesses) {
            Write-Host "Found $($nodeProcesses.Count) Node.js processes, checking for production directory usage..." -ForegroundColor Gray
            
            # Try to stop processes that might be using the production directory
            # We'll use a more reliable method by checking if any process has the directory open
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
    
    # Additional cleanup - stop any processes that might have files open
    Write-Host "Performing final cleanup..." -ForegroundColor White
    try {
        # Force close any handles to the directory
        $null = [System.GC]::Collect()
        Start-Sleep -Seconds 1
        
        # Additional wait to ensure all processes are fully stopped
        Start-Sleep -Seconds 2
    } catch {
        # Ignore cleanup errors
    }
    
    # Now try to remove the directory
    try {
        Remove-Item -Path $ProductionPath -Recurse -Force -ErrorAction Stop
        Write-Host "Existing production directory removed successfully" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: Could not remove existing production directory!" -ForegroundColor Red
        Write-Host "Directory may be in use by another process." -ForegroundColor Yellow
        Write-Host "Please manually stop any applications using C:\p_chart_web and try again." -ForegroundColor Yellow
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
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
    
    # Build the application
    Write-Host "Running build..." -ForegroundColor White
    if (Get-Command "pnpm" -ErrorAction SilentlyContinue) {
        & pnpm run build
    } else {
        & npm run build
    }
    
    # Verify build output
    if (-not (Test-Path ".next")) {
        Write-Host "ERROR: Build output (.next directory) not found" -ForegroundColor Red
        exit 1
    }
    Write-Host "Build completed" -ForegroundColor Green
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
    @{ Source = "data"; Dest = "data"; Recurse = $true },
    @{ Source = "node_modules"; Dest = "node_modules"; Recurse = $true; IsLarge = $true },
    @{ Source = "deployment"; Dest = "deployment"; Recurse = $true },
    @{ Source = "server-wrapper.js"; Dest = "server-wrapper.js"; Recurse = $false },
    @{ Source = "install-service.js"; Dest = "install-service.js"; Recurse = $false },
    @{ Source = "uninstall-service.js"; Dest = "uninstall-service.js"; Recurse = $false }
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

# Create production .env file with fixed credentials
Write-Host "Creating production .env file..." -ForegroundColor White
$envContent = @"
# P-Chart Web Production Environment
NODE_ENV=production
PORT=3000

# Database Configuration
DATABASE_URL=postgresql://pchart_user:pchart_password@localhost:5432/pchart_web
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pchart_web
DB_USER=pchart_user
DB_PASSWORD=pchart_password

# NextAuth Configuration
# NEXTAUTH_URL is intentionally commented out to allow auto-detection from request headers
# This enables the app to work from any IP address (localhost, network IP, etc.)
NEXTAUTH_SECRET=production-nextauth-secret-key

# Session Configuration
SESSION_SECRET=production-session-secret-key
"@

$envPath = Join-Path $ProductionPath ".env"
$envContent | Out-File -FilePath $envPath -Encoding UTF8
Write-Host "Created .env file with fixed credentials" -ForegroundColor Green

# Step 4: Create Production Scripts
Write-Host "Creating production scripts..." -ForegroundColor Cyan

# Copy lifecycle scripts from root
$lifecycleScripts = @("start.ps1", "stop.ps1", "restart.ps1", "service-manager.ps1", "deploy.ps1")
foreach ($script in $lifecycleScripts) {
    if (Test-Path $script) {
        Copy-Item -Path $script -Destination (Join-Path $ProductionPath $script) -Force
        Write-Host "Created $script" -ForegroundColor Green
    }
}

# Copy setup-postgres.ps1 to production (both root and deployment folder)
if (Test-Path "setup-postgres.ps1") {
    Copy-Item -Path "setup-postgres.ps1" -Destination (Join-Path $ProductionPath "setup-postgres.ps1") -Force
    
    # Also copy to deployment subdirectory for backup access
    $deploymentDir = Join-Path $ProductionPath "deployment"
    if (Test-Path $deploymentDir) {
        Copy-Item -Path "setup-postgres.ps1" -Destination (Join-Path $deploymentDir "setup-postgres.ps1") -Force
    }
    Write-Host "Copied setup-postgres.ps1" -ForegroundColor Green
}

# Copy load-production-data.ps1 to production deployment folder
if (Test-Path "deployment\load-production-data.ps1") {
    $deploymentDir = Join-Path $ProductionPath "deployment"
    if (Test-Path $deploymentDir) {
        Copy-Item -Path "deployment\load-production-data.ps1" -Destination (Join-Path $deploymentDir "load-production-data.ps1") -Force
        Write-Host "Copied load-production-data.ps1" -ForegroundColor Green
    }
}

# Copy test-prisma-cli.ps1 to production deployment folder
if (Test-Path "deployment\test-prisma-cli.ps1") {
    $deploymentDir = Join-Path $ProductionPath "deployment"
    if (Test-Path $deploymentDir) {
        Copy-Item -Path "deployment\test-prisma-cli.ps1" -Destination (Join-Path $deploymentDir "test-prisma-cli.ps1") -Force
        Write-Host "Copied test-prisma-cli.ps1" -ForegroundColor Green
    }
}

# Create a manual data restore script
Write-Host "Creating manual data restore script..." -ForegroundColor White
$restoreDataScript = @"
# Manual Production Data Restore Script
# Use this script if automatic restoration failed during deployment

Write-Host "Manual Production Data Restore" -ForegroundColor Cyan

# Always work from C:\p_chart_web
Set-Location 'C:\p_chart_web'

# PostgreSQL installation path
`$psqlPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe"

`$productionDataFile = "data\production-data-latest.sql"
if (Test-Path `$productionDataFile) {
    if (Test-Path `$psqlPath) {
        Write-Host "Found production data file: `$productionDataFile" -ForegroundColor Green
        Write-Host "Restoring production data..." -ForegroundColor White
        
        # Set PGPASSWORD for authentication
        `$env:PGPASSWORD = "pchart_password"
        
        # Execute the SQL file
        & `$psqlPath -U pchart_user -d pchart_web -f `$productionDataFile
        if (`$LASTEXITCODE -eq 0) {
            Write-Host "Production data restored successfully!" -ForegroundColor Green
        } else {
            Write-Host "Production data restoration failed!" -ForegroundColor Red
            Write-Host "Check PostgreSQL connection and file path" -ForegroundColor Yellow
        }
        
        # Clear password environment variable
        Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
    } else {
        Write-Host "ERROR: PostgreSQL not found at `$psqlPath" -ForegroundColor Red
        Write-Host "Please install PostgreSQL 17 first" -ForegroundColor Yellow
    }
} else {
    Write-Host "ERROR: Production data file not found!" -ForegroundColor Red
    Write-Host "Expected: `$productionDataFile" -ForegroundColor Yellow
}
"@

$restoreScriptPath = Join-Path $ProductionPath "restore-production-data.ps1"
$restoreDataScript | Out-File -FilePath $restoreScriptPath -Encoding UTF8
Write-Host "Created restore-production-data.ps1" -ForegroundColor Green

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
Write-Host "  - Data directory (includes production-data-latest.sql if available)" -ForegroundColor White
Write-Host ""
Write-Host "To deploy on production server:" -ForegroundColor Yellow
Write-Host "1. Copy C:\p_chart_web to production server (USB/ZIP)" -ForegroundColor White
Write-Host "2. Run: .\deploy.ps1 (sets up DB, schema, and restores data)" -ForegroundColor White
Write-Host "3. Run: .\service-manager.ps1 install (install as Windows Service)" -ForegroundColor White
Write-Host "4. Run: .\service-manager.ps1 start (start the service)" -ForegroundColor White
Write-Host ""
Write-Host "Additional production scripts:" -ForegroundColor Yellow
Write-Host "  - .\restore-production-data.ps1 (manual data restore)" -ForegroundColor White
Write-Host "  - .\deployment\prisma.ps1 (quick schema update)" -ForegroundColor White
Write-Host "  - .\deployment\load-production-data.ps1 (load production data)" -ForegroundColor White
Write-Host "  - .\service-manager.ps1 (Windows Service management)" -ForegroundColor White
Write-Host ""
Write-Host "Bundle creation completed!" -ForegroundColor Green 