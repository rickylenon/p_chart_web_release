# P-Chart Web - Start Application
Write-Host "Starting P-Chart Web Application..." -ForegroundColor Green

# Always work from production directory
Set-Location 'C:\p_chart_web'
Write-Host "Production location: C:\p_chart_web" -ForegroundColor Green

# Set environment variables for production
$env:NODE_ENV = 'production'
$env:PORT = '3000'

# Load environment variables from .env if it exists
if (Test-Path ".env") {
    Write-Host "Loading environment variables from .env..." -ForegroundColor Cyan
    Get-Content ".env" | Where-Object { $_ -match "^[^#].*=" } | ForEach-Object {
        $parts = $_ -split "=", 2
        if ($parts.Length -eq 2) {
            $key = $parts[0].Trim()
            $value = $parts[1].Trim()
            [Environment]::SetEnvironmentVariable($key, $value)
        }
    }
    Write-Host "Environment variables loaded" -ForegroundColor Green
} else {
    Write-Host "No .env file found, using defaults" -ForegroundColor Yellow
    $env:DATABASE_URL = 'postgresql://pchart_user:pchart_password@localhost:5432/pchart_web'
    $env:NEXTAUTH_URL = 'http://localhost:3000'
}

# Regenerate Prisma client to prevent version mismatch errors
if (Test-Path "node_modules\.bin\prisma.cmd") {
    Write-Host "Regenerating Prisma client..." -ForegroundColor Cyan
    & "node_modules\.bin\prisma.cmd" generate
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Prisma client regenerated successfully" -ForegroundColor Green
    } else {
        Write-Host "Warning: Prisma client regeneration failed, but continuing..." -ForegroundColor Yellow
    }
} else {
    Write-Host "Warning: Prisma CLI not found, skipping client regeneration" -ForegroundColor Yellow
}

# Verify server.js exists
if (-not (Test-Path "server.js")) {
    Write-Host "ERROR: server.js not found!" -ForegroundColor Red
    Write-Host "Expected: C:\p_chart_web\server.js" -ForegroundColor Yellow
    Write-Host "Run deployment script first to create standalone build" -ForegroundColor Yellow
    exit 1
}

Write-Host "Starting standalone server on port $($env:PORT)..." -ForegroundColor Cyan
Write-Host "Access: http://localhost:$($env:PORT)" -ForegroundColor Gray

# Start the standalone server
node server.js 