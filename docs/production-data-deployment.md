# Production Data Deployment Guide

This guide explains how to deploy P-Chart Web with production data from NeonDB to an offline production server.

## 📋 Overview

The production data deployment process involves:

1. **Developer Machine** (with internet): Sync data from NeonDB → Export to SQL → Create deployment bundle
2. **Production Server** (offline): Deploy bundle → Automatically load production data

## 🔄 Complete Workflow

### Phase 1: Developer Machine (Internet Required)

#### Step 1: Sync Production Data from NeonDB
```bash
# Sync data from NeonDB to local PostgreSQL database
node scripts/production-data-import.js
```

This script:
- Connects to both NeonDB (cloud) and local PostgreSQL
- Syncs all tables: users, master_defects, production_orders, operations, etc.
- Uses upsert operations (insert new, update existing)
- Handles foreign key dependencies correctly

#### Step 2: Export and Bundle (Automated)
```bash
# One command to export data and create deployment bundle
node scripts/export-and-bundle.js
```

**OR manually:**
```bash
# Export production data to SQL file
node scripts/production-data-export.js

# Create deployment bundle (includes the SQL file)
powershell -ExecutionPolicy Bypass -File deployment/create-deployment-bundle.ps1
```

#### Step 3: Transfer Bundle
Transfer the created ZIP bundle to production server via:
- USB drive
- Network share  
- Physical media
- Secure file transfer

### Phase 2: Production Server (Offline)

#### Step 4: Deploy with Production Data
```powershell
# Extract bundle
Expand-Archive -Path "pchart-web-deployment-*.zip" -DestinationPath "C:\pchart-web"
cd C:\pchart-web\deployment

# Deploy application (automatically loads production data)
.\deploy-offline.ps1
```

The deployment script automatically:
- Creates PostgreSQL database
- Runs migrations
- **Loads production data from `data/production-data-latest.sql`**
- Configures application
- Starts services

## 📁 Files Created

### On Developer Machine
- `data/production-data-latest.sql` - Exported production data
- `pchart-web-deployment-YYYYMMDD.zip` - Complete deployment bundle

### In Deployment Bundle
```
pchart-web-deployment/
├── data/
│   └── production-data-latest.sql    # Production data export
├── deployment/
│   └── deploy-offline.ps1           # Auto-loads production data
├── .next/                           # Built application
├── src/                             # Source code
├── prisma/                          # Database schema
├── node_modules/                    # Dependencies
└── package.json                     # Configuration
```

## 🛠️ Scripts Reference

### Developer Scripts
- `scripts/production-data-import.js` - Sync from NeonDB to local DB
- `scripts/production-data-export.js` - Export local DB to SQL file
- `scripts/export-and-bundle.js` - Complete workflow automation

### Deployment Scripts  
- `deployment/deploy-offline.ps1` - Deploy with automatic data loading
- `deployment/create-deployment-bundle.ps1` - Create deployment bundle

## 📊 Data Exported

The production data export includes all tables:

### Core Data
- **Users** - User accounts, roles, permissions
- **Master Defects** - Defect definitions, categories
- **Standard Costs** - Item costs, pricing data

### Production Data
- **Production Orders** - PO numbers, quantities, status
- **Operations** - Manufacturing operations, times
- **Operation Defects** - Defect records, quantities

### System Data
- **Operation Steps** - Process steps, workflows  
- **Operation Lines** - Line assignments
- **Edit Requests** - Pending change requests
- **Notifications** - System notifications
- **Audit Logs** - Change history
- **Sessions** - User sessions

## 🔧 Technical Details

### Export Process
- Uses PostgreSQL's `INSERT ... ON CONFLICT DO UPDATE` for upserts
- Maintains referential integrity with proper dependency order
- Handles NULL values, JSON data, timestamps correctly
- Resets sequence counters for proper ID generation

### Import Process
- Runs automatically during `deploy-offline.ps1`
- Located after database migrations, before app start
- Uses PostgreSQL `psql` command for reliable import
- Gracefully handles existing data (upsert behavior)

### Error Handling
- Export continues on individual record failures
- Import warnings are normal for existing data
- Both processes log detailed information
- Rollback capability with transactions

## 🚨 Troubleshooting

### Common Issues

#### "No production data file found"
- **Cause**: `data/production-data-latest.sql` not in bundle
- **Solution**: Re-run `export-and-bundle.js` or manually copy file

#### "Production data loading failed"
- **Cause**: Database connection or SQL syntax issues
- **Check**: PostgreSQL service running, proper credentials
- **Note**: Warnings are normal for existing data

#### "Export file is empty"
- **Cause**: Local database has no data to export
- **Solution**: Run `production-data-import.js` first

### Verification Commands

```powershell
# Check if production data file exists
Test-Path "C:\pchart-web\data\production-data-latest.sql"

# Check file size (should be > 0 MB)  
(Get-Item "C:\pchart-web\data\production-data-latest.sql").Length / 1MB

# Check database has data after deployment
psql -h localhost -U pchart_user -d pchart_web -c "SELECT COUNT(*) FROM users;"
```

## ⚡ Performance Notes

### Export Performance
- Large databases (>10GB): 5-15 minutes
- Medium databases (1-10GB): 1-5 minutes  
- Small databases (<1GB): <1 minute

### Import Performance
- Generally faster than export
- Uses batch INSERT operations
- PostgreSQL optimized for bulk imports

### Bundle Size
- Typical bundle: 200MB - 1GB
- Production data: 10MB - 500MB
- Node modules: ~200MB
- Built application: ~50MB

## 🔒 Security Considerations

- **Passwords**: Encrypted in export, secure in transit
- **Sensitive Data**: Review exported SQL before deployment
- **Access Control**: Limit bundle access to authorized personnel
- **Network**: Use secure transfer methods for bundles

## ✅ Success Indicators

### Developer Phase
- [ ] Sync completed without errors
- [ ] Export file created with reasonable size
- [ ] Bundle created with all components  
- [ ] Bundle transferred to production

### Production Phase
- [ ] Bundle extracted successfully
- [ ] Database migrations completed
- [ ] Production data loaded (check logs)
- [ ] Application starts and accessible
- [ ] Data visible in application UI

## 📞 Support

When requesting support, provide:
1. **Log files** from both sync and export processes  
2. **File sizes** of export and bundle
3. **Error messages** with full context
4. **Environment details** (DB versions, Node.js version)

The production data deployment system ensures your offline production server gets the same data as your cloud environment, enabling seamless operation without internet connectivity. 