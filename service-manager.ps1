# P-Chart Web - Windows Service Manager
# This script provides easy management of P-Chart Web as a Windows Service

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("install", "uninstall", "start", "stop", "restart", "status")]
    [string]$Action
)

Write-Host "P-Chart Web - Windows Service Manager" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Ensure we're in the correct directory
Set-Location 'C:\p_chart_web'

# Service name (simplified without spaces)
$ServiceName = "pchart_service"

function Test-AdminPrivileges {
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Install-PChartService {
    Write-Host "Installing P-Chart Web as Windows Service..." -ForegroundColor Yellow
    
    if (-not (Test-AdminPrivileges)) {
        Write-Host "ERROR: Administrator privileges required to install Windows Service!" -ForegroundColor Red
        Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
        exit 1
    }
    
    # Install node-windows if not already installed
    Write-Host "Checking node-windows installation..." -ForegroundColor White
    try {
        npm list node-windows --depth=0 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Installing node-windows..." -ForegroundColor White
            npm install node-windows
        }
    } catch {
        Write-Host "Installing node-windows..." -ForegroundColor White
        npm install node-windows
    }
    
    if (Test-Path "install-service.js") {
        Write-Host "Running service installer..." -ForegroundColor White
        node install-service.js
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Service installed successfully!" -ForegroundColor Green
            Write-Host "Service Name: '$ServiceName'" -ForegroundColor Cyan
        } else {
            Write-Host "Service installation failed!" -ForegroundColor Red
        }
    } else {
        Write-Host "ERROR: install-service.js not found!" -ForegroundColor Red
    }
}

function Get-PChartServiceStatus {
    Write-Host "P-Chart Web Service Status:" -ForegroundColor Cyan
    
    try {
        $service = Get-Service $ServiceName -ErrorAction Stop
        Write-Host "Service Status: $($service.Status)" -ForegroundColor White
        Write-Host "Service Name: $($service.Name)" -ForegroundColor White
        Write-Host "Display Name: $($service.DisplayName)" -ForegroundColor White
        
        if ($service.Status -eq "Running") {
            Write-Host "Application URL: http://localhost:3000" -ForegroundColor Green
        }
        
    } catch {
        Write-Host "Service not found or not installed" -ForegroundColor Red
        Write-Host "Use 'install' action to install the service" -ForegroundColor Yellow
    }
}

# Execute the requested action
switch ($Action) {
    "install" { Install-PChartService }
    "uninstall" { 
        Write-Host "Uninstalling service..." -ForegroundColor Yellow
        if (Test-Path "uninstall-service.js") {
            node uninstall-service.js
        }
    }
    "start" { 
        Write-Host "Starting service..." -ForegroundColor Yellow
        Start-Service $ServiceName
    }
    "stop" { 
        Write-Host "Stopping service..." -ForegroundColor Yellow
        Stop-Service $ServiceName
    }
    "restart" { 
        Write-Host "Restarting service..." -ForegroundColor Yellow
        Restart-Service $ServiceName
    }
    "status" { Get-PChartServiceStatus }
}

Write-Host "`nService management completed." -ForegroundColor Cyan 