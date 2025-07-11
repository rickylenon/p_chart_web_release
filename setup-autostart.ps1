# Requires -RunAsAdministrator

# Script configuration
$taskName = "P-Chart Web Application"
$appPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$startScript = Join-Path $appPath "start.bat"
$description = "Automatically starts P-Chart Web Application on system startup"

# Function to check if task exists
function Test-TaskExists {
    param($taskName)
    $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    return $null -ne $task
}

# Function to create the scheduled task
function New-StartupTask {
    param(
        $taskName,
        $startScript,
        $description
    )
    
    try {
        # Create the action that will start the application
        $action = New-ScheduledTaskAction -Execute $startScript -WorkingDirectory $appPath

        # Configure the trigger for system startup with a 30-second delay
        $trigger = New-ScheduledTaskTrigger -AtStartup
        $trigger.Delay = 'PT30S'

        # Configure principal to run with highest privileges
        $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

        # Configure settings
        $settings = New-ScheduledTaskSettingsSet `
            -AllowStartIfOnBatteries `
            -DontStopIfGoingOnBatteries `
            -RestartCount 3 `
            -RestartInterval (New-TimeSpan -Minutes 1) `
            -ExecutionTimeLimit (New-TimeSpan -Hours 0) # Run indefinitely

        # Register the task
        Register-ScheduledTask `
            -TaskName $taskName `
            -Action $action `
            -Trigger $trigger `
            -Principal $principal `
            -Settings $settings `
            -Description $description `
            -Force

        Write-Host "Successfully created startup task: $taskName" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "Error creating startup task: $_" -ForegroundColor Red
        return $false
    }
}

# Main script execution
Write-Host "Setting up auto-start for P-Chart Web Application..." -ForegroundColor Cyan

# Check if running as administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "This script requires administrator privileges. Please run as administrator." -ForegroundColor Red
    exit 1
}

# Check if start.bat exists
if (-not (Test-Path $startScript)) {
    Write-Host "Error: start.bat not found at $startScript" -ForegroundColor Red
    exit 1
}

# Remove existing task if it exists
if (Test-TaskExists $taskName) {
    Write-Host "Removing existing task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create new task
if (New-StartupTask -taskName $taskName -startScript $startScript -description $description) {
    Write-Host "`nSetup completed successfully!" -ForegroundColor Green
    Write-Host "The application will start automatically on system startup after a 30-second delay."
} else {
    Write-Host "`nSetup failed. Please check the error messages above." -ForegroundColor Red
    exit 1
} 