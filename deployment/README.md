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
# Create standalone deployment bundle (builds and copies to C:\dev\p_chart_web_release by default)
.\deployment\dev-create-standalone-deployment.ps1

# Alternative: Create directly to production directory
.\deployment\dev-create-standalone-deployment.ps1 -dir "C:\p_chart_web"

# Or create minimal update package
.\deployment\dev-create-minimal-update.ps1
```

This script:

- Builds the application
- Copies standalone server and all assets to the target directory
- Includes `.env` file with production configuration
- Copies essential scripts and database schema
- Includes both MySQL and PostgreSQL setup scripts for flexibility

### Step 2: Production Side - Setup Database

**Setup MySQL database**:

```batch
# Setup MySQL database
.\deployment\setup-mysql.bat
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
    ├── setup-mysql.bat              # MySQL database setup
    ├── reset-database-mysql.bat     # MySQL database reset
    ├── dev-create-standalone-deployment.ps1  # Development: Create standalone deployment
    ├── dev-create-minimal-update.ps1 # Development: Create minimal update package
    ├── pull.bat                     # Git pull with cleanup
    ├── pull_setup.md               # Pull setup documentation
    └── README.md                   # This file
```

## Data Migration and Scripts

The application includes various utility scripts for data management:

```bash
# Database testing and diagnostics
node scripts/test-db-connection.ts

# Generate test data for development
node scripts/generate-test-data.ts

# Export/import data between database systems
node scripts/db-data-export-postgres.js   # Export from PostgreSQL
node scripts/db-data-import-to-mysql.js   # Import to MySQL

# Standard costs management
node scripts/seed-standard-costs.ts
```

These scripts handle:

- Complete data export/import with proper type conversions
- JSON field handling for notifications and audit logs
- Decimal precision preservation for costs and financial data
- Date/time format conversions between database systems

## Quick Reference

**Create Standalone Bundle**: `.\deployment\dev-create-standalone-deployment.ps1`
**Create Update Package**: `.\deployment\dev-create-minimal-update.ps1`
**Start Application**: `.\start.bat`
**Stop Application**: `.\stop.bat`
**Restart Application**: `.\restart.bat`
**Setup Auto-start**: `.\setup-autostart.bat`

**Database Setup**: `.\deployment\setup-mysql.bat`
**Database Reset**: `.\deployment\reset-database-mysql.bat`
**Git Pull with Cleanup**: `.\deployment\pull.bat`

## Additional Production Scripts

- `.\deployment\setup-mysql.bat` - MySQL database setup
- `.\deployment\reset-database-mysql.bat` - MySQL database reset
- `.\deployment\pull.bat` - Git pull with automatic cleanup
- `.\scripts\test-db-connection.ts` - Database connection testing
- `.\scripts\generate-test-data.ts` - Generate test data for development
- `.\scripts\db-data-export-postgres.js` - Export data from PostgreSQL
- `.\scripts\db-data-import-to-mysql.js` - Import data to MySQL
- `.\scripts\seed-standard-costs.ts` - Standard costs management

## Security Notes

- Database credentials are hardcoded in deployment scripts for consistency
- Application accessible only on localhost:3000
- No external network access by default
- Use appropriate firewall rules for production environments

## Git Ignore Management

The deployment process automatically manages `.gitignore` patterns for the release repository:

### .gitignore-release Conversion

**Development Repository (`C:\dev\p_chart_web`)**:

- Uses `.gitignore` (excludes `node_modules` for dev environment)
- Contains `.gitignore-release` (template for release repository)

**Release Repository (`C:\dev\p_chart_web_release`)**:

- Uses `.gitignore` (converted from `.gitignore-release`)
- Includes `node_modules` in the repository for production deployment

**Conversion Process**:

1. `dev-create-standalone-deployment.ps1` reads `.gitignore-release`
2. Copies content to `.gitignore` in the release directory
3. If `.gitignore-release` is missing, creates a default `.gitignore`

**Key Differences**:

- **Development `.gitignore`**: Excludes `node_modules/` (for npm install)
- **Release `.gitignore`**: Includes `node_modules/` (for restricted production servers)

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

## MySQL Service Management

### MySQL Service Commands

Common MySQL service management commands:

```cmd
# Start MySQL service
net start mysql80

# Stop MySQL service
net stop mysql80

# Check MySQL service status
sc query mysql80

# Set MySQL service to start automatically
sc config mysql80 start= auto

# Set MySQL service to manual start
sc config mysql80 start= demand
```

### MySQL Connection Testing

Test MySQL connectivity:

```cmd
# Test connection with root user
mysql -u root -p

# Test connection with application user
mysql -u pchart_user -p pchart_web
```
