# PostgreSQL Setup Script for P-Chart
# This script sets up the database using fixed credentials

Write-Host "Setting up PostgreSQL for P-Chart..." -ForegroundColor Green

# Fixed credentials
$postgresUser = "postgres"
$postgresPassword = "rootroot"
$appUser = "pchart_user"
$appPassword = "pchart_password"
$databaseName = "pchart_web"

Write-Host "Creating database and user with fixed credentials..." -ForegroundColor Cyan

# PostgreSQL installation path
$psqlPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe"

# Check if PostgreSQL is installed
if (-not (Test-Path $psqlPath)) {
    Write-Host "ERROR: PostgreSQL 17 not found at: $psqlPath" -ForegroundColor Red
    Write-Host "Please install PostgreSQL 17 or update the path in this script" -ForegroundColor Yellow
    exit 1
}

# Set PGPASSWORD environment variable for postgres user
$env:PGPASSWORD = $postgresPassword

try {
    # Create database
    Write-Host "Creating database $databaseName..." -ForegroundColor White
    & $psqlPath -U $postgresUser -d postgres -c "CREATE DATABASE $databaseName;"
    
    # Create user
    Write-Host "Creating user $appUser..." -ForegroundColor White
    & $psqlPath -U $postgresUser -d postgres -c "CREATE USER $appUser WITH PASSWORD '$appPassword';"
    
    # Grant privileges
    Write-Host "Granting privileges..." -ForegroundColor White
    & $psqlPath -U $postgresUser -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE $databaseName TO $appUser;"
    
    # Set up schema privileges
    Write-Host "Setting up schema privileges..." -ForegroundColor White
    & $psqlPath -U $postgresUser -d $databaseName -c "GRANT ALL ON SCHEMA public TO $appUser;"
    & $psqlPath -U $postgresUser -d $databaseName -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $appUser;"
    & $psqlPath -U $postgresUser -d $databaseName -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $appUser;"
    
    Write-Host "Database setup completed successfully!" -ForegroundColor Green
    
} catch {
    Write-Host "Database setup failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Clear the password environment variable
    Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Database Configuration:" -ForegroundColor Cyan
Write-Host "  Database: $databaseName" -ForegroundColor White
Write-Host "  Host: localhost" -ForegroundColor White
Write-Host "  Port: 5432" -ForegroundColor White
Write-Host "  User: $appUser" -ForegroundColor White
Write-Host "  Password: $appPassword" -ForegroundColor White
Write-Host ""
Write-Host "Connection String:" -ForegroundColor Cyan
Write-Host "  postgresql://${appUser}:${appPassword}@localhost:5432/${databaseName}" -ForegroundColor White 