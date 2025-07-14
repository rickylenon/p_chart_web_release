# Manual Setup Guide: Windows Task Scheduler Auto-Start

This guide shows how to manually configure P-Chart Web to automatically start when Windows boots up using Task Scheduler.

## Prerequisites

- P-Chart Web application deployed to `C:\p_chart_web`
- Administrator privileges on the production server
- Application tested and working with `.\restart.bat`

## Step-by-Step Manual Setup

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

#### General Tab

- Check **"Run whether user is logged on or not"**
- Check **"Run with highest privileges"**
- **Configure for**: "Windows 10" or "Windows Server 2016"

#### Triggers Tab

- Double-click the trigger
- Check **"Delay task for"**: `30 seconds` (gives system time to fully boot)
- Click **"OK"**

#### Settings Tab

- Check **"Allow task to be run on demand"**
- Check **"Run task as soon as possible after a scheduled start is missed"**
- Check **"If the task fails, restart every"**: `1 minute`
- **Attempt to restart up to**: `3 times`
- Check **"Stop the task if it runs longer than"**: `3 days`
- Check **"If the running task does not end when requested, force it to stop"**

#### Conditions Tab

- Check **"Start the task only if the computer is on AC power"**
- Check **"Stop if the computer switches to battery power"**

4. Click **"OK"** to save

## Management Commands

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

### Remove Task (if needed)

```cmd
schtasks /delete /tn "P-Chart Web Application" /f
```

## Verification

After setup, verify:

1. **Test the task**:

   ```cmd
   schtasks /run /tn "P-Chart Web Application"
   ```

2. **Check if application is running**:

   - Open browser and go to `http://localhost:3000`
   - Or check running processes: `tasklist | findstr node`

3. **Restart the server** to test auto-start:
   ```cmd
   shutdown /r /t 0
   ```

## Troubleshooting

### View Task History

1. Open Task Scheduler
2. Find "P-Chart Web Application" task
3. Click on it
4. Click "History" tab in bottom panel

### Common Issues

1. **Task runs but application doesn't start**:

   - Check that `C:\p_chart_web\restart.bat` exists and works
   - Test by running `C:\p_chart_web\restart.bat` manually

2. **Permission issues**:

   - Ensure "Run with highest privileges" is checked
   - Verify SYSTEM account has access to `C:\p_chart_web`

3. **Application starts then stops**:
   - Check if MySQL service is running and set to auto-start
   - Verify `.env` file exists in `C:\p_chart_web`

## Notes

- The task runs as SYSTEM account for reliability
- The 30-second delay ensures the system is fully booted before starting the application
- The restart settings help ensure the application recovers from temporary failures
- This method works without requiring user login

## Alternative: Use Automatic Setup Script

For easier setup, you can use the automated script instead:

```cmd
cd C:\p_chart_web
setup-autostart.bat
```

This script automatically creates the same task configuration shown in this manual guide.
