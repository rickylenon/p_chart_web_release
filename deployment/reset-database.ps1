# P-Chart Web - Database Reset PowerShell Script
# This script runs the reset-db.sql script to completely reset the database
# 
# WARNING: This will DELETE ALL DATA and DROP ALL TABLES
# Use only for development/testing environments or fresh production setups

param(
    [string]$DatabaseHost = "localhost",
    [string]$DatabasePort = "5432", 
    [string]$DatabaseName = "pchart_web",
    [string]$DatabaseUser = "pchart_user",
    [string]$DatabasePassword = "",
    [switch]$Force,
    [switch]$Help
)

if ($Help) {
    Write-Host "P-Chart Web - Database Reset Script" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "USAGE:" -ForegroundColor Yellow
    Write-Host "  .\reset-database.ps1 [parameters]" -ForegroundColor White
    Write-Host ""
    Write-Host "PARAMETERS:" -ForegroundColor Yellow
    Write-Host "  -DatabaseHost      Database host (default: localhost)" -ForegroundColor White
    Write-Host "  -DatabasePort      Database port (default: 5432)" -ForegroundColor White
    Write-Host "  -DatabaseName      Database name (default: pchart_web)" -ForegroundColor White
    Write-Host "  -DatabaseUser      Database user (default: pchart_user)" -ForegroundColor White
    Write-Host "  -DatabasePassword  Database password (will prompt if not provided)" -ForegroundColor White
    Write-Host "  -Force             Skip confirmation prompts" -ForegroundColor White
    Write-Host "  -Help              Show this help message" -ForegroundColor White
    Write-Host ""
    Write-Host "EXAMPLES:" -ForegroundColor Yellow
    Write-Host "  .\reset-database.ps1" -ForegroundColor Gray
    Write-Host "  .\reset-database.ps1 -DatabaseHost 'localhost' -DatabaseUser 'postgres'" -ForegroundColor Gray
    Write-Host "  .\reset-database.ps1 -Force" -ForegroundColor Gray
    Write-Host ""
    Write-Host "WARNING: This script will DELETE ALL DATA and DROP ALL TABLES!" -ForegroundColor Red
    exit 0
}

Write-Host "======================================================" -ForegroundColor Red
Write-Host "P-Chart Web - Database Reset Script" -ForegroundColor Red  
Write-Host "======================================================" -ForegroundColor Red
Write-Host ""
Write-Host "WARNING: This script will DELETE ALL DATA and DROP ALL TABLES!" -ForegroundColor Red
Write-Host "Use only for development/testing or fresh production setups." -ForegroundColor Yellow
Write-Host ""

# Check for PostgreSQL
$psqlPaths = @(
    "psql",
    "C:\Program Files\PostgreSQL\17\bin\psql.exe",
    "C:\Program Files\PostgreSQL\16\bin\psql.exe", 
    "C:\Program Files\PostgreSQL\15\bin\psql.exe",
    "C:\Program Files\PostgreSQL\14\bin\psql.exe",
    "C:\Program Files\PostgreSQL\13\bin\psql.exe"
)

$psqlExe = $null
foreach ($path in $psqlPaths) {
    if (Test-Path $path) {
        $psqlExe = $path
        break
    }
}

if (-not $psqlExe) {
    Write-Host "ERROR: PostgreSQL client (psql) not found!" -ForegroundColor Red
    Write-Host "Please install PostgreSQL or ensure psql.exe is in PATH" -ForegroundColor Yellow
    exit 1
}

Write-Host "SUCCESS: PostgreSQL client found: $psqlExe" -ForegroundColor Green

# Get database password if not provided
if ([string]::IsNullOrEmpty($DatabasePassword)) {
    $securePassword = Read-Host "Enter database password for user '$DatabaseUser'" -AsSecureString
    $DatabasePassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword))
}

