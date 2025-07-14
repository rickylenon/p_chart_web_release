# Windows Auto-Start Guide for P-Chart Web

This guide shows how to configure P-Chart Web to automatically start when Windows 11 boots up using Task Scheduler.

## Overview

Since the production server doesn't allow Windows Services, we'll use **Windows Task Scheduler** to automatically start the application on system boot. This is the recommended approach because:

- ✅ Built into Windows (no additional software required)
- ✅ Runs without user login required
- ✅ Reliable and well-supported by Microsoft
- ✅ Works on restricted production servers
- ✅ Easy to configure and manage
- ✅ Uses batch files only (no PowerShell scripts required)

## Prerequisites

- P-Chart Web application deployed to `C:\p_chart_web`
- Administrator privileges on the production server
- Application tested and working with `.\restart.bat`

## Method 1: Automatic Setup using Batch Script (Recommended)

### Step 1: Use the Existing Setup Script

The project includes a pre-configured batch script at `C:\p_chart_web\setup-autostart.bat` that automatically creates the Windows Task Scheduler task.

### Step 2: Run the Setup Script

1. **Open Command Prompt as Administrator**

   - Right-click Start button → "Windows Terminal (Admin)" or "Command Prompt (Admin)"

2. **Navigate to application directory**

   ```cmd
   cd C:\p_chart_web
   ```

3. **Run the setup script**

   ```cmd
   setup-autostart.bat
   ```

4. **Verify success**
   - The script will create the scheduled task automatically
   - You should see "Setup completed successfully!" message
   - The script creates a log file at `%TEMP%\pchart_autostart_setup.log` for troubleshooting

### Step 3: Test the Setup

1. **Restart the server**

   ```cmd
   shutdown /r /t 0
   ```

2. **After reboot, check if application is running**
   - Open browser and go to `http://localhost:3000`
   - Or check running processes: `tasklist | findstr node`

## Method 2: Manual Setup (Alternative)

If you prefer to set up manually or the script doesn't work:

### Step 1: Open Task Scheduler

1. Press `Win + R`, type `taskschd.msc`, press Enter
2. Or: Start Menu → "Task Scheduler"

### Step 2: Create Basic Task

1. In Task Scheduler, click **"Create Basic Task..."** in the right panel
2. **Name**: `P-Chart Web Application`
3. **Description**: `Automatically starts P-Chart Web application on system boot`
4. Click **"Next"**

### Step 3: Configure Trigger

1. **When do you want the task to start?**: Select **"When the computer starts"**
2. Click **"Next"**

### Step 4: Configure Action

1. **What action do you want the task to perform?**: Select **"Start a program"**
2. Click **"Next"**
3. **Program/script**: `C:\p_chart_web\restart.bat`
4. **Add arguments**: (leave empty)
5. **Start in**: `C:\p_chart_web`
6. Click **"Next"**

### Step 5: Finish and Configure Advanced Settings

1. Check **"Open the Properties dialog for this task when I click Finish"**
2. Click **"Finish"**

### Step 6: Advanced Configuration

In the Properties dialog that opens:

1. **General Tab**:

   - Check **"Run whether user is logged on or not"**
   - Check **"Run with highest privileges"**
   - **Configure for**: "Windows 10" or "Windows Server 2016"

2. **Triggers Tab**:

   - Double-click the trigger
   - Check **"Delay task for"**: `30 seconds` (gives system time to fully boot)
   - Click **"OK"**

3. **Settings Tab**:

   - Check **"Allow task to be run on demand"**
   - Check **"Run task as soon as possible after a scheduled start is missed"**
   - Check **"If the task fails, restart every"**: `1 minute`
   - **Attempt to restart up to**: `3 times`

4. Click **"OK"** to save

## Management and Troubleshooting

### View Task Status

```cmd
schtasks /query /tn "P-Chart Web Application"
```

### Start Task Manually (for testing)

```cmd
schtasks /run /tn "P-Chart Web Application"
```

