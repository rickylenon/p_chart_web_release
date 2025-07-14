# P-Chart Web Native Deployment Uninstaller
# This script removes P-Chart Web native deployment completely

Write-Host "P-Chart Web Native Deployment Uninstaller" -ForegroundColor Red
Write-Host "=============================================" -ForegroundColor Red
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "This script should be run as Administrator for complete removal" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne 'y' -and $continue -ne 'Y') {
        exit 0
    }
}

Write-Host "This will completely remove P-Chart Web deployment including:" -ForegroundColor Yellow
Write-Host "- Application files and configuration" -ForegroundColor White
Write-Host "- Database data (if local PostgreSQL)" -ForegroundColor White
Write-Host "- Logs and temporary files" -ForegroundColor White
Write-Host "- Windows services (if configured)" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Are you sure you want to proceed? Type 'YES' to confirm"
if ($confirm -ne 'YES') {
    Write-Host "Uninstall cancelled" -ForegroundColor Green
    exit 0
}

# 1. Stop Node.js application processes
Write-Host "`n1. Stopping application processes..." -ForegroundColor Cyan

try {
    Write-Host "Stopping Node.js processes..." -ForegroundColor Yellow
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        $nodeProcesses | Stop-Process -Force
        Write-Host "[OK] Node.js processes stopped" -ForegroundColor Green
    } else {
        Write-Host "[INFO] No Node.js processes found" -ForegroundColor Gray
    }
} catch {
    Write-Host "[WARNING] Error stopping processes: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 2. Remove Windows services (if configured)
Write-Host "`n2. Removing Windows services..." -ForegroundColor Cyan

try {
    $services = Get-Service -Name "*pchart*" -ErrorAction SilentlyContinue
    if ($services) {
        foreach ($service in $services) {
            Write-Host "Removing service: $($service.Name)" -ForegroundColor Yellow
            Stop-Service -Name $service.Name -Force -ErrorAction SilentlyContinue
            sc.exe delete $service.Name
        }
        Write-Host "[OK] Windows services removed" -ForegroundColor Green
    } else {
        Write-Host "[INFO] No P-Chart services found" -ForegroundColor Gray
    }
} catch {
    Write-Host "[WARNING] Error removing services: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 3. Remove application directories
Write-Host "`n3. Removing application directories..." -ForegroundColor Cyan

$directories = @(
    "C:\pchart-web",
    "C:\p_chart_web", 
    "$env:USERPROFILE\pchart-web",
    (Get-Location).Path
)

foreach ($dir in $directories) {
    if (Test-Path $dir) {
        Write-Host "Removing directory: $dir" -ForegroundColor Yellow
        try {
            Remove-Item -Path $dir -Recurse -Force
            Write-Host "[OK] Directory removed: $dir" -ForegroundColor Green
        } catch {
            Write-Host "[WARNING] Could not remove: $dir - $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

# 4. Clean up PostgreSQL database (optional)
Write-Host "`n4. Database cleanup..." -ForegroundColor Cyan
$cleanDb = Read-Host "Remove P-Chart database? This will delete all data (y/N)"
if ($cleanDb -eq 'y' -or $cleanDb -eq 'Y') {
    try {
        Write-Host "Removing P-Chart database..." -ForegroundColor Yellow
        $dbUser = Read-Host "PostgreSQL username (default: pchart_user)"
        if ([string]::IsNullOrEmpty($dbUser)) { $dbUser = "pchart_user" }
        
        $securePassword = Read-Host "PostgreSQL password" -AsSecureString
        $password = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword))
        
        $env:PGPASSWORD = $password
        psql -h localhost -U $dbUser -d postgres -c "DROP DATABASE IF EXISTS pchart_web;" 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Database removed" -ForegroundColor Green
        } else {
            Write-Host "[WARNING] Could not remove database" -ForegroundColor Yellow
        }
        
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    } catch {
        Write-Host "[WARNING] Database cleanup failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "[INFO] Database kept intact" -ForegroundColor Gray
}

# 5. Remove logs and temporary files
Write-Host "`n5. Cleaning up logs and temporary files..." -ForegroundColor Cyan

$tempLocations = @(
    "$env:TEMP\pchart*",
    "$env:USERPROFILE\AppData\Local\Temp\pchart*",
    "C:\Logs\pchart*",
    "C:\temp\pchart*"
)

foreach ($location in $tempLocations) {
    $items = Get-ChildItem -Path $location -ErrorAction SilentlyContinue
    if ($items) {
        Write-Host "Cleaning: $location" -ForegroundColor Yellow
        Remove-Item -Path $location -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "[OK] Temporary files cleaned" -ForegroundColor Green

# 6. Remove firewall rules
Write-Host "`n6. Removing firewall rules..." -ForegroundColor Cyan

try {
    if ($isAdmin) {
        $firewallRules = Get-NetFirewallRule -DisplayName "*P-Chart*" -ErrorAction SilentlyContinue
        if ($firewallRules) {
            $firewallRules | Remove-NetFirewallRule
            Write-Host "[OK] Firewall rules removed" -ForegroundColor Green
        } else {
            Write-Host "[INFO] No P-Chart firewall rules found" -ForegroundColor Gray
        }
    } else {
        Write-Host "[SKIP] Administrator required for firewall cleanup" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[WARNING] Error removing firewall rules: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 7. Remove scheduled tasks
Write-Host "`n7. Removing scheduled tasks..." -ForegroundColor Cyan

try {
    if ($isAdmin) {
        $tasks = Get-ScheduledTask -TaskName "*pchart*" -ErrorAction SilentlyContinue
        if ($tasks) {
            $tasks | Unregister-ScheduledTask -Confirm:$false
            Write-Host "[OK] Scheduled tasks removed" -ForegroundColor Green
        } else {
            Write-Host "[INFO] No P-Chart scheduled tasks found" -ForegroundColor Gray
        }
    } else {
        Write-Host "[SKIP] Administrator required for scheduled task cleanup" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[WARNING] Error removing scheduled tasks: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 8. Remove environment variables
Write-Host "`n8. Removing environment variables..." -ForegroundColor Cyan

try {
    $envVars = @("PCHART_HOME", "PCHART_CONFIG", "PCHART_LOG_LEVEL")
    foreach ($var in $envVars) {
        if ([Environment]::GetEnvironmentVariable($var, "User")) {
            [Environment]::SetEnvironmentVariable($var, $null, "User")
            Write-Host "Removed user environment variable: $var" -ForegroundColor Yellow
        }
        if ($isAdmin -and [Environment]::GetEnvironmentVariable($var, "Machine")) {
            [Environment]::SetEnvironmentVariable($var, $null, "Machine")
            Write-Host "Removed system environment variable: $var" -ForegroundColor Yellow
        }
    }
    Write-Host "[OK] Environment variables cleaned" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Error removing environment variables: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "P-CHART WEB UNINSTALL COMPLETED" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "The following items have been removed:" -ForegroundColor White
Write-Host "- Application processes and services" -ForegroundColor White
Write-Host "- Application files and configuration" -ForegroundColor White
Write-Host "- Logs and temporary files" -ForegroundColor White
Write-Host "- Firewall rules and scheduled tasks" -ForegroundColor White
Write-Host "- Environment variables" -ForegroundColor White
Write-Host ""
Write-Host "Items that may need manual removal:" -ForegroundColor Yellow
Write-Host "- PostgreSQL installation (if no longer needed)" -ForegroundColor White
Write-Host "- Node.js installation (if no longer needed)" -ForegroundColor White
Write-Host "- Any custom backups or exports" -ForegroundColor White
Write-Host ""
Write-Host "Uninstall completed successfully!" -ForegroundColor Green

Read-Host "Press Enter to exit" 