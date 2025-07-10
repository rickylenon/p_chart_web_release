# P-Chart Web - Production Deployment
# Run this script on the production server

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "P-Chart Web - Production Deployment" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# Always work from C:\p_chart_web
Set-Location 'C:\p_chart_web'
Write-Host "Working from: C:\p_chart_web" -ForegroundColor Green

# Step 1: Setup Database
Write-Host ""
Write-Host "Step 1: Setting up database..." -ForegroundColor Cyan
if (Test-Path "setup-postgres.ps1") {
    & ".\setup-postgres.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Database setup failed. Please check PostgreSQL installation." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "WARNING: setup-postgres.ps1 not found. Setup database manually." -ForegroundColor Yellow
}

# Step 2: Run Prisma migrations
Write-Host ""
Write-Host "Step 2: Setting up database schema..." -ForegroundColor Cyan
if (Test-Path "prisma") {
    # Use the improved prisma script for better Prisma CLI handling
    Write-Host "Running Prisma operations using prisma script..." -ForegroundColor White
    if (Test-Path "deployment\prisma.ps1") {
        & ".\deployment\prisma.ps1"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Database schema setup completed" -ForegroundColor Green
        } else {
            Write-Host "ERROR: Prisma operations failed" -ForegroundColor Red
            Write-Host "Check the output above for troubleshooting steps" -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host "ERROR: prisma.ps1 not found in deployment directory" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "ERROR: Prisma directory not found" -ForegroundColor Red
    exit 1
}

# Step 3: Restore Production Data (if available)
Write-Host ""
Write-Host "Step 3: Restoring production data..." -ForegroundColor Cyan

# PostgreSQL installation path
$psqlPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe"

$productionDataFile = "data\production-data-latest.sql"
if (Test-Path $productionDataFile) {
    if (Test-Path $psqlPath) {
        Write-Host "Found production data file: $productionDataFile" -ForegroundColor White
        Write-Host "Restoring production data..." -ForegroundColor White
        
        # Set PGPASSWORD for authentication
        $env:PGPASSWORD = "pchart_password"
        
        # Execute the SQL file
        & $psqlPath -U pchart_user -d pchart_web -f $productionDataFile
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Production data restored successfully" -ForegroundColor Green
        } else {
            Write-Host "WARNING: Production data restoration failed" -ForegroundColor Yellow
            Write-Host "You can restore it manually later using:" -ForegroundColor Yellow
            Write-Host "  `"$psqlPath`" -U pchart_user -d pchart_web -f $productionDataFile" -ForegroundColor Yellow
        }
        
        # Clear password environment variable
        Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
    } else {
        Write-Host "WARNING: PostgreSQL not found at $psqlPath" -ForegroundColor Yellow
        Write-Host "Please install PostgreSQL 17 or restore data manually" -ForegroundColor Yellow
    }
} else {
    Write-Host "No production data file found ($productionDataFile)" -ForegroundColor Yellow
    Write-Host "Application will start with empty database" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETED!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Install as Windows Service (requires Administrator):" -ForegroundColor White
Write-Host "   .\service-manager.ps1 install" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Start the service:" -ForegroundColor White
Write-Host "   .\service-manager.ps1 start" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Check service status:" -ForegroundColor White
Write-Host "   .\service-manager.ps1 status" -ForegroundColor Yellow
Write-Host ""
Write-Host "Service Management Commands:" -ForegroundColor Cyan
Write-Host "  .\service-manager.ps1 install    # Install service (one-time)" -ForegroundColor White
Write-Host "  .\service-manager.ps1 start      # Start service" -ForegroundColor White
Write-Host "  .\service-manager.ps1 stop       # Stop service" -ForegroundColor White
Write-Host "  .\service-manager.ps1 restart    # Restart service" -ForegroundColor White
Write-Host "  .\service-manager.ps1 status     # Check status" -ForegroundColor White
Write-Host "  .\service-manager.ps1 uninstall  # Remove service" -ForegroundColor White
Write-Host ""
Write-Host "Application URL: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: Manual start/stop scripts (start.ps1, stop.ps1) are for development only." -ForegroundColor Yellow
Write-Host "      Use service-manager.ps1 for production deployment." -ForegroundColor Yellow 