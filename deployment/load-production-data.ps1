# Production Data Loader Script for P-Chart
# This script loads production data from data/production-data-latest.sql

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "P-Chart Web - Production Data Loader" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# Fixed credentials
$postgresUser = "pchart_user"
$postgresPassword = "pchart_password"
$databaseName = "pchart_web"

# PostgreSQL installation path
$psqlPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe"

# Check if PostgreSQL is installed
if (-not (Test-Path $psqlPath)) {
    Write-Host "ERROR: PostgreSQL 17 not found at: $psqlPath" -ForegroundColor Red
    Write-Host "Please install PostgreSQL 17 or update the path in this script" -ForegroundColor Yellow
    exit 1
}

# Production data file path
$productionDataFile = "data\production-data-latest.sql"

# Check if production data file exists
if (-not (Test-Path $productionDataFile)) {
    Write-Host "ERROR: Production data file not found!" -ForegroundColor Red
    Write-Host "Expected file: $productionDataFile" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To create this file, run from development environment:" -ForegroundColor Cyan
    Write-Host "  node scripts/production-data-export.js" -ForegroundColor White
    exit 1
}

Write-Host "Found production data file: $productionDataFile" -ForegroundColor Green

# Get file size for user information
$fileSize = (Get-Item $productionDataFile).Length / 1MB
Write-Host "File size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor White

# Test database connection first
Write-Host ""
Write-Host "Testing database connection..." -ForegroundColor Cyan

# Set PGPASSWORD environment variable
$env:PGPASSWORD = $postgresPassword

try {
    # Test connection
    $testResult = & $psqlPath -U $postgresUser -d $databaseName -c "SELECT 1;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Database connection successful" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Database connection failed!" -ForegroundColor Red
        Write-Host "Connection details:" -ForegroundColor Yellow
        Write-Host "  Host: localhost" -ForegroundColor White
        Write-Host "  Port: 5432" -ForegroundColor White
        Write-Host "  Database: $databaseName" -ForegroundColor White
        Write-Host "  User: $postgresUser" -ForegroundColor White
        Write-Host ""
        Write-Host "Please check:" -ForegroundColor Yellow
        Write-Host "  1. PostgreSQL service is running" -ForegroundColor White
        Write-Host "  2. Database '$databaseName' exists" -ForegroundColor White
        Write-Host "  3. User '$postgresUser' has proper permissions" -ForegroundColor White
        exit 1
    }
} catch {
    Write-Host "ERROR: Database connection test failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Confirm with user before loading data
Write-Host ""
Write-Host "WARNING: This will load production data into the database." -ForegroundColor Yellow
Write-Host "Make sure you have a backup if needed." -ForegroundColor Yellow
Write-Host ""
$confirmation = Read-Host "Type 'LOAD DATA' to proceed (case sensitive)"

if ($confirmation -ne "LOAD DATA") {
    Write-Host "Operation cancelled by user." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Loading production data..." -ForegroundColor Cyan

try {
    # Execute the SQL file
    Write-Host "Executing SQL file..." -ForegroundColor White
    $result = & $psqlPath -U $postgresUser -d $databaseName -f $productionDataFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "======================================================" -ForegroundColor Green
        Write-Host "PRODUCTION DATA LOADED SUCCESSFULLY!" -ForegroundColor Green
        Write-Host "======================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Database: $databaseName" -ForegroundColor White
        Write-Host "Data file: $productionDataFile" -ForegroundColor White
        Write-Host "File size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor White
        Write-Host ""
        Write-Host "The application is ready to use with production data!" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "ERROR: Failed to load production data!" -ForegroundColor Red
        Write-Host "Exit code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host ""
        Write-Host "Error output:" -ForegroundColor Yellow
        Write-Host $result -ForegroundColor Red
        Write-Host ""
        Write-Host "Troubleshooting:" -ForegroundColor Yellow
        Write-Host "  1. Check if database schema is properly set up" -ForegroundColor White
        Write-Host "  2. Verify the SQL file is not corrupted" -ForegroundColor White
        Write-Host "  3. Check PostgreSQL logs for detailed errors" -ForegroundColor White
        exit 1
    }
} catch {
    Write-Host "ERROR: Exception occurred while loading data: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Clear the password environment variable
    Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start the application: .\start.ps1" -ForegroundColor White
Write-Host "  2. Access the application at: http://localhost:3000" -ForegroundColor White 