# Neon Database Backup and Restore Guide

This document outlines the procedures for backing up and restoring our Neon PostgreSQL database. Neon is our production database service with connection details managed securely.

## Prerequisites

- PostgreSQL client tools installed locally
- Appropriate database connection credentials
- PostgreSQL version compatibility (client version must match or be compatible with server version)

## Database Connection Information

Our Neon database uses the following connection parameters:

```
# Recommended for most uses (pooled connection)
DATABASE_URL=postgres://neondb_owner:<password>@ep-green-poetry-a109oi3r-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require

# For unpooled connection (required for backup/restore operations)
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:<password>@ep-green-poetry-a109oi3r.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

> **IMPORTANT:** Always use the **unpooled** connection for backup and restore operations.

## Backing Up the Database

Neon supports standard PostgreSQL backup procedures using `pg_dump`:

1. Check that pg_dump version matches the Neon server version:

   ```bash
   pg_dump -V
   ```

   > **Note:** If your local pg_dump version doesn't match Neon's PostgreSQL version, you'll need to install the matching version.

2. For macOS users with Homebrew, install matching PostgreSQL version:

   ```bash
   # Example for PostgreSQL 17
   brew install postgresql@17

   # Find the binary location
   brew --prefix postgresql@17
   ```

3. Perform the backup using the unpooled connection string:

   ```bash
   /path/to/matching/postgresql/bin/pg_dump -Fc -v -d "postgresql://neondb_owner:<password>@ep-green-poetry-a109oi3r.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" -f neondb_backup.bak
   ```

   Options explained:

   - `-Fc`: Use custom format (best for restoration)
   - `-v`: Verbose mode
   - `-d`: Database connection string
   - `-f`: Output file

## Restoring the Database

### Restore to Neon (Production)

To restore a backup to Neon:

1. Use the pg_restore tool with the matching PostgreSQL version:

   ```bash
   /path/to/matching/postgresql/bin/pg_restore -v -d "postgresql://neondb_owner:<password>@ep-green-poetry-a109oi3r.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" neondb_backup.bak
   ```

   > **WARNING:** Be extremely cautious when restoring to production. This will overwrite existing data.

### Restore to Local Database

To restore a backup to a local PostgreSQL database:

1. Create a new local database:

   ```bash
   createdb pchart_db_neon
   ```

2. Restore the backup using pg_restore:

   ```bash
   /path/to/matching/postgresql/bin/pg_restore -v -c -O --no-owner -d "postgres://localhost:5432/pchart_db_neon" neondb_backup.bak
   ```

   Options explained:

   - `-v`: Verbose mode
   - `-c`: Clean (drop) database objects before recreating
   - `-O`: No owner (skips restoration of object ownership)
   - `--no-owner`: Prevents ownership commands that would fail locally
   - `-d`: Target connection string

3. If you encounter errors about roles or parameters, these can typically be ignored as they're related to Neon-specific configurations.

## Common Issues and Solutions

### Version Mismatch

**Error:**

```
pg_dump: error: aborting because of server version mismatch
pg_dump: detail: server version: 17.4; pg_dump version: 15.12 (Homebrew)
```

**Solution:**
Install the matching PostgreSQL version and use its binaries for backup/restore.

### Role Doesn't Exist

**Error:**

```
ERROR: role "neon_superuser" does not exist
```

**Solution:**
This error can be ignored for local restores. It's related to Neon-specific roles that aren't needed locally.

### Transaction Timeout Parameter

**Error:**

```
ERROR: unrecognized configuration parameter "transaction_timeout"
```

**Solution:**
This error can be ignored for local restores. It's a Neon-specific parameter.

## Scheduled Backups

Consider setting up scheduled backups using cron or a CI/CD pipeline:

```bash
# Example cron job for daily backups at 2 AM
0 2 * * * /path/to/matching/postgresql/bin/pg_dump -Fc -d "postgresql://neondb_owner:<password>@ep-green-poetry-a109oi3r.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" -f /backup/neondb_$(date +\%Y\%m\%d).bak
```

## Security Considerations

- Never store database credentials in version control
- Use environment variables or secrets management for credentials
- Encrypt backup files if they contain sensitive data
- Implement proper access controls for backup files

## Additional Resources

- [Neon Documentation: Backup with pg_dump](https://neon.tech/docs/manage/backup-pg-dump)
- [PostgreSQL Documentation: pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
- [PostgreSQL Documentation: pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html)
