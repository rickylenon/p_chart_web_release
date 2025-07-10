# Manual Production Data Restore Script
# Use this script if automatic restoration failed during deployment

Write-Host "Manual Production Data Restore" -ForegroundColor Cyan

# Always work from C:\p_chart_web
Set-Location 'C:\p_chart_web'

# PostgreSQL installation path
$psqlPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe"

$productionDataFile = "data\production-data-latest.sql"
if (Test-Path $productionDataFile) {
    if (Test-Path $psqlPath) {
        Write-Host "Found production data file: $productionDataFile" -ForegroundColor Green
        Write-Host "Restoring production data..." -ForegroundColor White
        
        # Set PGPASSWORD for authentication
        $env:PGPASSWORD = "pchart_password"
        
        # Execute the SQL file
        & $psqlPath -U pchart_user -d pchart_web -f $productionDataFile
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Production data restored successfully!" -ForegroundColor Green
        } else {
            Write-Host "Production data restoration failed!" -ForegroundColor Red
            Write-Host "Check PostgreSQL connection and file path" -ForegroundColor Yellow
        }
        
        # Clear password environment variable
        Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
    } else {
        Write-Host "ERROR: PostgreSQL not found at $psqlPath" -ForegroundColor Red
        Write-Host "Please install PostgreSQL 17 first" -ForegroundColor Yellow
    }
} else {
    Write-Host "ERROR: Production data file not found!" -ForegroundColor Red
    Write-Host "Expected: $productionDataFile" -ForegroundColor Yellow
}
