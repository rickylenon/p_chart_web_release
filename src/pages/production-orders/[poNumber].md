# Production Order Details Page Documentation

## Overview

The Production Order Details page (`[poNumber].tsx`) is a comprehensive UI for viewing and managing production orders in the P-Chart system. It allows users to:

- View production order details
- Start and complete operations
- Record defects during production
- Track operation status
- View audit logs (admin only)
- Request defect edits (non-admin users)

## Page Structure

The page is structured as a tabbed interface where each tab represents an operation step in the production process (OP10, OP20, etc). The page displays:

1. Production order header information
2. Operation tabs showing the sequence of operations
3. Operation details panel showing status, times, and quantities
4. Defects recording panel for tracking quality issues

## Component Hierarchy

```
ProductionOrderDetails
├── DashboardLayout
│   └── Navigation
├── PageHeader
├── Order Details Form
├── Operations Tabs
│   ├── TabsList (Operation sequence)
│   └── TabsContent
│       ├── Operation Information Panel
│       └── Defects Panel
│           ├── Defect Search
│           └── Recorded Defects List
│               └── DefectEditRequestPopover (for non-admins)
├── End Operation Modal
└── AuditLogModal(s)
```

## State Management

The page uses numerous React state hooks to manage:

- Order data (`orderData`)
- Operation steps (`operationSteps`)
- Active tab (`activeTab`)
- Defects list (`defects`)
- Operation statuses (`operationStatuses`)
- Loading states (`isLoading`, `isLoadingDefects`)
- Form data (`formData`)
- UI state (modals, selections, inputs)

### Key State Variables

| State Variable      | Purpose                                          |
| ------------------- | ------------------------------------------------ |
| `orderData`         | Stores the production order details from the API |
| `operationSteps`    | List of operation steps for this production type |
| `activeTab`         | Currently selected operation tab                 |
| `defects`           | List of defects for the current operation        |
| `operationStatuses` | Record of all operations' statuses               |
| `isLoadingDefects`  | Flag to prevent redundant defect loading         |
| `lastFetchedTab`    | Tracks which tab's defects have been loaded      |

## Data Flow

1. On page load:

   - Fetch operation steps
   - Fetch production order data
   - Set the active tab to the current operation
   - Load defects for the active tab

2. When changing tabs:

   - Update the active tab state
   - Fetch defects for the selected operation if not already loaded
   - Display operation information and defects

3. When recording defects:

   - Update defect quantities locally
   - Send updates to the server
   - Reflect changes in the UI

4. When starting/completing operations:
   - Update operation status on the server
   - Refresh order data
   - Move to the next operation if applicable
   - Automatically start the next operation if it exists

## API Interactions

The page interacts with several API endpoints:

| Endpoint                              | Purpose                                  |
| ------------------------------------- | ---------------------------------------- |
| `/api/operation-steps`                | Get all operation steps                  |
| `/api/production-orders/:poNumber`    | Get/update production order details      |
| `/api/defects`                        | Get defects master list for an operation |
| `/api/operation-defects/list`         | Get recorded defects for an operation    |
| `/api/operation-defects`              | Record new defect quantities             |
| `/api/operations/start`               | Start an operation                       |
| `/api/operations/complete`            | Complete an operation                    |
| `/api/production-orders/release-lock` | Release edit lock on the order           |

## Key Functions

### Data Loading

- `fetchOperationSteps`: Loads the operation steps once
- `fetchProductionOrder`: Loads production order data
- `fetchDefectsForOperation`: Loads defects for a specific operation
- `refreshDefectsForOperation`: Refreshes defect data (disabled to prevent loops)

### User Actions

- `handleTabChange`: Manages tab selection and defect loading
- `handleDefectQuantityChange`: Updates defect quantities
- `handleStartOperation`: Initiates an operation
- `handleCompleteOperation`: Shows modal to end operation
- `submitCompleteOperation`: Completes the operation with data and auto-starts next operation
- `handleReleaseLock`: Releases the editing lock on the order

## Permission Handling

The page has different behaviors based on user role:

- **Admin Users**: Can edit all fields, modify completed operations
- **Regular Users**: View-only for completed operations, can request changes

