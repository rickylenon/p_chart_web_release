# P-Chart Web - Windows Auto-Start Guide (Native Deployment)

This guide explains how to configure P-Chart Web to automatically start with Windows using native Node.js processes.

## Overview

P-Chart Web can be configured to automatically start when Windows boots, ensuring the application is always available without manual intervention.

## Methods

### 1. **Windows Service (Recommended)**

The most reliable method is to run P-Chart Web as a Windows Service:

#### Prerequisites
- Administrator privileges
- Node.js installed
- Application deployed

#### Setup Process

1. **Install Node.js Service Wrapper**
   ```powershell
   npm install -g node-windows
   ```

2. **Create Service Script**
   Create `install-service.js` in your deployment directory:
   ```javascript
   const Service = require('node-windows').Service;
   const path = require('path');
   
   const svc = new Service({
     name: 'pchart_service',
     description: 'P-Chart Web Production Management Application',
     script: path.join(__dirname, 'server-wrapper.js'),
     nodeOptions: [
       '--max_old_space_size=4096'
     ],
     env: [{
       name: "NODE_ENV",
       value: "production"
     }, {
       name: "PORT",
       value: "3000"
     }, {
       name: "HOSTNAME", 
       value: "0.0.0.0"
     }],
     workingDirectory: __dirname,
     allowServiceLogon: true
   });
   
   svc.on('install', function(){
     svc.start();
   });
   
   svc.install();
   ```

3. **Install the Service**
   ```powershell
   # Navigate to deployment directory
   cd C:\p_chart_web
   node install-service.js
   ```

### 2. **Scheduled Task**

Alternative method using Windows Task Scheduler:

1. **Open Task Scheduler**
2. **Create Basic Task**
   - Name: "P-Chart Web Startup"
   - Trigger: "When the computer starts"
   - Action: "Start a program"
   - Program: `node`
   - Arguments: `C:\p_chart_web\server-wrapper.js`
   - Start in: `C:\p_chart_web`

### 3. **Startup Folder**

Simple method for single-user systems:

1. **Create Batch File**
   Create `start-pchart.bat`:
   ```batch
   @echo off
   cd /d "C:\p_chart_web"
   node server-wrapper.js
   ```

2. **Add to Startup Folder**
   ```powershell
   # Copy batch file to startup folder
   Copy-Item "start-pchart.bat" "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\"
   ```

## Verification

### Check Service Status
```powershell
# For Windows Service method
Get-Service "pchart_service"

# For all methods - check if application is running
Get-Process node
Invoke-RestMethod -Uri "http://localhost:3000/api/health"
```

### Monitor Application
```powershell
# Check application health
.\deployment\3-check-status.ps1

# View logs
.\deployment\view-logs.ps1
```

## Management

### Windows Service Management
```powershell
# Start service
Start-Service "pchart_service"

# Stop service
Stop-Service "pchart_service"

# Restart service
Restart-Service "pchart_service"

# Remove service (run uninstall-service.js)
```

### Scheduled Task Management
```powershell
# Enable task
Enable-ScheduledTask -TaskName "P-Chart Web Startup"

# Disable task
Disable-ScheduledTask -TaskName "P-Chart Web Startup"

# Remove task
Unregister-ScheduledTask -TaskName "P-Chart Web Startup"
```

## Troubleshooting

### Application Not Starting

1. **Check Prerequisites:**
   ```powershell
   # Verify Node.js
   node --version
   
   # Verify PostgreSQL
   Get-Service postgresql*
   
   # Check application files
   Test-Path "C:\p_chart_web\server-wrapper.js"
   ```

2. **Check Permissions:**
   - Service account has access to application directory
   - Database connection permissions
   - File system permissions

3. **View Logs:**
   ```powershell
   # Application logs
   .\deployment\view-logs.ps1
   
   # Windows Event Logs
   Get-EventLog -LogName Application -Source "pchart_service" -Newest 10
   ```

### Service Issues

**Service fails to start:**
- Check service account permissions
- Verify Node.js path in service configuration
- Ensure database is accessible

**Application accessible manually but not via service:**
- Check environment variables in service configuration
- Verify working directory is set correctly
- Check network permissions for service account

## Best Practices

1. **Use Windows Service** for production environments
2. **Monitor service health** with Task Scheduler
3. **Configure automatic restart** on failure
4. **Set up log rotation** to prevent disk space issues
5. **Test startup process** after Windows updates

## Security Considerations

- Run service with least privilege account
- Secure application directory permissions
- Configure Windows Firewall rules
- Regular security updates for Node.js
- Monitor service logs for suspicious activity

---

**Status**: Native Node.js auto-start configuration  
**Methods**: Windows Service, Scheduled Task, Startup Folder  
**Monitoring**: Health checks and logging included
