# Production Order Locking System

## Overview

The Production Order Locking System provides a centralized, atomic mechanism to prevent concurrent editing of production orders. This ensures data integrity by allowing only one user at a time to edit a specific production order.

## Purpose

- Prevent race conditions where multiple users edit the same production order simultaneously
- Clearly communicate to users when a resource is being edited by someone else
- Provide admin tools to override locks when necessary
- Maintain data integrity across the system

## Architecture

### Database Structure

The locking system utilizes existing fields in the `ProductionOrder` table:

| Field           | Type      | Description                           |
|-----------------|-----------|---------------------------------------|
| editingUserId   | Integer   | ID of the user who has the lock       |
| editingUserName | String    | Display name of the user with the lock|
| lockedAt        | DateTime  | When the lock was acquired            |

### Core Principles

1. **Explicit Lock Acquisition** - Locks must be explicitly requested before data access
2. **Persistent Locks** - Locks remain until explicitly released; no automatic expiration
3. **Owner Recognition** - System recognizes when the lock owner returns to the page
4. **Admin Override** - Admins can force-release locked resources
5. **Atomic Operations** - Database transactions prevent race conditions

## API Endpoints

### Acquire Lock

Attempts to acquire a lock on a resource. If the user already owns the lock, returns success.

```
POST /api/locks/acquire
```

**Request Body:**
```json
{
  "resourceType": "productionOrder",
  "resourceId": "PO12345"
}
```

**Successful Response (200 OK):**
```json
{
  "success": true,
  "isOwner": true,
  "lockInfo": {
    "userId": 123,
    "userName": "John Doe",
    "lockedAt": "2023-05-10T14:30:00Z"
  }
}
```

**Resource Already Locked (423 Locked):**
```json
{
  "success": false,
  "isOwner": false,
  "lockInfo": {
    "userId": 456,
    "userName": "Jane Smith",
    "lockedAt": "2023-05-10T13:45:00Z"
  }
}
```

### Release Lock

Releases a lock on a resource. Only the lock owner can release the lock unless using the admin force-release endpoint.

```
POST /api/locks/release
```

**Request Body:**
```json
{
  "resourceType": "productionOrder",
  "resourceId": "PO12345"
}
```

**Successful Response (200 OK):**
```json
{
  "success": true
}
```

**Not Lock Owner (403 Forbidden):**
```json
{
  "success": false,
  "error": "You do not own this lock"
}
```

### Force Release Lock (Admin Only)

Allows an admin to release any lock regardless of ownership.

```
POST /api/locks/force-release
```

**Request Body:**
```json
{
  "resourceType": "productionOrder",
  "resourceId": "PO12345"
}
```

**Successful Response (200 OK):**
```json
{
  "success": true
}
```

**Not Admin (403 Forbidden):**
```json
{
  "success": false,
  "error": "Admin permissions required"
}
```

### Check Lock Status

Checks if a resource is locked and returns lock details.

```
GET /api/locks/status?resourceType=productionOrder&resourceId=PO12345
```

**Response (200 OK):**
```json
{
  "isLocked": true,
  "isOwner": false,
  "lockInfo": {
    "userId": 456,
    "userName": "Jane Smith",
    "lockedAt": "2023-05-10T13:45:00Z"
  }
}
```

## User Flows

### Opening a Production Order

1. User navigates to a production order details page
2. System attempts to acquire a lock before loading order details
3. If lock acquisition succeeds OR user already owns the lock:
   - Show production order details with editing capabilities
   - Display "Release Lock" button in the UI
4. If lock acquisition fails (someone else has the lock):
   - Show locked view with information about who has the lock
   - If user is admin, show "Force Release Lock" button

### Editing a Production Order

1. User makes changes to the production order
2. Changes are saved normally through existing APIs
3. Lock remains in place until explicitly released

### Releasing a Lock

1. Lock owner clicks "Release Lock" button on details page
2. System releases the lock
3. User is redirected to the production orders list page

### Force Releasing a Lock (Admin)

1. Admin views the locked resource page
2. Admin clicks "Force Release Lock" button
3. System releases the lock regardless of ownership
4. Admin can now acquire the lock and edit the resource

## UI Components

### Details Page Header

- Visual indicator showing the user has the lock
- "Release Lock" button for the lock owner
- User information and lock acquisition time

### Locked View Page

- Clear message indicating the resource is locked
- Information about who has the lock and when it was acquired
- "Force Release Lock" button for admins
- "Back to List" button for all users

## Implementation Guidelines

### Client-Side Implementation

1. Always acquire lock before attempting to show or edit resource details
2. Handle lock acquisition failure by showing locked view
3. Check for current user's ownership when encountering a locked resource
4. Provide clear UI feedback about lock status

### Server-Side Implementation

1. Use database transactions for all lock operations
2. Validate user permissions before allowing lock operations
3. Ensure lock checks happen on every data modification request
4. Maintain detailed logging for lock operations for troubleshooting

## Benefits of this Approach

- **Simplicity**: Clear, explicit locking model with direct user control
- **Data Integrity**: Prevents concurrent edits and data corruption
- **Visibility**: Users always know who is working on what
- **Administrative Control**: Admins can resolve stuck locks
- **Scalability**: Architecture supports extending to other resource types

## Limitations

- No automatic timeout for inactive users
- Users must remember to release locks when finished
- If a user's session crashes, resources stay locked until admin intervention 