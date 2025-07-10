# P-Chart Web - Restart Application
Write-Host "Restarting P-Chart Web Application..." -ForegroundColor Cyan

# Always work from production directory
Set-Location 'C:\p_chart_web'

Write-Host "Step 1: Stopping application..." -ForegroundColor Yellow
& '.\stop.ps1'

Write-Host "Waiting 3 seconds for clean shutdown..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "Step 2: Starting application..." -ForegroundColor Yellow
& '.\start.ps1' 