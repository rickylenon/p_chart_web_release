# P-Chart Web - Production Deployment Guide

This guide covers the production deployment process for P-Chart Web application using Windows Services.

## Overview

**Developer Side**: `C:\PROJECTX\p_chart_web\` - Source code (runs `npm run dev`)
**Production Side**: `C:\p_chart_web\` - Deployed application (runs as Windows Service)

## Fixed Credentials

**PostgreSQL**:
- Root user: `postgres`, password: `rootroot`  
- App user: `pchart_user`, password: `pchart_password`
- Database: `pchart_web`

## Prerequisites

### PowerShell Execution Policy

Before running any PowerShell scripts, you must set the execution policy:

```powershell
# Run PowerShell as Administrator and execute:
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or for temporary use in current session:
Set-ExecutionPolicy Bypass -Scope Process
```

### Administrator Privileges

**Important**: Service installation requires Administrator privileges. Always run PowerShell as Administrator for service operations.

## Deployment Process

### Step 1: Developer Side - Create Deployment Bundle

From `C:\PROJECTX\p_chart_web\`:

```powershell
# Create deployment bundle (builds and copies to C:\p_chart_web)
.\deployment\create-deployment-bundle.ps1
```

This script:
- Builds the application
- Removes existing `C:\p_chart_web` directory
- Copies standalone server and all assets to `C:\p_chart_web`
- Includes `.env` file with production configuration
- Copies essential scripts and database schema

### Step 2: Production Side - Deploy

Transfer the `C:\p_chart_web` directory to the production server, then run:

```powershell
# Navigate to production directory
cd C:\p_chart_web

# Deploy (setup database and schema)
.\deploy.ps1
```

### Step 3: Production Side - Install and Start Service

```powershell
# Install as Windows Service (requires Administrator)
.\service-manager.ps1 install

# Start the service
.\service-manager.ps1 start
```

## Production Service Management

**All service commands require Administrator privileges and should be run from `C:\p_chart_web`:**

```powershell
# Install as Windows Service (one-time setup)
.\service-manager.ps1 install

# Start the service
.\service-manager.ps1 start

# Stop the service
.\service-manager.ps1 stop

# Restart the service
.\service-manager.ps1 restart

# Check service status
.\service-manager.ps1 status

# Uninstall service (if needed)
.\service-manager.ps1 uninstall
```

## Manual Service Management

**Basic Windows Service commands (requires Administrator privileges):**

```powershell
# Check service status
Get-Service pchart_service
Get-Service | Where-Object { $_.Name -like "*chart*" }

# Start service
Start-Service pchart_service

# Stop service
Stop-Service pchart_service

# Restart service
Restart-Service pchart_service

# Delete service (if needed)
sc.exe delete pchart_service
```

**Note**: Use the `service-manager.ps1` script for easier management.

## Service Benefits

- **Automatic Startup**: Service starts automatically when Windows boots
- **Auto-Restart**: Automatically restarts if the application crashes
- **Background Operation**: Runs in background without console window
- **System Integration**: Managed through Windows Services console
- **Logging**: Built-in logging and monitoring

## Application Access

- **URL**: http://localhost:3000
- **Location**: C:\p_chart_web
- **Service Name**: pchart_service
- **Server**: Standalone Next.js server (`server.js`)

## Troubleshooting

### Service Issues
1. **Service won't start**: Check Administrator privileges
2. **Service not found**: Run `.\service-manager.ps1 install`
3. **Check service status**: `.\service-manager.ps1 status`
4. **View service logs**: Check Windows Event Viewer

### Database Issues
1. Check PostgreSQL 17 is installed at: `C:\Program Files\PostgreSQL\17\`
2. Check PostgreSQL service is running
3. Verify credentials: postgres/rootroot and pchart_user/pchart_password
4. Run: `.\deployment\setup-postgres.ps1`

### Application Issues
1. Check `server.js` exists in `C:\p_chart_web`
2. Verify `.env` file is present
3. Check port 3000 is available: `netstat -ano | findstr :3000`
4. Run: `.\deployment\prisma.ps1` to verify database schema

### Prisma Issues
1. Run: `.\deployment\prisma.ps1`
2. Check database connection in `.env`

## Files Structure

```
C:\p_chart_web\
├── server.js              # Standalone server
├── .env                   # Production configuration
├── package.json           # Dependencies
├── prisma/                # Database schema
├── .next/                 # Built application
├── public/                # Static assets
├── service-manager.ps1    # Windows Service manager
├── deploy.ps1             # Production deployment
├── start.ps1              # Manual start (development only)
├── stop.ps1               # Manual stop (development only)
├── restart.ps1            # Manual restart (development only)
├── setup-postgres.ps1     # Database setup
└── deployment/
    ├── prisma.ps1              # Quick Prisma operations
    ├── setup-postgres.ps1       # Database setup
    └── load-production-data.ps1 # Load production data
```

## Quick Reference

**Create Bundle**: `.\deployment\create-deployment-bundle.ps1`
**Deploy**: `.\deploy.ps1`  
**Install Service**: `.\service-manager.ps1 install`
**Start Service**: `.\service-manager.ps1 start`
**Stop Service**: `.\service-manager.ps1 stop`
**Status**: `.\service-manager.ps1 status`

## Additional Production Scripts

- `.\restore-production-data.ps1` - Manual data restore
- `.\deployment\prisma.ps1` - Quick schema update
- `.\deployment\load-production-data.ps1` - Load production data
- `.\deployment\setup-postgres.ps1` - Database setup

## Manual Operation (Development Only)

For development/testing purposes only:

```powershell
# Manual start (not recommended for production)
.\start.ps1

# Manual stop (not recommended for production)
.\stop.ps1

# Manual restart (not recommended for production)
.\restart.ps1
```

## Service Configuration

The service is configured with:
- **Auto-restart**: Up to 3 restarts on failure
- **Memory limit**: 4GB maximum
- **Logging**: Rotated logs with growth limit
- **Startup**: Automatic with Windows boot

## Security Notes

- Service runs under Local System account
- Database credentials are in `.env` file
- Application accessible only on localhost:3000
- No external network access by default