## Auto-Start Next Operation

When an operation is completed, the system automatically:

1. **Moves to Next Operation**: Switches to the next operation tab in the sequence
2. **Auto-Starts Operation**: Automatically calls the start operation API for the next operation
3. **Updates UI Status**: Changes the operation status to "In Progress"
4. **Provides Feedback**: Shows a success toast notification
5. **Error Handling**: If auto-start fails, shows a warning and leaves the operation in "Not Started" state

### Auto-Start Behavior:

- **Success Case**: User sees "OP20 operation started automatically!" message
- **Failure Case**: User sees "Moved to OP20 but failed to auto-start. Please start manually." message
- **Network Issues**: Operation remains in "Not Started" state with error message
- **Final Operation**: No auto-start attempted when completing the last operation in sequence

## Known Issues and Solutions

### Infinite Loading Loop

**Problem**: Page continuously loads defects data, causing performance issues.

**Solution**:

- Disabled automatic polling for defect updates
- Added guards in `fetchDefectsForOperation` to prevent redundant fetches
- Implemented proper state tracking with `lastFetchedTab`

### Production Order Locking Issues

**Problem**: When a production order is being edited by another user, the page should display a lock notification, but it gets stuck in an infinite loading loop or shows JSON parsing errors.

**Root Causes**:

1. **API Route Conflict**: Duplicate API routes (`/api/operation-steps.ts` and `/api/operation-steps/index.ts`) causing intermittent HTML error responses instead of JSON
2. **React Hydration Mismatch**: Server-side rendered content doesn't match client-side rendering when locks are present
3. **Continuous Data Fetching**: Even when a production order is locked, background data fetching continues

**Solution**:

1. **Early Lock Detection**: Added lock detection at the outermost component level
2. **Separate Component Flow**: Created a dedicated `LockedOrderView` component that doesn't trigger any data fetching
3. **Client-Only Rendering**: Implemented a `BypassRenderer` component to completely bypass hydration for normal (unlocked) orders
4. **Proper API Routing**: Ensured no duplicate API routes exist to prevent HTML error responses

### Architecture Improvements:

The updated architecture for handling locked production orders:

```
ProductionOrderDetails
├─ [If Locked] -> LockedOrderView (Minimal, no data fetching)
│   └─ Lock Information + Release Actions
│
└─ [If Unlocked] -> BypassRenderer (Client-only rendering)
    └─ ProductionOrderDetailsInner (Full functionality)
```

This separation ensures that:

- Locked orders show immediate feedback without API errors
- No unnecessary data fetching occurs for locked orders
- Admins can still force-release locks when needed
- The complex state management only runs for unlocked orders

### Defects Not Loading on Page Refresh

**Problem**: Defects aren't loaded when the page is first opened.

**Solution**:

- Added dedicated useEffect to ensure defects are loaded after tab selection
- Added immediate defect loading after setting the active tab
- Added comprehensive logging to track the loading process

### Race Conditions

**Problem**: Multiple state updates causing inconsistent UI.

**Solution**:

- Used setTimeout with 0ms delay to ensure state updates complete
- Grouped related state updates to avoid intermediate states
- Added checks to prevent operations during loading states

## Performance Optimization

1. **Memoized Callbacks**: Using useCallback for functions to maintain stable references
2. **Conditional Fetching**: Only loading data when necessary
3. **Batched State Updates**: Updating related state together
4. **Debounced Operations**: Using debounce for defect quantity updates

## Troubleshooting Guide

### Page Shows Continuous Loading

Check:

- Console logs for errors
- Network tab for failed requests
- Verify useEffect dependencies aren't causing re-renders

### No Defects Appearing

Check:

- Is the operation started?
- Are there defects defined for this operation?
- Check network requests for errors
- Verify `lastFetchedTab` matches the current tab

### Can't Edit Defects

Check:

- User permissions (only admins can edit completed operations)
- Operation state (must be started but not completed)
- Network tab for authorization errors

## Future Improvements

1. Implement better error handling for API failures
2. Add offline capability for unstable connections
3. Optimize performance for large defect lists
4. Improve UX for long operation sequences
