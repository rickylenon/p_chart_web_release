# Master Defect Relation Update Guide

This guide explains how to apply the changes from using `defectName` to `defectId` in the `OperationDefect` model.

## Overview

We're changing how defects are referenced in the `OperationDefect` model from using the defect name (string) to using the defect ID (integer). This provides better data integrity, improves performance, and allows for defect renaming without breaking existing references.

## Implementation Steps

### 1. Database Schema Changes

The migration script `20250405201048_update_defect_relation` performs these changes:

- Adds `defect_id` column to `operation_defects` table
- Updates data to link existing records with the correct defect IDs
- Adds foreign key constraint
- Removes the old `defect_name` column
- Creates a trigger to prevent defect deletion

### 2. Code Updates Required

These files need to be updated to use `defectId` instead of `defectName`:

- `src/pages/api/operation-defects/index.ts`
- `src/pages/api/operation-defect-edit-requests/index.ts`
- `src/pages/api/operation-defect-edit-requests/[id]/resolve.ts`
- `src/pages/api/operation-defect-edit-requests/check.ts`
- `src/components/operation-defects/DefectEditRequestPopover.tsx` 
- `src/pages/production-orders/[poNumber].tsx`
- `src/pages/admin/defect-edit-requests/index.tsx`
- `src/pages/notifications/index.tsx`
- `src/pages/api/dashboard/charts.ts`
- `src/components/audit-logs/AuditLogModal.tsx`

### 3. Implementation Pattern

For each file:

1. Update references from `defectName` to `defectId`
2. Add code to fetch the master defect record if needed
3. Update UI components to display defect name but store defect ID
4. Update database queries to use defect ID for lookups

### 4. Example Updates

#### API Endpoints

```typescript
// BEFORE
const existingDefect = operation.operationDefects.find(od => 
  od.defectName === defect.name
);

// AFTER 
const existingDefect = operation.operationDefects.find(od => 
  od.defectId === defect.id
);
```

#### Create/Update Operations

```typescript
// BEFORE
const newDefect = await tx.operationDefect.create({
  data: {
    operationId: operation.id,
    defectName: defect.name,
    defectCategory: defect.category,
    defectMachine: defect.machine,
    defectReworkable: defect.reworkable,
    // ...other fields
  }
});

// AFTER
const masterDefectRecord = await tx.masterDefect.findUnique({
  where: { id: defect.id }
});

const newDefect = await tx.operationDefect.create({
  data: {
    operationId: operation.id,
    defectId: masterDefectRecord.id,
    defectCategory: masterDefectRecord.category || 'Unknown',
    defectMachine: masterDefectRecord.machine || null,
    defectReworkable: masterDefectRecord.reworkable,
    // ...other fields
  }
});
```

### 5. Migration Process

To safely deploy these changes:

1. Generate a new Prisma client: `npx prisma generate`
2. Apply the migration script to the database
3. Update code files one by one to use `defectId` instead of `defectName`
4. Test each component thoroughly after changes

### 6. Rollback Plan

If issues are encountered:

1. Revert all code changes that use `defectId`
2. Restore the database from backup
3. Revert the Prisma schema changes
4. Generate a new Prisma client

## Important Notes

- Master defects should now never be deleted - they should only be deactivated by setting `isActive` to `false`
- The migration preserves all existing defect relationships
- The trigger in the database will prevent actual deletion of master defect records 

## Recent Updates (April 2025)

### 1. Enhanced Defect Edit Request System

The defect management system has been expanded to support three types of requests:

- **Add Requests**: Adding new defects to an operation
- **Edit Requests**: Modifying existing defect quantities
- **Delete Requests**: Removing defects (handled by setting quantity to zero)

#### Schema Updates

The `OperationDefectEditRequest` model has been updated with:

```typescript
model OperationDefectEditRequest {
  // ... existing fields ...
  requestType      String?   // 'add', 'edit', or 'delete'
  defectId         Int?      // For 'add' requests
  defectName       String?   // For 'add' requests
  defectCategory   String?   // For 'add' requests
}
```

#### New Components

- **DefectAddRequestDialog**: For submitting requests to add new defects
- **PendingDefectRequestsModal**: For viewing and managing pending requests
- **Enhanced DefectEditRequestPopover**: Now supports delete requests

#### UI/UX Improvements

- Inline search functionality for OperationDefectsList
- Status badges for request types
- Improved tracking of edit request status
- Direct navigation to specific requests via URL hashes
- Dark mode support for improved accessibility

### 2. Navigation and User Experience

- Admin links moved from Navigation to UserMenu
- Notifications now link directly to specific requests via URL hash parameters
- Improved status display with timestamps for better request tracking

### 3. Data Structure Improvements

- Added defectName field to OperationDefect model for better data integrity
- Created migration script for defect names
- Enhanced search functionality to filter out existing defects

### 4. Using the Updated System

#### For Operators:

1. To add a defect: Use the "Request Add Defect" button in the Operation Defects list
2. To edit a defect: Click on a defect and modify the quantity
3. To delete a defect: Set the quantity to zero in the edit popover

#### For Administrators:

1. View all requests in the Operation Defects Edit Requests page
2. Filter requests by type (add/edit/delete) and status
3. Navigate directly to specific requests from notification links

All actions generate appropriate notifications to relevant users through the notification system implemented earlier. 