### Stop Task

```cmd
schtasks /end /tn "P-Chart Web Application"
```

### View Task History

1. Open Task Scheduler
2. Find "P-Chart Web Application" task
3. Click on it
4. Click "History" tab in bottom panel

### Remove Auto-Start (if needed)

```cmd
schtasks /delete /tn "P-Chart Web Application" /f
```

## Troubleshooting

### Task Created but Application Doesn't Start

1. **Check Task History**:

   - Open Task Scheduler → Find your task → History tab
   - Look for error messages

2. **Test Manually**:

   ```cmd
   schtasks /run /tn "P-Chart Web Application"
   ```

3. **Check Application Path**:

   - Ensure `C:\p_chart_web\restart.bat` exists and works
   - Test by running `C:\p_chart_web\restart.bat` manually

4. **Check Setup Log**:
   - Review `%TEMP%\pchart_autostart_setup.log` for setup details

### Application Starts but Stops Immediately

1. **Check Dependencies**:

   - Ensure PostgreSQL service is running and set to auto-start
   - Check `.env` file exists in `C:\p_chart_web`

2. **Add Delay**:
   - The setup script already includes a 30-second delay
   - If needed, you can modify the task trigger to delay start by 60-120 seconds

### Permission Issues

1. **Verify Task Runs as SYSTEM**:

   - Task Properties → General → "Run whether user is logged on or not"
   - "Run with highest privileges" should be checked

2. **Check File Permissions**:
   - Ensure SYSTEM account has access to `C:\p_chart_web`

### Network Not Available

1. **Enable "Start when available"**:

   - Task Properties → Settings → "Run task as soon as possible after a scheduled start is missed"

2. **Add Network Condition**:
   - Task Properties → Conditions → "Start only if the following network connection is available"

## Setup Script Features

The `setup-autostart.bat` script includes:

- ✅ Administrator privilege verification
- ✅ Automatic removal of existing tasks
- ✅ XML-based task configuration for reliability
- ✅ 30-second startup delay
- ✅ Restart on failure (up to 3 times)
- ✅ Comprehensive logging to `%TEMP%\pchart_autostart_setup.log`
- ✅ Task verification after creation

## Verification Checklist

After setup, verify these items:

- [ ] Task appears in Task Scheduler
- [ ] Task is enabled and ready
- [ ] Task trigger is set to "At startup" with 30-second delay
- [ ] Task action points to `C:\p_chart_web\restart.bat`
- [ ] Task runs with highest privileges as SYSTEM account
- [ ] Application starts after server reboot
- [ ] Application accessible at http://localhost:3000
- [ ] No error messages in Task History
- [ ] Setup log shows successful completion

## Alternative Solutions

If Task Scheduler doesn't work for your environment:

### Option 1: Startup Folder (Requires User Login)

```cmd
REM Copy restart.bat to startup folder
copy "C:\p_chart_web\restart.bat" "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\P-Chart-Web-Start.bat"
```

### Option 2: Registry Run Key

```cmd
REM Add registry entry (requires admin)
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "P-Chart Web" /t REG_SZ /d "C:\p_chart_web\restart.bat" /f
```

## Security Notes

- The task runs as SYSTEM account for reliability
- Application files should have appropriate permissions
- Consider firewall settings for port 3000
- Monitor task execution through Task Scheduler history
- All setup operations use batch files only (no PowerShell required)

## Support

If you encounter issues:

1. Check `%TEMP%\pchart_autostart_setup.log` for setup details
2. Check Windows Event Viewer for system errors
3. Review Task Scheduler history for task execution details
4. Test the application manually with `.\restart.bat`
5. Verify all prerequisites are met (PostgreSQL, .env file, etc.)

---

**Note**: This setup ensures P-Chart Web starts automatically on every Windows boot using only batch files, providing reliable operation for your production environment without requiring PowerShell scripts or Windows Services. The use of `restart.bat` ensures a clean shutdown and startup sequence every time the application starts.
