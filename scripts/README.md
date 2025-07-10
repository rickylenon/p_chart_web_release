# P-Chart Scripts

This directory contains utility scripts for managing the P-Chart application.

## ⚠️ IMPORTANT: Data Management Policy

**As of the latest update, automatic seeding and production data loading have been REMOVED from all deployment scripts for data safety.**

### ✅ SAFE Data Management

**ONLY use `production-data-import.js` for data synchronization:**

```bash
# Import production data from SQL file to local database
node scripts/production-data-import.js

# Force reset and import (use with caution)
node scripts/production-data-import.js --force-reset
```

### ❌ DEPRECATED (Removed for Safety)

- ~~`npx prisma db seed`~~ - Can overwrite production data
- ~~Automatic production data loading~~ - Removed from deployment scripts
- ~~Manual SQL imports~~ - Can cause foreign key conflicts

## Script Descriptions

### `production-data-import.js` ⭐ **PRIMARY DATA SCRIPT**

**Purpose:** Safely synchronize production data from NeonDB to local database

**Features:**

- ✅ Transaction-based clearing to prevent partial failures
- ✅ Proper foreign key dependency handling
- ✅ Force reset capability to handle concurrent processes
- ✅ Comprehensive logging and error handling
- ✅ Sequence reset after data import

### `seed-standard-costs.ts` 💰 **STANDARD COSTS SEEDING**

**Purpose:** Load standard cost data from CSV and update production orders with cost information

**Features:**

- ✅ Upsert functionality (no duplicates on re-run)
- ✅ Updates production orders with cost information
- ✅ Calculates defect costs for operations
- ✅ Comprehensive logging and error handling

**Usage:**

```bash
# Seed standard costs from CSV
npm run seed-standard-costs

# Or run directly
npx ts-node scripts/seed-standard-costs.ts
```

**Note:** This script should be run after deployment and data sync to ensure production orders have cost information.

**Usage:**

```bash
# Sync all production data (recommended)
node scripts/production-data-import.js

# Force reset and sync (clears all data first)
node scripts/production-data-import.js --force-reset
```

## Generate Test Data

The `generate-test-data.ts` script creates sample production orders, operations, and master defects with various dates to help test dashboard charts, filters, and production order listings.

### What it Creates

- **Production Orders**: Creates 20 production orders (configurable) with random items and quantities
- **Operations**: Generates operations for each production order with sequential dates
- **Operation Defects**: Adds varied defects to operations with different rates (low, medium, high)
  - Every operation is guaranteed to have at least some defects
  - Each operation can have 1-4 different defect types with random quantities

### Prerequisites

Before running the script, make sure:

1. You have run the database migrations and seed script first (`npx prisma db push` and `npx prisma db seed`)
2. The database has operation steps and master defects defined
3. There is at least one user in the system

### Usage

Run the script using npm:

```bash
npm run generate:test-data
```

Or run directly with ts-node:

```bash
npx ts-node scripts/generate-test-data.ts
```

### Configuration

You can modify these variables at the top of the script to customize the generated data:

- `NUM_PRODUCTION_ORDERS`: Number of production orders to create (default: 20)
- `DATE_RANGE_DAYS`: Generate data spread over this many days in the past (default: 30)
- `DEFECT_RATES`: Define different defect rate tiers (low, medium, high)
- `MIN_DEFECTS_PER_OPERATION`: Minimum number of defects for any operation (default: 1)
- `MAX_DEFECT_TYPES_PER_OPERATION`: Maximum number of different defect types per operation (default: 4)

### Sample Output

The script will output progress logs as it generates data:

```
Starting test data generation...
Found 5 operation steps
Found 573 master defects
Found 2 users
Creating PO: PO-20240305-001, Item: Precision Bearing, Quantity: 500
Created production order ID: 1
Creating operation OP10 with input: 500, output: 450, defects: 50
Created operation ID: 1
Creating defect: Scratch, Qty: 20, Rework: 15, NoGood: 5
...
```

After running the script, you should be able to see the generated data in the dashboard charts and production order listings.

## Generate Test Notifications

The `generate-test-notifications.ts` script creates sample notifications of different types for users in the system, which helps test the notification UI, WebSocket connections, and user experience.

### What it Creates

- **System Notifications**: Application-wide announcements and alerts
- **Message Notifications**: User-to-user communication notices
- **Defect Edit Notifications**: Alerts about changes to defects

For each notification type, the script uses predefined templates with different titles and messages. It randomly assigns notifications to users in the system and optionally includes additional metadata.

### Prerequisites

Before running the script, make sure:

1. You have run the database migrations and seed script first
2. There is at least one user in the system
3. The dotenv package is installed (`npm install dotenv --save`)

### Usage

Run the script using npm:

```bash
npm run generate:test-notifications
```

Or run directly with ts-node:

```bash
npx ts-node scripts/generate-test-notifications.ts
```

### WebSocket Integration

The script attempts to connect to the Socket.IO server if running in a development environment. If the server is not available (which is normal when running the script outside of the Next.js server context), it will still create the notifications in the database but will not emit WebSocket events.

To see real-time notifications:

1. Run the Next.js development server (`npm run dev`)
2. Open the Notification Test Console at `/socket-demo`
3. In another terminal, run the notification generator script

### Sample Output

The script will output progress logs as it generates data:

```
Starting test notification generation...
Found 3 users for notification generation.
Will generate 8 notifications...
Creating system notification for user 2: System Maintenance
Skipping WebSocket event emission (Socket.IO not available)
Creating message notification for user 1: New Message from Admin
Skipping WebSocket event emission (Socket.IO not available)
...
Successfully generated 8 test notifications.
```

After running the script, you should be able to see the generated notifications in the Notification Test Console and the main notifications page.

## OP10 Replacement Quantity Migration

The `update-op10-replacement-qty.js` script updates all existing OP10 operation defects to set their `quantityReplacement` equal to their `quantity` when `quantityReplacement` is 0 or null.

### Running the script

1. Make sure you have the correct database connection string in your `.env` file
2. Run the script using:

```bash
node scripts/update-op10-replacement-qty.js
```

This script is idempotent and can be run multiple times safely. It will only update defect records that haven't been migrated yet.
