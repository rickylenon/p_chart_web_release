# P-Chart Web Application - Deployment Bundle Creator
# This script syncs deployment files to the git-versioned C:\p_chart_web repository

param(
    [switch]$SkipBuild = $false
)

$ProductionPath = "C:\p_chart_web"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  P-Chart Web - Deployment Bundle Creator" -ForegroundColor Yellow
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "Syncing to git repository: $ProductionPath" -ForegroundColor Cyan

# Check if we're in the correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found. Please run this script from the project root directory." -ForegroundColor Red
    exit 1
}

# Check if production path exists and is a git repository
if (Test-Path $ProductionPath) {
    $gitDir = Join-Path $ProductionPath ".git"
    if (Test-Path $gitDir) {
        Write-Host "Found existing git repository at: $ProductionPath" -ForegroundColor Green
    } else {
        Write-Host "ERROR: $ProductionPath exists but is not a git repository!" -ForegroundColor Red
        Write-Host "Please initialize it as a git repository first or remove the directory." -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "Creating production directory and initializing git repository..." -ForegroundColor Yellow
    New-Item -Path $ProductionPath -ItemType Directory -Force | Out-Null
    Set-Location $ProductionPath
    git init
    Write-Host "Git repository initialized at: $ProductionPath" -ForegroundColor Green
    Set-Location $PSScriptRoot\..
}

# Stop any running services that might be using files in the directory
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

# Stop any Node.js processes that might be using files in the directory
Write-Host "Stopping any Node.js processes using production directory..." -ForegroundColor White
try {
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        Write-Host "Found $($nodeProcesses.Count) Node.js processes, checking for production directory usage..." -ForegroundColor Gray
        
        foreach ($process in $nodeProcesses) {
            try {
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

# Step 2: Sync Git-Tracked Files
Write-Host "Syncing git-tracked files to production repository..." -ForegroundColor Cyan

# Get list of files that should be tracked in git (excluding .gitignore patterns)
$gitTrackedFiles = @(
    "src",
    "pages", 
    "components",
    "lib",
    "hooks",
    "contexts",
    "types",
    "styles",
    "middleware.ts",
    "middlewares",
    "public",
    "prisma",
    "scripts",
    "package.json",
    "package-lock.json",
    "next.config.js",
    "tailwind.config.ts",
    "tsconfig.json",
    "eslint.config.mjs",
    "postcss.config.js",
    "postcss.config.mjs",
    "components.json",
    "vercel.json",
    "README.md",
    "DEVELOPMENT.md",
    "docs",
    "deployment",
    "server-wrapper.js",
    "install-service.js",
    "uninstall-service.js",
    "start.ps1",
    "stop.ps1", 
    "restart.ps1",
    "service-manager.ps1",
    "deploy.ps1",
    "check-locks.js",
    "release-lock.js"
)

foreach ($item in $gitTrackedFiles) {
    if (Test-Path $item) {
        $destPath = Join-Path $ProductionPath $item
        
        Write-Host "Syncing $item..." -ForegroundColor White
        
        if (Test-Path $destPath) {
            # Remove existing to ensure clean copy
            Remove-Item -Path $destPath -Recurse -Force
        }
        
        # Create parent directory if needed
        $parentDir = Split-Path -Parent $destPath
        if ($parentDir -and -not (Test-Path $parentDir)) {
            New-Item -Path $parentDir -ItemType Directory -Force | Out-Null
        }
        
        # Copy the item
        Copy-Item -Path $item -Destination $destPath -Recurse -Force
        Write-Host "Synced $item" -ForegroundColor Green
    }
}

# Step 3: Sync Build Output (.next folder)
Write-Host "Syncing build output..." -ForegroundColor Cyan

# Copy entire .next folder
$nextSource = ".next"
if (Test-Path $nextSource) {
    Write-Host "Copying .next folder..." -ForegroundColor White
    $nextDest = Join-Path $ProductionPath ".next"
    
    # Remove existing .next if it exists
    if (Test-Path $nextDest) {
        Remove-Item -Path $nextDest -Recurse -Force
    }
    
    # Copy the entire .next folder
    Copy-Item -Path $nextSource -Destination $nextDest -Recurse -Force
    Write-Host "Copied .next folder" -ForegroundColor Green
} else {
    Write-Host "ERROR: .next folder not found! Please ensure the build completed successfully." -ForegroundColor Red
    exit 1
}

# Copy standalone server.js to root if it exists
$serverJsSource = Join-Path $nextSource "standalone\server.js"
if (Test-Path $serverJsSource) {
    Write-Host "Copying standalone server.js..." -ForegroundColor White
    Copy-Item -Path $serverJsSource -Destination (Join-Path $ProductionPath "server.js") -Force
    Write-Host "Copied server.js" -ForegroundColor Green
}

# Step 4: Handle Non-Git Files (Ignored Files)
Write-Host "Handling non-git files that production needs..." -ForegroundColor Cyan

# Create directories for ignored files that production needs
$ignoredDirs = @("logs", "data", "update-logs")
foreach ($dir in $ignoredDirs) {
    $dirPath = Join-Path $ProductionPath $dir
    if (-not (Test-Path $dirPath)) {
        New-Item -Path $dirPath -ItemType Directory -Force | Out-Null
        Write-Host "Created $dir directory" -ForegroundColor Green
    }
}

# Copy node_modules for production (this is ignored by git but needed for production)
$nodeModulesSource = "node_modules"
$nodeModulesDest = Join-Path $ProductionPath "node_modules"
if (Test-Path $nodeModulesSource) {
    Write-Host "Copying node_modules (this may take a while)..." -ForegroundColor Yellow
    
    # Check disk space
    $sourceSize = (Get-ChildItem -Path $nodeModulesSource -Recurse -Force | Measure-Object -Property Length -Sum).Sum
    $destDrive = Split-Path -Qualifier $ProductionPath
    $destFreeSpace = (Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='$destDrive'").FreeSpace
    
    if ($sourceSize -gt $destFreeSpace) {
        Write-Host "ERROR: Insufficient disk space!" -ForegroundColor Red
        Write-Host "Required: $([math]::Round($sourceSize / 1GB, 2)) GB" -ForegroundColor Red
        Write-Host "Available: $([math]::Round($destFreeSpace / 1GB, 2)) GB" -ForegroundColor Red
        exit 1
    }
    
    if (Test-Path $nodeModulesDest) {
        Remove-Item -Path $nodeModulesDest -Recurse -Force
    }
    
    # Use robocopy for better performance
    $robocopyArgs = @($nodeModulesSource, $nodeModulesDest, "/E", "/COPY:DAT", "/R:3", "/W:1", "/NP", "/TEE")
    $robocopyResult = & robocopy @robocopyArgs
    $robocopyExitCode = $LASTEXITCODE
    
    if ($robocopyExitCode -le 7) {
        Write-Host "Copied node_modules" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Failed to copy node_modules (exit code: $robocopyExitCode)" -ForegroundColor Red
        exit 1
    }
}

# Step 5: Create Production Environment File
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
if (-not (Test-Path $envPath)) {
    $envContent | Out-File -FilePath $envPath -Encoding UTF8
    Write-Host "Created .env file with production configuration" -ForegroundColor Green
} else {
    Write-Host ".env file already exists, skipping creation" -ForegroundColor Yellow
}

# Step 6: Create Production Data Restore Script
Write-Host "Creating production data restore script..." -ForegroundColor White
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

# Step 7: Create/Update .gitignore in Production Repo
Write-Host "Creating/updating .gitignore in production repository..." -ForegroundColor White
$gitignoreContent = @"
# Dependencies
node_modules/

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
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory
coverage/
.nyc_output

# IDE and editor files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
Desktop.ini
$RECYCLE.BIN/

# Backup files
*.backup
*.backup_*
*.bak
*.old
server.js.backup_*
package.json.backup_*

# Production data (sensitive)
/data/
production-data*.sql
defects_masterlist.csv
lines.csv
lines.xlsx
operation_steps.csv
standard_cost.csv

# Database files
*.db
*.sqlite
*.sqlite3
prisma/dev.db
prisma/dev.db-journal

# Temporary files
tmp/
temp/
*.tmp
*.temp

# Cache directories
.npm
.eslintcache
.stylelintcache
.cache
.parcel-cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Package files
*.tgz

# Yarn files
.yarn-integrity
yarn.lock
pnpm-lock.yaml

# Local configuration
local.env
config.local.js
config.local.json

# Windows Service logs and process files
daemon/logs/
*.exe.config.log

# Deployment artifacts that change frequently
deployment/installers/
*.msi
*.exe 
.next.*
package.json.backup*
server.js.backup*
deployment/installers/

# Update logs
update-logs/
"@

$gitignorePath = Join-Path $ProductionPath ".gitignore"
$gitignoreContent | Out-File -FilePath $gitignorePath -Encoding UTF8
Write-Host "Created/updated .gitignore in production repository" -ForegroundColor Green

# Step 8: Verify Deployment
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
    Write-Host ".env file found" -ForegroundColor Green
} else {
    Write-Host "WARNING: .env file not found" -ForegroundColor Yellow
}

# Check git repository
$gitDir = Join-Path $ProductionPath ".git"
if (Test-Path $gitDir) {
    Write-Host "Git repository preserved" -ForegroundColor Green
} else {
    Write-Host "ERROR: Git repository not found!" -ForegroundColor Red
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "DEPLOYMENT SYNC COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Git Repository Details:" -ForegroundColor Cyan
Write-Host "  Location: $ProductionPath" -ForegroundColor White
Write-Host "  Type: Git-versioned deployment repository" -ForegroundColor White
Write-Host "  Server: server.js (standalone Next.js)" -ForegroundColor White
Write-Host ""
Write-Host "Files synced:" -ForegroundColor Yellow
Write-Host "  ✓ Source code and components" -ForegroundColor Green
Write-Host "  ✓ Built application (.next/standalone + static)" -ForegroundColor Green
Write-Host "  ✓ Database schema and scripts" -ForegroundColor Green
Write-Host "  ✓ Deployment and management scripts" -ForegroundColor Green
Write-Host "  ✓ Production dependencies (node_modules)" -ForegroundColor Green
Write-Host "  ✓ Production environment configuration" -ForegroundColor Green
Write-Host ""
Write-Host "Git-ignored files (managed separately):" -ForegroundColor Yellow
Write-Host "  • .env (production environment)" -ForegroundColor White
Write-Host "  • node_modules/ (production dependencies)" -ForegroundColor White
Write-Host "  • logs/ (application logs)" -ForegroundColor White
Write-Host "  • data/ (production data files)" -ForegroundColor White
Write-Host "  • update-logs/ (deployment logs)" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Review changes in: $ProductionPath" -ForegroundColor White
Write-Host "2. Commit changes: git add . && git commit -m 'Deploy v[version]'" -ForegroundColor White
Write-Host "3. Push to remote: git push origin main" -ForegroundColor White
Write-Host "4. Test deployment: .\deploy.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Production management:" -ForegroundColor Yellow
Write-Host "  • Install service: .\service-manager.ps1 install" -ForegroundColor White
Write-Host "  • Start service: .\service-manager.ps1 start" -ForegroundColor White
Write-Host "  • Manual data restore: .\restore-production-data.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Deployment bundle sync completed successfully!" -ForegroundColor Green 