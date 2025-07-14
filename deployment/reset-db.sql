-- P-Chart Web - Database Reset Script
-- WARNING: This script will DELETE ALL DATA and DROP ALL TABLES
-- Use only for development/testing environments or fresh production setups
-- 
-- Purpose: Provides a clean slate for Prisma migrations
-- Run this before: npx prisma migrate deploy
--
-- Author: P-Chart Development Team
-- Version: 1.0

-- Start transaction for safety
BEGIN;

-- Print warning message
\echo '=========================================================='
\echo 'WARNING: RESETTING DATABASE - ALL DATA WILL BE LOST!'
\echo '=========================================================='
\echo ''
\echo 'This script will:'
\echo '  1. Drop all application tables'
\echo '  2. Drop all sequences'
\echo '  3. Clean up any remaining objects'
\echo ''
\echo 'Press Ctrl+C within 5 seconds to cancel...'
\echo ''

-- Give user time to cancel (PostgreSQL will wait for input)
SELECT pg_sleep(5);

\echo 'Proceeding with database reset...'
\echo ''

-- =============================================================================
-- STEP 1: Drop all tables in dependency order
-- =============================================================================

\echo 'Step 1: Dropping application tables...'

-- Drop tables with foreign key dependencies first (child tables)
DROP TABLE IF EXISTS "sessions" CASCADE;
DROP TABLE IF EXISTS "notifications" CASCADE;
DROP TABLE IF EXISTS "audit_logs" CASCADE;
DROP TABLE IF EXISTS "operation_defect_edit_requests" CASCADE;
DROP TABLE IF EXISTS "operation_defects" CASCADE;
DROP TABLE IF EXISTS "operations" CASCADE;
DROP TABLE IF EXISTS "operation_lines" CASCADE;
DROP TABLE IF EXISTS "operation_steps" CASCADE;
DROP TABLE IF EXISTS "production_orders" CASCADE;
DROP TABLE IF EXISTS "master_defects" CASCADE;
DROP TABLE IF EXISTS "standard_costs" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

\echo '  ✓ Application tables dropped'

-- =============================================================================
-- STEP 2: Drop sequences
-- =============================================================================

\echo 'Step 2: Dropping sequences...'

-- Drop all sequences created by the application
DROP SEQUENCE IF EXISTS "users_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "production_orders_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "operations_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "master_defects_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "standard_costs_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "operation_defects_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "operation_defect_edit_requests_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "operation_steps_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "audit_logs_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "sessions_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "operation_lines_id_seq" CASCADE;

\echo '  ✓ Sequences dropped'

-- =============================================================================
-- STEP 3: Drop Prisma migration tracking table
-- =============================================================================

\echo 'Step 3: Dropping Prisma migration tracking...'

-- Drop Prisma migration table (will be recreated by Prisma)
DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;

\echo '  ✓ Prisma migration tracking dropped'

-- =============================================================================
-- STEP 4: Clean up any remaining objects
-- =============================================================================

\echo 'Step 4: Cleaning up remaining objects...'

-- Drop any views that might exist
DROP VIEW IF EXISTS "production_summary" CASCADE;
DROP VIEW IF EXISTS "defect_analysis" CASCADE;
DROP VIEW IF EXISTS "operation_progress" CASCADE;

-- Drop any custom functions that might exist
DROP FUNCTION IF EXISTS "update_updated_at_column"() CASCADE;
DROP FUNCTION IF EXISTS "calculate_defect_cost"() CASCADE;
DROP FUNCTION IF EXISTS "audit_trigger_function"() CASCADE;

-- Drop any custom types that might exist
DROP TYPE IF EXISTS "user_role" CASCADE;
DROP TYPE IF EXISTS "production_status" CASCADE;
DROP TYPE IF EXISTS "defect_category" CASCADE;

\echo '  ✓ Cleanup completed'

-- =============================================================================
-- STEP 5: Verification
-- =============================================================================

\echo 'Step 5: Verifying reset...'

-- Check if any application tables remain
DO $$
DECLARE
    table_count INTEGER;
    table_rec RECORD;
BEGIN
    SELECT COUNT(*)
    INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name NOT LIKE 'pg_%'
    AND table_name NOT LIKE 'sql_%';
    
    IF table_count = 0 THEN
        RAISE NOTICE '  ✓ Database successfully reset - no application tables remain';
    ELSE
        RAISE NOTICE '  ⚠ Warning: % application tables still exist', table_count;
        
        -- List remaining tables
        FOR table_rec IN 
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public'
            AND tablename NOT LIKE 'pg_%'
            AND tablename NOT LIKE 'sql_%'
        LOOP
            RAISE NOTICE '    - %', table_rec.tablename;
        END LOOP;
    END IF;
END $$;

-- Check sequences
DO $$
DECLARE
    seq_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO seq_count
    FROM information_schema.sequences 
    WHERE sequence_schema = 'public';
    
    IF seq_count = 0 THEN
        RAISE NOTICE '  ✓ All sequences removed';
    ELSE
        RAISE NOTICE '  ⚠ Warning: % sequences still exist', seq_count;
    END IF;
END $$;

\echo ''
\echo '=========================================================='
\echo 'DATABASE RESET COMPLETED'
\echo '=========================================================='
\echo ''
\echo 'Next steps:'
\echo '  1. Run: npx prisma migrate deploy'
\echo '  2. Run: npx prisma generate'
\echo '  3. Optionally seed data: npx prisma db seed'
\echo ''
\echo 'The database is now ready for fresh Prisma migrations!'
\echo ''

-- Commit the transaction
COMMIT; 