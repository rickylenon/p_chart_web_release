# Defect Edit Request System

## Overview

The P-Chart application includes a comprehensive defect edit request system that enables users to propose changes to operation defects while maintaining data integrity through an approval workflow. This document explains how the defect edit request system works, including the recent enhancements (April 2025).

The system now supports replacement quantities for OP10 operations, which offset defects by adding back to the output quantity. This feature allows for accurate tracking of replaced components in the OP10 process.

## System Components

### Request Types

The system now supports three types of defect edit requests:

1. **Add Requests**: Request to add a new defect to an operation
2. **Edit Requests**: Request to modify the quantity of an existing defect
3. **Delete Requests**: Request to remove a defect (implemented by setting quantity to zero)

### Database Structure

The `OperationDefectEditRequest` model stores all defect edit requests:

```typescript
model OperationDefectEditRequest {
  id                   Int              @id @default(autoincrement())
  operationDefectId    Int? // Make optional for "add" requests
  operationId          Int
  productionOrderId    Int
  requestedById        Int
  requestType          String           @default("edit") // "add", "edit", or "delete"
  defectId             Int? // Store master defect ID for "add" requests
  defectName           String? // Store defect name for "add" requests
  defectCategory       String? // Store category for "add" requests
  defectReworkable     Boolean? // Store reworkable for "add" requests
  defectMachine        String? // Store machine for "add" requests
  currentQty           Int
  currentRw            Int
  currentNg            Int
  currentReplacement   Int              @default(0) // Current replacement value for OP10
  requestedQty         Int
  requestedRw          Int
  requestedNg          Int
  requestedReplacement Int              @default(0) // Requested replacement value for OP10
  operationCode        String? // To identify OP10 operations
  reason               String
  status               String           @default("pending") // "pending", "approved", "rejected"
  resolvedById         Int?
  resolutionNote       String?
  createdAt            DateTime         @default(now())
  resolvedAt           DateTime?
  // Relations omitted for brevity
}
```

### UI Components

The system includes several specialized components:

- **DefectEditRequestPopover** (`src/components/operation-defects/DefectEditRequestPopover.tsx`):
  Handles edit and delete requests for existing defects, including replacement quantities for OP10 operations.

- **DefectAddRequestDialog** (`src/components/operation-defects/DefectAddRequestDialog.tsx`):
  Dedicated component for adding new defects to an operation, with support for replacement quantities in OP10.

- **PendingDefectRequestsModal** (`src/components/operation-defects/PendingDefectRequestsModal.tsx`):
  Displays pending requests for a specific operation, showing all quantity values (including RP for OP10) and allowing admins to review and take action.

- **OperationDefectsEditRequestsPage** (`src/pages/operation-defects-edit-requests/index.tsx`):
  Administrative interface for managing all edit requests, with detailed views that include replacement quantities for OP10 operations.

## Request Workflow

### Creating Requests

#### Add Request:

1. User clicks 'Add Defect' button in the Production Order UI
2. DefectAddRequestDialog opens
3. User selects defect code and enters quantity
4. For OP10 operations, the Replacement (RP) field is displayed and automatically matches the quantity field
5. User submits form
6. System creates a request with type 'add' and status 'pending'
7. Notification is sent to admin users

#### Edit Request:

1. User clicks on a defect in the Operation Defects list
2. DefectEditRequestPopover opens showing current quantity
3. User enters new quantity and optional notes
4. For OP10 operations, the Replacement (RP) field is displayed and automatically updates when the main quantity changes
   - The RP field allows tracking of replaced components in OP10
   - By default, the RP value matches the defect quantity, but can be modified as needed
   - The system enforces that RP cannot exceed the defect quantity
5. User provides a reason for the edit in the notes field
6. User clicks 'Submit' to create the request
7. System creates a request with type 'edit' and status 'pending'
8. Notification is sent to admin users

#### Delete Request:

1. User clicks on a defect in the Operation Defects list
2. DefectEditRequestPopover opens showing current quantity
3. User clicks 'Delete' button
4. System creates a request with type 'delete' and status 'pending'
5. Any associated replacement quantities (for OP10) are also deleted when the request is approved
6. Notification is sent to admin users

### Reviewing Requests

Administrators can review requests through:

1. **PendingDefectRequestsModal**: Shows pending requests for a specific operation
2. **OperationDefectsEditRequestsPage**: Shows all requests with filtering options

The review interface displays:

- Request type and status with color-coded badges
- Original and requested quantities
- Timestamps for request creation and resolution
- Requester information
- Notes from the requester

### Resolving Requests

Administrators can:

1. Approve the request, which applies the changes to the database
2. Reject the request, which keeps the original data intact
3. Add resolution notes explaining the decision

Upon resolution:

1. The request status is updated to 'approved' or 'rejected'
2. Resolution timestamp and resolver information are recorded
3. A notification is sent to the requester
4. If approved, the defect data is updated accordingly

## Navigation and Access

### Direct Navigation

The system supports direct navigation to specific requests:

- Notifications include a hash parameter in the URL that points to the specific request
- When a URL with a hash is loaded, the system scrolls to the specific request
- Example: `/operation-defects-edit-requests#request-123`

### Access Control

- Regular users can create edit requests but cannot approve them
- Admins have full access to review and resolve requests
- The user interface adapts based on the user's role

## Implementation Details

### Real-time Notifications

The system leverages the notification system to:

- Alert admins when new requests are created
- Notify requesters when their requests are resolved
- Update notification counts in the UI

### Search Functionality

- The DefectAddRequestDialog includes a search feature to find master defects
- The OperationDefectsList has inline search to filter defects by name, category, or machine
- The system prevents duplicates by filtering out existing defects when adding new ones

### Dark Mode Support

All components have been updated with dark mode support for better accessibility and user experience.

## Best Practices

1. **Adding New Defects**:

   - Check if the defect already exists in the operation
   - Use the search functionality to find the correct master defect

2. **Editing Defects**:

   - Provide clear notes explaining the reason for the change
   - Use delete requests (quantity zero) only when the defect should be completely removed

3. **Reviewing Requests**:
   - Review the complete context including operation details
   - Provide detailed resolution notes to help users understand decisions
   - Process requests promptly to maintain workflow efficiency

## Troubleshooting

Common issues:

1. **Request not appearing in real-time**:

   - Check notification system connectivity
   - Refresh the page to fetch the latest requests

2. **Unable to create a request**:

   - Verify user permissions
   - Check for validation errors in the console
   - Ensure the operation is not locked or in a terminal status

3. **Request appears stuck in pending**:
   - Check that admin users have been notified
   - Verify database connectivity
   - Check for errors in the server logs
