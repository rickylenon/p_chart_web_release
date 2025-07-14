# P-Chart Web - Production Deployment Guide

This guide covers the production deployment process for P-Chart Web application.

## Overview

**Developer Side**: `C:\dev\p_chart_web\` - Source code (runs `npm run dev`)
**Developer Side Production Release**: `C:\dev\p_chart_web_release\` - Deployed application ready to ship to production
**Production Side**: `C:\p_chart_web\` - Deployed application

## Fixed Credentials

**MySQL**:

- Root user: `root`, password: `rootroot`
- App user: `pchart_user`, password: `pchart_password`
- Database: `pchart_web`

**PostgreSQL** (Legacy - for migration reference):

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

**Important**: Database setup requires Administrator privileges. Always run PowerShell as Administrator for database operations.

## Deployment Process

### Step 1: Developer Side - Create Deployment Bundle

From `C:\dev\p_chart_web\`:

```powershell
# Create deployment bundle (builds and copies to C:\dev\p_chart_web_release by default)
.\deployment\create-deployment-full.ps1

# Alternative: Create directly to production directory
.\deployment\create-deployment-full.ps1 -dir "C:\p_chart_web"
```

This script:

- Builds the application
- Copies standalone server and all assets to the target directory
- Includes `.env` file with production configuration
- Copies essential scripts and database schema
- Includes both MySQL and PostgreSQL setup scripts for flexibility

### Step 2: Production Side - Setup Database

Choose your database system:

**For MySQL (Recommended)**:

```batch
# Setup MySQL database
.\deployment\setup-mysql.bat
```

**For PostgreSQL (Legacy)**:

```powershell
# Setup PostgreSQL database
.\deployment\setup-postgres.ps1
```

### Step 3: Production Side - Deploy Application

Transfer the release directory to the production server, then run:

```cmd
# Navigate to production directory
cd C:\p_chart_web

# Setup database and schema using deployment scripts
# (Follow the database setup instructions in deployment/README.md)

# Start the application
.\start.bat
```

### Step 4: Production Side - Start Application

```batch
# Start the application
.\start.bat
```

## Production Application Management

**Application management commands should be run from `C:\p_chart_web`:**

```batch
# Start the application
.\start.bat

# Stop the application
.\stop.bat

# Restart the application
.\restart.bat
```

## Application Access

- **URL**: http://localhost:3000
- **Location**: C:\p_chart_web
- **Server**: Standalone Next.js server (`server.js`)

## Troubleshooting

### Application Issues

1. **Application won't start**: Check if port 3000 is available
2. **Check running processes**: `netstat -ano | findstr :3000`
3. **Stop application**: `.\stop.bat`
4. **Restart application**: `.\restart.bat`

### Database Issues

**For MySQL**:

1. Check MySQL Server is installed and running
2. Check MySQL service is running (services.msc)
3. Verify credentials: root/rootroot and pchart_user/pchart_password
4. Run: `.\deployment\setup-mysql.bat`

**For PostgreSQL (Legacy)**:

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
├── scripts/               # Data migration scripts
├── .next/                 # Built application
├── public/                # Static assets
├── start.bat              # Start application
├── stop.bat               # Stop application
├── restart.bat            # Restart application
├── setup-autostart.bat    # Auto-start configuration
└── deployment/
    ├── setup-mysql.bat         # MySQL database setup
    ├── reset-database-mysql.bat # MySQL database reset
    ├── setup-postgres.ps1      # PostgreSQL database setup (legacy)
    ├── reset-database.ps1      # PostgreSQL database reset (legacy)
    ├── prisma.ps1              # Quick Prisma operations
    └── README.md               # This file
```

## Data Migration (PostgreSQL to MySQL)

If you're migrating from PostgreSQL to MySQL, use the provided migration scripts:

```bash
# 1. Export data from PostgreSQL
node scripts/db-data-export-postgres.js

# 2. Import data to MySQL
node scripts/db-data-import-to-mysql.js
```

These scripts handle:

- Complete data export/import with proper type conversions
- JSON field handling for notifications and audit logs
- Decimal precision preservation for costs and financial data
- Date/time format conversions between database systems

## Quick Reference

**Create Bundle**: `.\deployment\create-deployment-full.ps1`
**Start Application**: `.\start.bat`
**Stop Application**: `.\stop.bat`
**Restart Application**: `.\restart.bat`
**Setup Auto-start**: `.\setup-autostart.bat`

**Database Setup (MySQL)**: `.\deployment\setup-mysql.bat`
**Database Setup (PostgreSQL)**: `.\deployment\setup-postgres.ps1`
**Database Reset (MySQL)**: `.\deployment\reset-database-mysql.bat`
**Database Reset (PostgreSQL)**: `.\deployment\reset-database.ps1`

## Additional Production Scripts

- `.\deployment\setup-mysql.bat` - MySQL database setup
- `.\deployment\reset-database-mysql.bat` - MySQL database reset
- `.\deployment\setup-postgres.ps1` - PostgreSQL database setup (legacy)
- `.\deployment\reset-database.ps1` - PostgreSQL database reset (legacy)
- `.\deployment\prisma.ps1` - Quick schema update
- `.\scripts\db-data-export-postgres.js` - Export data from PostgreSQL
- `.\scripts\db-data-import-to-mysql.js` - Import data to MySQL

## Security Notes

- Database credentials are hardcoded in deployment scripts for consistency
- Application accessible only on localhost:3000
- No external network access by default
- Use appropriate firewall rules for production environments

## Git Ignore Management

The deployment process automatically manages `.gitignore` patterns for production:

### Automatic Management

- `.gitignore-release` from development is copied to `.gitignore` during deployment
- `pull.bat` automatically applies updated ignore patterns and cleans up tracked files
- Common sensitive files are automatically removed from git tracking
- **Production never commits changes** - files are removed from tracking locally only

### Files Automatically Cleaned Up

When pulling updates, these file patterns are automatically removed from git tracking:

- `.env*` - Environment files
- `data/` - Production data directory
- `logs/` - Log files and directories
- `*.log` - Individual log files
- `tmp/`, `temp/` - Temporary directories
- `production-data*.sql` - Database exports
- `*.backup`, `*.bak` - Backup files
- `.eslintcache` - Cache files

### Manual Cleanup (if needed)

For files not automatically handled, use these commands:

```cmd
REM Remove specific file from tracking
git rm --cached <filename>

REM Remove directory from tracking
git rm --cached -r <directory>/

REM Remove pattern from tracking
git rm --cached <pattern>

REM Reset staged changes (don't commit in production)
git reset HEAD

REM Discard any local changes to keep production clean
git checkout -- .
```

### Important Notes

- Files are removed from git tracking but remain on disk
- Changes to `.gitignore-release` in development automatically propagate to production
- Manual cleanup is only needed for uncommon file patterns
- Always test ignore patterns in development before deploying
- **Production is read-only**: No local commits are created (can't push anyway)
- Production stays in clean state - no local changes or commits