# Show connection details
Write-Host ""
Write-Host "Database connection details:" -ForegroundColor Cyan
Write-Host "  Host: $DatabaseHost" -ForegroundColor White
Write-Host "  Port: $DatabasePort" -ForegroundColor White  
Write-Host "  Database: $DatabaseName" -ForegroundColor White
Write-Host "  User: $DatabaseUser" -ForegroundColor White

# Test database connection
Write-Host ""
Write-Host "Testing database connection..." -ForegroundColor Yellow
$env:PGPASSWORD = $DatabasePassword

try {
    $connectionTest = & $psqlExe -h $DatabaseHost -p $DatabasePort -U $DatabaseUser -d $DatabaseName -c "SELECT version();" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: Database connection successful" -ForegroundColor Green
    } else {
        throw "Connection failed"
    }
} catch {
    Write-Host "ERROR: Database connection failed" -ForegroundColor Red
    Write-Host "Please verify credentials and ensure PostgreSQL is running" -ForegroundColor Yellow
    exit 1
} finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

# Get final confirmation
if (-not $Force) {
    Write-Host ""
    Write-Host "FINAL CONFIRMATION:" -ForegroundColor Red
    Write-Host "This will permanently delete ALL data and tables in database '$DatabaseName'" -ForegroundColor Yellow
    Write-Host ""
    $confirmation = Read-Host "Type 'DELETE ALL DATA' to proceed (case sensitive)"
    
    if ($confirmation -ne "DELETE ALL DATA") {
        Write-Host "Reset cancelled - confirmation text did not match exactly" -ForegroundColor Yellow
        exit 0
    }
}

# Check if reset-db.sql exists
$resetScript = Join-Path $PSScriptRoot "reset-db.sql"
if (-not (Test-Path $resetScript)) {
    Write-Host "ERROR: reset-db.sql not found!" -ForegroundColor Red
    Write-Host "Expected location: $resetScript" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Executing database reset..." -ForegroundColor Yellow
Write-Host "Script: $resetScript" -ForegroundColor Gray

# Execute the reset script
$env:PGPASSWORD = $DatabasePassword

try {
    Write-Host "Executing SQL script..." -ForegroundColor Gray
    $output = & $psqlExe -h $DatabaseHost -p $DatabasePort -U $DatabaseUser -d $DatabaseName -f $resetScript 2>&1
    
    # Check for errors in the output
    $hasErrors = $false
    $errorMessages = @()
    
    foreach ($line in $output) {
        if ($line -match "ERROR:" -or $line -match "ROLLBACK") {
            $hasErrors = $true
            $errorMessages += $line
        }
    }
    
    if ($LASTEXITCODE -eq 0 -and -not $hasErrors) {
        Write-Host ""
        Write-Host "SUCCESS: Database reset completed!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Run Prisma migrations: npx prisma migrate deploy" -ForegroundColor White
        Write-Host "  2. Generate Prisma client: npx prisma generate" -ForegroundColor White
        Write-Host "  3. Optionally seed data: npx prisma db seed" -ForegroundColor White
        Write-Host ""
        Write-Host "The database is now ready for fresh Prisma migrations!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "ERROR: Database reset encountered issues!" -ForegroundColor Red
        Write-Host "Exit code: $LASTEXITCODE" -ForegroundColor Yellow
        
        if ($errorMessages.Count -gt 0) {
            Write-Host ""
            Write-Host "Error details:" -ForegroundColor Yellow
            foreach ($error in $errorMessages) {
                Write-Host "  $error" -ForegroundColor Red
            }
        }
        
        throw "Reset script failed or encountered errors"
    }
} catch {
    Write-Host ""
    Write-Host "ERROR: Database reset failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  - Database connection is working" -ForegroundColor Gray
    Write-Host "  - User has sufficient privileges" -ForegroundColor Gray
    Write-Host "  - reset-db.sql script syntax is valid" -ForegroundColor Gray
    Write-Host "  - Database server has sufficient resources" -ForegroundColor Gray
    exit 1
} finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
} 