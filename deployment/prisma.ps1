# Quick Prisma Operations for P-Chart Web
Write-Host "Running Prisma operations..." -ForegroundColor Cyan

# Always work from production directory
Set-Location 'C:\p_chart_web'

# Load environment variables from .env file
Write-Host "Loading environment variables from .env file..." -ForegroundColor White
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, 'Process')
        }
    }
    Write-Host "Environment variables loaded" -ForegroundColor Green
} else {
    Write-Host "WARNING: .env file not found" -ForegroundColor Yellow
}

# Function to run Prisma commands using only the direct path
function Invoke-PrismaCommand {
    param(
        [string]$Command,
        [string]$Description
    )
    
    Write-Host "$Description..." -ForegroundColor White
    
    # Use only the direct path to prisma.cmd
    $prismaPath = ".\node_modules\.bin\prisma.cmd"
    
    Write-Host "  Using: $prismaPath" -ForegroundColor Gray
    
    if (Test-Path $prismaPath) {
        # Split the command into arguments for proper execution
        $commandArgs = $Command -split '\s+'
        & $prismaPath @commandArgs
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Success with: $prismaPath" -ForegroundColor Green
            return $true
        } else {
            Write-Host "  Failed with: $prismaPath" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "  ERROR: Prisma CLI not found at $prismaPath" -ForegroundColor Red
        return $false
    }
}

# Check if we have Prisma schema
if (-not (Test-Path "prisma\schema.prisma")) {
    Write-Host "ERROR: Prisma schema not found at prisma\schema.prisma" -ForegroundColor Red
    Write-Host "Please ensure the prisma directory is properly copied to production" -ForegroundColor Yellow
    exit 1
}

# First regenerate Prisma client
$generateSuccess = Invoke-PrismaCommand -Command "generate" -Description "Regenerating Prisma client"

if (-not $generateSuccess) {
    Write-Host "WARNING: Prisma generate failed, but continuing with DB push..." -ForegroundColor Yellow
}

# Run Prisma DB push
$pushSuccess = Invoke-PrismaCommand -Command "db push" -Description "Running Prisma DB push"

if ($pushSuccess) {
    Write-Host "Prisma operations completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Prisma operations failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting steps:" -ForegroundColor Yellow
    Write-Host "1. Check if PostgreSQL is running: Get-Service postgresql*" -ForegroundColor White
    Write-Host "2. Verify database connection in .env file" -ForegroundColor White
    Write-Host "3. Check if node_modules is properly copied" -ForegroundColor White
    Write-Host "4. Verify prisma.cmd exists at: .\node_modules\.bin\prisma.cmd" -ForegroundColor White
    exit 1
} 