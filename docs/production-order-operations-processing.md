# Production Operations Processing System Documentation

## 1. System Overview

The production operations management system tracks manufacturing workflows through a series of operation steps. Each production order moves through predefined operations where operators record defects, track quantities, and manage resource allocation.

## 2. Core Data Models

### 2.1 Production Order

```typescript
interface ProductionOrder {
  id?: number;
  poNumber: string; // Production Order Number
  lotNumber?: string; // Batch/Lot identifier
  poQuantity: number; // Total quantity to be produced
  itemName?: string; // Item being manufactured
  status: "pending" | "in_progress" | "completed"; // Current status
  createdAt: Date;
  updatedAt: Date;
  currentOperation?: OperationStep;
  currentOperationStartTime?: Date;
  currentOperationEndTime?: Date;
}
```

### 2.2 Operation

```typescript
interface Operation {
  id?: number;
  productionOrderId: number;
  operation: OperationStep; // e.g., OP10, OP20, etc.
  operatorId: number;
  inputQuantity: number; // Quantity at the start of operation
  outputQuantity?: number; // Quantity after defects removed
  startTime?: Date;
  endTime?: Date;
  rf: number; // Resource Factor (default: 1)
  encodedById: number;
}

enum OperationStep {
  OP10 = "OP10",
  OP20 = "OP20",
  // Additional operations as needed
}
```

### 2.3 Defect

```typescript
interface Defect {
  id?: number;
  name: string;
  description?: string;
  category?: string;
  applicableOperation?: string;
  reworkable: boolean; // Can the defect be reworked?
  machine?: string;
  isActive: boolean; // Defects are never deleted, only deactivated
  deactivatedAt?: Date; // When the defect was deactivated
  deactivatedById?: number; // Who deactivated the defect
}
```

### 2.4 Operation Defect

```typescript
interface OperationDefect {
  id?: number;
  operationId: number;
  defectId: number; // Reference to Defect model
  defectCategory: string; // Cached from Defect for quicker access
  defectMachine?: string; // Cached from Defect for quicker access
  defectReworkable: boolean; // Cached from Defect for quicker access
  quantity: number; // Total defect quantity
  quantityRework: number; // Defects that can be reworked
  quantityNogood: number; // Defects that cannot be reworked (no good)
  quantityReplacement: number; // Replacement quantity (OP10 specific)
  recordedAt: Date; // When the defect was recorded
  recordedById: number; // Who recorded the defect
}
```

## 3. Frontend Flow

### 3.1 Production Order Management

1. **Create Production Order**:

   - User enters PO number, lot number, quantity, and item name
   - System creates the production order with 'pending' status

2. **View Production Order**:

   - Display PO details in an expandable panel
   - Show operation tabs with visual indicators for status (completed, in progress, not started)
   - Enable/disable tabs based on operation sequence (must complete previous step)

3. **Edit Production Order**:
   - Allow updates to lot number, quantity, item name, and status
   - Recalculate operation quantities if PO quantity changes

### 3.2 Operation Processing Flow

1. **Start Operation**:

   - User navigates to an operation tab
   - System checks if previous operation is completed (except for OP10)
   - User clicks "Start Operation" button
   - System records start time and sets input quantity
   - Input quantity for first operation (OP10) is the PO quantity
   - Input quantity for subsequent operations is output from previous operation
   - "Start Operation" button is hidden once operation has started

2. **Record Defects**:

   - User enters defect quantities for various defect types
   - For reworkable defects, user enters No-Good (NG) quantity
   - System calculates Rework (RW) quantity as Total - NG
   - Total defects reduce the operation's output quantity

3. **End Operation**:

   - User clicks "End Operation" button (displayed in red)
   - System records end time
   - System calculates final output quantity (Input - Total Defects)
   - System automatically navigates to next operation tab
   - Output quantity from the completed operation becomes input quantity for the next operation

4. **Operation Summary**:
   - Last tab shows summary of all operations
   - Displays quantities, defects, and metrics for the entire PO

### 3.3 UI Components

1. **Operation Tabs**:

   - Horizontal navigation showing all operations and summary
   - Color-coded status indicators (green = completed, blue = in progress, gray = not started)
   - Tab access control based on previous operation completion
   - Operation details are immediately visible for an operation when the previous operation is completed

2. **Operation Details Panel**:

   - Shows start/end times, input/output quantities
   - Displays Resource Factor (RF) input field (defaults to 1)
   - Shows action buttons based on operation status:
     - "Start Operation" button is shown if operation has not started
     - "End Operation" button (in red) is shown for operations in progress

3. **Defects Panel**:

   - Searchable list of defect types
   - Input fields for quantity, No-Good (NG), and read-only Rework (RW)
   - Real-time calculation of total defects and remaining output

4. **Audit Logs Panel** (Admin only):
   - Expandable section showing operation and defect change history
   - Tables with before/after values for each field

## 4. Backend Logic

### 4.1 Database Schema

```sql
CREATE TABLE production_orders (
  id INTEGER PRIMARY KEY,
  po_number TEXT NOT NULL,
  lot_number TEXT,
  po_quantity INTEGER NOT NULL,
  item_name TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  current_operation TEXT,
  current_operation_start_time TIMESTAMP,
  current_operation_end_time TIMESTAMP
);

CREATE TABLE operations (
  id INTEGER PRIMARY KEY,
  production_order_id INTEGER NOT NULL,
  operation TEXT NOT NULL,
  operator_id INTEGER NOT NULL,
  input_quantity INTEGER NOT NULL,
  output_quantity INTEGER,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  rf INTEGER,
  encoded_by_id INTEGER NOT NULL,
  FOREIGN KEY (production_order_id) REFERENCES production_orders (id)
);

CREATE TABLE defects (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  applicable_operation TEXT,
  reworkable BOOLEAN DEFAULT FALSE,
  machine TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  deactivated_at TIMESTAMP,
  deactivated_by_id INTEGER,
  FOREIGN KEY (deactivated_by_id) REFERENCES users (id)
);

CREATE TABLE operation_defects (
  id INTEGER PRIMARY KEY,
  operation_id INTEGER NOT NULL,
  defect_id INTEGER NOT NULL,
  defect_category TEXT NOT NULL,
  defect_machine TEXT,
  defect_reworkable BOOLEAN NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  quantity_rework INTEGER NOT NULL DEFAULT 0,
  quantity_nogood INTEGER NOT NULL DEFAULT 0,
  quantity_replacement INTEGER NOT NULL DEFAULT 0,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  recorded_by_id INTEGER NOT NULL,
  FOREIGN KEY (operation_id) REFERENCES operations (id),
  FOREIGN KEY (defect_id) REFERENCES defects (id),
  FOREIGN KEY (recorded_by_id) REFERENCES users (id)
);

CREATE UNIQUE INDEX "operation_defects_operationId_defectId_recordedAt_key" ON "operation_defects"("operation_id", "defect_id", "recorded_at");

CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  old_values TEXT,
  new_values TEXT,
  user_id INTEGER NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE operation_defect_edit_requests (
  id INTEGER PRIMARY KEY,
  operation_defect_id INTEGER,
  operation_id INTEGER NOT NULL,
  production_order_id INTEGER NOT NULL,
  requested_by_id INTEGER NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'edit',
  defect_id INTEGER,
  defect_name TEXT,
  defect_category TEXT,
  defect_reworkable BOOLEAN,
  defect_machine TEXT,
  current_qty INTEGER NOT NULL,
  current_rw INTEGER NOT NULL,
  current_ng INTEGER NOT NULL,
  current_replacement INTEGER NOT NULL DEFAULT 0,
  requested_qty INTEGER NOT NULL,
  requested_rw INTEGER NOT NULL,
  requested_ng INTEGER NOT NULL,
  requested_replacement INTEGER NOT NULL DEFAULT 0,
  operation_code TEXT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  resolved_by_id INTEGER,
  resolution_note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  FOREIGN KEY (operation_defect_id) REFERENCES operation_defects (id) ON DELETE SET NULL,
  FOREIGN KEY (operation_id) REFERENCES operations (id),
  FOREIGN KEY (production_order_id) REFERENCES production_orders (id),
  FOREIGN KEY (requested_by_id) REFERENCES users (id),
  FOREIGN KEY (resolved_by_id) REFERENCES users (id)
);
```

### 4.2 Key Backend Functions

#### 4.2.1 Production Order Management

```typescript
// Create production order
async function createProductionOrder(
  po: ProductionOrder
): Promise<ProductionOrder> {
  // Insert production order into database
  // Pre-create operations for each step but leave them unstarted
  // Set input quantity only for OP10 (first operation)
  // Set default RF value to 1 for all operations
  console.log(
    `Creating production order: ${po.poNumber} with quantity: ${po.poQuantity}`
  );
  return po;
}

// Update production order
async function updateProductionOrder(po: ProductionOrder): Promise<void> {
  // Update production order in database
  // If quantity changed, only update OP10 input quantity
  // Other operations' input quantities are managed by operation completion
  console.log(`Updating production order: ${po.id} - ${po.poNumber}`);
}

// Recompute operation quantities
async function recomputeOperationQuantities(
  poId: number,
  startFromOperationId?: number
): Promise<void> {
  // Get all operations for this PO in sequence order
  // If startFromOperationId is provided, start recalculation from that operation
  // For each operation after the starting point:
  //   - Set its input quantity to the previous operation's output
  //   - Recalculate its output quantity based on defects
  // Note: OP10's input quantity is always from the PO quantity
  console.log(
    `Recomputing quantities for PO: ${poId} starting from operation: ${startFromOperationId}`
  );
}
```

#### 4.2.2 Operation Management

```typescript
// Start operation
async function startOperation(
  productionOrderId: number,
  operation: OperationStep,
  operatorId: number,
  inputQuantity: number,
  encodedById: number
): Promise<Operation> {
  // Record operation start time
  // Set input quantity (from PO for OP10, from previous operation for others)
  console.log(
    `Starting operation: ${operation} for PO: ${productionOrderId} with quantity: ${inputQuantity}`
  );
  return {
    productionOrderId,
    operation,
    operatorId,
    inputQuantity,
    encodedById,
    rf: 1, // Default RF value
    startTime: new Date(),
  };
}

// End operation
async function endOperation(
  operationId: number,
  outputQuantity: number,
  rf: number
): Promise<Operation> {
  // Record operation end time
  // Set output quantity and resource factor
  // Update PO status if this was the last operation
  // Set next operation's input quantity to this operation's output
  console.log(
    `Ending operation: ${operationId} with output: ${outputQuantity} and RF: ${rf}`
  );
  return {
    id: operationId,
    productionOrderId: 0, // Placeholder
    operation: OperationStep.OP10, // Placeholder
    operatorId: 0, // Placeholder
    inputQuantity: 0, // Placeholder
    outputQuantity,
    rf,
    encodedById: 0, // Placeholder
    endTime: new Date(),
  };
}

// Get total defects for an operation
async function getTotalDefects(operationId: number): Promise<number> {
  // Sum up all defect quantities for this operation
  console.log(`Calculating total defects for operation: ${operationId}`);
  return 0; // Placeholder
}
```

#### 4.2.3 Defect Management

```typescript
// Add or update operation defect
async function addOperationDefect(defect: OperationDefect): Promise<void> {
  // Upsert defect record
  // Log audit trail of changes
  console.log(
    `Recording defect: ${defect.defectId} for operation: ${defect.operationId} with quantity: ${defect.quantity}`
  );
}

// Get defects for an operation type
async function getDefectsForOperation(
  operation: OperationStep
): Promise<Defect[]> {
  // Return all defect types applicable to this operation
  console.log(`Getting defects for operation: ${operation}`);
  return [];
}

// Get recorded defects for a specific operation instance
async function getOperationDefects(
  operationId: number
): Promise<OperationDefect[]> {
  // Return all defects recorded for this operation instance
  console.log(`Getting recorded defects for operation: ${operationId}`);
  return [];
}
```

### 4.3 Business Rules

1. **Operation Sequence**:

   - Operations must be performed in order (OP10 → OP20 → etc.)
   - Cannot start an operation until previous one is completed (except OP10)

2. **Quantity Flow**:

   - Input quantity for OP10 is the PO quantity
   - Input quantity for subsequent operations is output from previous operation
   - Output quantity = Input quantity - Total defects
   - When an operation completes, its output quantity becomes the input quantity for the next operation

3. **Resource Factor (RF)**:

   - Default RF value is 1 for all operations
   - Operators can modify RF value when completing an operation
   - RF value affects the resource allocation for the operation
   - RF is used to track resource utilization and measure efficiency
   - RF values help with the following:
     - **Resource Utilization Tracking**: Measures how efficiently resources (equipment, personnel) are being used compared to standard allocations
     - **Man-Hour Calculations**: Used to calculate accumulated man-hours (accumulatedManHours = productionHours \* rf)
     - **Capacity Planning**: Affects resource allocation and helps with future planning
     - **Efficiency Reporting**: Reports use RF values to calculate overall efficiency metrics
     - **Operational Flexibility**: Allows operators to adjust when resource usage differs from standard expectations
   - The RF value should be adjusted when completing an operation to reflect the actual resources used compared to what was planned
   - Higher RF values indicate more resources were used than standard (less efficient), while lower values indicate fewer resources were needed (more efficient)

4. **Defect Rules**:

   - Nogood (NG) quantity cannot exceed total defect quantity
   - Rework (RW) quantity = Total defect quantity - NG quantity
   - Only certain defect types are reworkable
   - Replacement (RP) quantities can be specified for OP10 operations, default to the defect quantity
   - Replacements offset the effect of defects on output quantity calculation

5. **Completion Rules**:

   - Operation cannot be marked complete without recording end time
   - PO is considered complete when all operations are complete
   - When completing an operation, its output quantity is automatically set as input for the next operation

6. **Audit Requirements**:
   - All changes to operations and defects must be logged
   - Admin users can view change history

## 5. Implementation Considerations for React

### 5.1 State Management

Use Redux or Context API to manage:

- Current production order data
- Operation status and sequence
- Defect types and quantities
- Authentication and permissions

```jsx
// Example state structure
const initialState = {
  productionOrder: {
    current: null,
    operations: [],
    loading: false,
    error: null,
  },
  defects: {
    byOperation: {},
    loading: false,
    error: null,
  },
  auth: {
    user: null,
    isAdmin: false,
  },
};
```

### 5.2 Component Structure

```
src/
  ├── components/
  │   ├── ProductionOrderForm/
  │   ├── OperationTabs/
  │   ├── OperationDetails/
  │   ├── DefectTable/
  │   ├── AuditLogViewer/
  │   └── ...
  ├── pages/
  │   ├── ProductionOrdersPage/
  │   ├── ProductionOrderDetailPage/
  │   ├── OperationPage/
  │   └── ...
  ├── services/
  │   ├── api.js
  │   ├── productionOrderService.js
  │   ├── operationService.js
  │   └── defectService.js
  ├── store/
  │   ├── actions/
  │   ├── reducers/
  │   ├── selectors/
  │   └── index.js
  └── ...
```

### 5.3 API Integration

Create service functions for each backend endpoint:

```javascript
// Example operation service
const operationService = {
  startOperation: async (poId, operation, operatorId) => {
    console.log(`Starting operation: ${operation} for PO: ${poId}`);
    const response = await api.post("/operations/start", {
      productionOrderId: poId,
      operation,
      operatorId,
    });
    return response.data;
  },

  endOperation: async (operationId, rf) => {
    console.log(`Ending operation: ${operationId} with RF: ${rf}`);
    const response = await api.post(`/operations/${operationId}/end`, { rf });
    return response.data;
  },

  updateDefect: async (operationId, defectId, quantity, nogood) => {
    console.log(
      `Updating defect: ${defectId} with quantity: ${quantity}, nogood: ${nogood}`
    );
    const response = await api.put(
      `/operations/${operationId}/defects/${defectId}`,
      {
        quantity,
        quantityNogood: nogood,
      }
    );
    return response.data;
  },
};
```

### 5.4 Real-time Calculations

Implement hooks for real-time calculations:

```javascript
// Example hook for calculating defect totals
function useDefectCalculations(defects) {
  const totalDefects = useMemo(() => {
    return defects.reduce((sum, defect) => sum + defect.quantity, 0);
  }, [defects]);

  const totalRework = useMemo(() => {
    return defects.reduce((sum, defect) => sum + defect.quantityRework, 0);
  }, [defects]);

  const totalNogood = useMemo(() => {
    return defects.reduce((sum, defect) => sum + defect.quantityNogood, 0);
  }, [defects]);

  return { totalDefects, totalRework, totalNogood };
}
```

## 6. Security Considerations

1. **Authentication & Authorization**:

   - Implement JWT-based authentication
   - Role-based access control (operator vs admin)
   - Validate user permissions for each operation

2. **Data Validation**:

   - Validate all inputs on both client and server
   - Prevent invalid quantity values
   - Ensure proper operation sequencing

3. **Audit Trail**:
   - Comprehensive logging of all changes
   - Store user information with each audit record
   - Admin-only access to audit logs

## 7. Testing Strategy

1. **Unit Tests**:

   - Test calculations for defect quantities
   - Test business rules enforcement
   - Test component rendering

2. **Integration Tests**:

   - Test API interactions
   - Test operation workflow sequences
   - Test quantity recalculations

3. **E2E Tests**:
   - Complete operation workflow from creation to completion
   - Edge cases like modifying completed operations

## 8. Operation Defects API

### 8.1 API Endpoints

```typescript
// Create or update operation defect
POST / api / operation - defects;
```

### 8.2 Request Body Structure

```typescript
interface OperationDefectRequest {
  poNumber: string; // Production Order Number
  operationCode: string; // Operation code (e.g., OP10)
  defect: {
    id: number; // Defect ID
    name: string; // Defect name
    category?: string; // Defect category
    machine?: string; // Machine where defect occurred
    reworkable: boolean; // Whether defect can be reworked
    quantity: number; // Total defect quantity
    quantityRework: number; // Quantity that can be reworked
    quantityNogood: number; // Quantity that cannot be reworked
    quantityReplacement?: number; // Replacement quantity (OP10 specific)
  };
}
```

### 8.3 Processing Logic

1. **Validation**:

   - Validates required fields (poNumber, operationCode, defect.id)
   - Checks if production order and operation exist

2. **Transaction-based Processing**:

   - All database operations occur within a transaction for data integrity
   - If any step fails, all changes are rolled back

3. **Defect Recording**:

   - Checks if defect already exists for the operation
   - Updates existing defect record or creates a new one
   - Records who made the change and when

4. **Output Quantity Recalculation**:

   - Calculates total effective defects (accounting for reworkable status)
   - Calculates total replacement quantities (OP10-specific feature)
   - Updates operation output quantity as: Input quantity - Effective defects + Replacements

5. **Cascading Updates**:

   - Identifies subsequent operations in sequence
   - If the current operation is completed, propagates changes downstream
   - Updates input quantities of subsequent operations based on the previous operation's output
   - Recalculates output quantities for any started operations in the chain

6. **Extensive Logging**:
   - Logs each step of processing for traceability and debugging
   - Records quantities before and after calculations

### 8.4 Response

The API returns the updated production order with all operations and their defects.

## 9. Enhanced Quantity Flow Management

The system implements a sophisticated quantity flow management process:

1. **Change Propagation**:

   - Changes to defect quantities automatically propagate through the operation chain
   - Only completed operations trigger cascading updates to subsequent operations

2. **Recursive Update Chain**:

   - Updates are processed recursively through the operation sequence
   - Each operation in the chain has its input updated from the previous operation's output

3. **Conditional Output Calculation**:

   - Output quantities are only recalculated for operations that have been started
   - Non-started operations receive updated input quantities but don't calculate output yet

4. **Effective Defect Calculation**:
   - For reworkable defects, only the non-reworked portion (quantity - quantityRework) affects the output
   - For non-reworkable defects, the entire quantity affects the output
   - Replacement quantities (from OP10) are added back to offset the effect of defects
   - The output quantity calculation formula is: Output = Input - Effective Defects + Replacements
   - The system ensures output quantities never go below zero

## 10. Transaction Safety

All critical data operations are wrapped in database transactions to ensure:

1. **Atomicity**:

   - Either all changes succeed, or none are applied
   - Prevents partial updates that could lead to data inconsistency

2. **Data Integrity**:

   - Related operations are updated as a unit
   - Prevents orphaned records and maintains referential integrity

3. **Error Handling**:
   - Comprehensive error catching with detailed error responses
   - Any failure rolls back all changes made in the transaction

## 11. Production Order Locking System

The system uses a dedicated locking mechanism to prevent multiple users from editing the same production order simultaneously. This prevents data inconsistency and race conditions.

For detailed documentation on the locking system, please refer to the dedicated documentation:
[Production Order Locking System Documentation](../production-order-locking.md)

## 12. Role-Based Access Control

The system implements strict role-based access control to manage user permissions based on their assigned roles:

### 12.1 User Roles and Permissions

```typescript
interface User {
  // ... existing fields ...
  role: string; // 'Admin' or 'Encoder'
}
```

1. **Admin Users**:

   - Full access to create, read, update, and delete all resources
   - Can edit production orders at any stage (including completed orders)
   - Can modify operations and defects regardless of their status
   - Can force-release locks held by other users
   - Can make structural changes to the system

2. **Encoder Users**:
   - Read access to all production orders, operations, and defects
   - Can create new production orders
   - Can start operations and record defects for in-progress operations
   - Cannot edit production order details (lot number, quantity, item name)
   - Cannot modify completed operations or their defects
   - Cannot edit any part of completed production orders
   - Can only release locks they personally own

### 12.2 UI Implementation

1. **Visual Indicators**:

   - "Admin Mode" badge displayed for admin users
   - "View Only" indicators on forms and panels for encoder users
   - Lock icons on completed operation tabs and defect panels
   - Disabled form inputs with gray backgrounds for non-editable fields
   - Encoder users see error messages if they attempt to edit protected elements

2. **Form Controls**:

   - Disabled inputs for encoder users on production order details
   - Disabled defect quantity fields for completed operations
   - Hidden or disabled action buttons for unauthorized operations
   - Permission-aware validation before form submission

3. **Contextual Messaging**:
   - Toast notifications explain permission restrictions
   - Error messages indicate when actions are admin-only
   - Visual feedback guides users to appropriate actions for their role

### 12.3 Backend Enforcement

1. **API Security**:

   - All API endpoints validate user roles before processing requests
   - `withAuth` middleware injects session data including user role
   - Backend validation prevents API manipulation attempts

2. **Permission Checks**:

   ```typescript
   // Example permission check in API endpoints
   const userRole = session?.user?.role || "";
   const isAdmin =
     typeof userRole === "string" && userRole.toLowerCase() === "admin";

   if (
     !isAdmin &&
     (operation.endTime || productionOrder.status === "COMPLETED")
   ) {
     return res.status(403).json({
       error: "Only admin users can modify completed operations",
     });
   }
   ```

3. **Completed Resource Protection**:
   - Special protection for completed operations and orders
   - API endpoints verify both user role and resource status
   - Ensures data integrity for finalized production records

### 12.4 Error Handling

1. **Permission Denied Responses**:

   - HTTP 403 Forbidden status codes for unauthorized attempts
   - Descriptive error messages explain access requirements
   - Client-side code prevents most unauthorized requests

2. **Audit Logging**:
   - All permission-related events are logged
   - Failed access attempts are recorded with user details
   - Provides security audit trail for compliance purposes

### 12.5 Session Management

1. **Role Storage**:

   - User roles stored in JWT tokens for authenticated sessions
   - Role information is available both client-side and server-side
   - Session validation prevents role tampering

2. **Role-Based UI Adaptation**:
   - UI dynamically adapts based on user role
   - Components conditionally render based on permissions
   - Prevents confusion by not showing inaccessible options

### 12.6 Permission Model Overview

```
┌───────────────────────────┐      ┌───────────────────────────┐
│                           │      │                           │
│        ADMIN ROLE         │      │       ENCODER ROLE        │
│                           │      │                           │
└───────────┬───────────────┘      └───────────┬───────────────┘
            │                                   │
            ▼                                   ▼
┌───────────────────────────┐      ┌───────────────────────────┐
│  PRODUCTION ORDER ACCESS  │      │  PRODUCTION ORDER ACCESS  │
├───────────────────────────┤      ├───────────────────────────┤
│ ✓ Create new orders       │      │ ✓ Create new orders       │
│ ✓ View all order details  │      │ ✓ View all order details  │
│ ✓ Edit order details      │      │ ✗ Edit order details      │
│ ✓ Edit completed orders   │      │ ✗ Edit completed orders   │
│ ✓ Force-release any lock  │      │ ✓ Release own locks only  │
└───────────────────────────┘      └───────────────────────────┘
            │                                   │
            ▼                                   ▼
┌───────────────────────────┐      ┌───────────────────────────┐
│     OPERATION ACCESS      │      │     OPERATION ACCESS      │
├───────────────────────────┤      ├───────────────────────────┤
│ ✓ Start any operation     │      │ ✓ Start pending operations│
│ ✓ End any operation       │      │ ✓ End started operations  │
│ ✓ Edit completed ops      │      │ ✗ Edit completed ops      │
│ ✓ Modify any operation    │      │ ✓ Modify active operations│
└───────────────────────────┘      └───────────────────────────┘
            │                                   │
            ▼                                   ▼
┌───────────────────────────┐      ┌───────────────────────────┐
│      DEFECT ACCESS        │      │      DEFECT ACCESS        │
├───────────────────────────┤      ├───────────────────────────┤
│ ✓ Record defects anytime  │      │ ✓ Record defects for      │
│ ✓ Edit any defect record  │      │   active operations       │
│ ✓ Modify completed defects│      │ ✗ Edit defects for        │
│ ✓ Override system rules   │      │   completed operations     │
└───────────────────────────┘      └───────────────────────────┘
```

### 12.7 Integration with Locking Mechanism

The role-based access control system works together with the production order locking mechanism to provide multiple layers of protection:

1. **Permission vs. Lock Distinction**:

   - **Permissions** determine what actions a user can perform based on their role
   - **Locks** prevent concurrent editing of the same record by multiple users

2. **Access Control Flow**:

   ```
   ┌─────────────────────┐
   │ USER ACTION REQUEST │
   └──────────┬──────────┘
              ▼
   ┌─────────────────────┐
   │ ROLE PERMISSIONS    │ ← First layer: Is this action allowed for this role?
   └──────────┬──────────┘
              ▼
   ┌─────────────────────┐
   │ LOCKING MECHANISM   │ ← Second layer: Does the user have exclusive access?
   └──────────┬──────────┘
              ▼
   ┌─────────────────────┐
   │ PROCESS REQUEST     │
   └─────────────────────┘
   ```

3. **Sequential Validation**:

   - System first checks if the user role allows the requested action
   - If allowed by role, system checks if the record is locked by another user
   - Both checks must pass for the action to proceed

4. **Locking Behavior by Role**:

   - **Admin**:
     - Can acquire locks on any unlocked production order
     - Can force-release locks held by other users
   - **Encoder**:
     - Can acquire locks on unlocked, non-completed production orders
     - Can only release locks they personally hold
     - Cannot edit completed operations even if they hold the lock

5. **UI Integration**:

   - Lock indicators are displayed alongside role-based restriction indicators
   - Users can clearly see whether access is prevented by lock status or by role permissions
   - Different visual cues distinguish between "locked by another user" and "requires admin role"

6. **Code Implementation**:

   ```javascript
   // Example of combined permission and lock check
   const processRequest = async (req, res) => {
     const { action, resourceId } = req.body;
     const session = req.session;

     // 1. Check role permissions
     if (!hasPermission(session.user.role, action)) {
       return res.status(403).json({ error: "Insufficient permissions" });
     }

     // 2. Get the resource
     const resource = await getResource(resourceId);

     // 3. Check if resource is locked by someone else
     if (resource.lockedBy && resource.lockedBy !== session?.user?.id) {
       return res
         .status(423)
         .json({ error: "This resource is locked by another user" });
     }

     // 4. All checks passed, process the request
     return performAction(resource, action, session.user);
   };
   ```

## 13. Operation Defect Edit Request System

To balance data integrity with the need for occasional corrections, the system implements a dedicated approval workflow for modifying defect data in completed operations. This allows encoders to request specific changes to defect quantities that require admin approval.

### 13.1 OperationDefectEditRequests Model

```typescript
interface OperationDefectEditRequest {
  id: number; // Unique identifier
  operationDefectId: number; // Reference to the specific defect record
  operationId: number; // ID of the operation containing the defect
  productionOrderId: number; // ID of the parent production order
  requestedById: number; // Encoder who requested the edit
  currentQty: number; // Current quantity value
  currentRw: number; // Current rework value
  currentNg: number; // Current no-good value
  currentReplacement: number; // Current replacement value (for OP10)
  requestedQty: number; // Requested quantity value
  requestedRw: number; // Requested rework value
  requestedNg: number; // Requested no-good value
  requestedReplacement: number; // Requested replacement value (for OP10)
  operationCode?: string; // Identifies OP10 operations for replacements
  reason: string; // Justification for the edit request
  status: "pending" | "approved" | "rejected"; // Status of the request
  resolvedById?: number; // Admin who resolved the request
  comments?: string; // Optional admin comments on resolution
  createdAt: Date; // Request creation timestamp
  resolvedAt?: Date; // Resolution timestamp
}
```

### 13.2 Database Schema

```sql
CREATE TABLE operation_defect_edit_requests (
  id INTEGER PRIMARY KEY,
  operation_defect_id INTEGER,
  operation_id INTEGER NOT NULL,
  production_order_id INTEGER NOT NULL,
  requested_by_id INTEGER NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'edit',
  defect_id INTEGER,
  defect_name TEXT,
  defect_category TEXT,
  defect_reworkable BOOLEAN,
  defect_machine TEXT,
  current_qty INTEGER NOT NULL,
  current_rw INTEGER NOT NULL,
  current_ng INTEGER NOT NULL,
  current_replacement INTEGER NOT NULL DEFAULT 0,
  requested_qty INTEGER NOT NULL,
  requested_rw INTEGER NOT NULL,
  requested_ng INTEGER NOT NULL,
  requested_replacement INTEGER NOT NULL DEFAULT 0,
  operation_code TEXT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  resolved_by_id INTEGER,
  resolution_note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  FOREIGN KEY (operation_defect_id) REFERENCES operation_defects (id) ON DELETE SET NULL,
  FOREIGN KEY (operation_id) REFERENCES operations (id),
  FOREIGN KEY (production_order_id) REFERENCES production_orders (id),
  FOREIGN KEY (requested_by_id) REFERENCES users (id),
  FOREIGN KEY (resolved_by_id) REFERENCES users (id)
);
```

### 13.3 Request Workflow

1. **Request Creation**:

   - Encoder identifies incorrect defect data in a completed operation
   - Encoder submits a change request with new values and justification
   - System captures current values and requested changes

2. **Admin Review**:

   - Admin receives notification of pending request
   - Admin reviews the request details, including the reason
   - Admin can see the impact the change would have on operation outputs

3. **Request Resolution**:

   - Admin approves or rejects the request
   - Admin can add explanatory comments
   - If approved, system applies the changes and recalculates quantities
   - If rejected, original values remain unchanged

4. **Notification & Tracking**:
   - Encoder receives notification of request outcome
   - All requests are archived for audit purposes
   - System maintains history of all defect modifications

### 13.4 User Interface Implementation

#### 13.4.1 Encoder Interface

1. **Request Trigger**:

   - "Request Edit" button/icon appears next to defect quantities in completed operations
   - Clicking opens the request dialog

2. **Request Form**:

   ```
   ┌──────────────────────────────┐
   │    Request Edit Permission   │
   ├──────────────────────────────┤
   │ Defect: Damaged Acetate Tape │
   │ Category: Mating Side        │
   │ Machine: Mating Inspection   │
   ├──────────────────────────────┤
   │ Requested Values:            │
   │ ┌─────┐  ┌─────┐  ┌─────┐    │
   │ │ QTY │  │ RW  │  │ NG  │    │
   │ │  2  │  │  0  │  │  2  │    │
   │ └─────┘  └─────┘  └─────┘    │
   │                              │
   │ For OP10 only:              │
   │ ┌─────┐                      │
   │ │ RP  │                      │
   │ │  2  │                      │
   │ └─────┘                      │
   ├──────────────────────────────┤
   │ Reason for Change: *         │
   │ ┌─────────────────────────┐  │
   │ │                         │  │
   │ │                         │  │
   │ └─────────────────────────┘  │
   ├──────────────────────────────┤
   │ [Cancel]        [Submit]     │
   └──────────────────────────────┘
   ```

3. **Status Indicators**:
   - Defects with pending requests show a small "pending" icon
   - Defects with resolved requests show resolution status

#### 13.4.2 Admin Interface

1. **Request List**:

   - Table of pending requests showing key information
   - Filtering options by production order, date, status

2. **Request Details**:
   ```
   ┌──────────────────────────────────────────┐
   │ Edit Request #123                        │
   ├──────────────────────────────────────────┤
   │ PO: PO12345 | Operation: OP20           │
   │ Defect: Damaged Acetate Tape             │
   │ Requested by: John Doe (Encoder)         │
   │ Date: 2023-07-15 14:30                   │
   ├──────────────────────────────────────────┤
   │ Current Values  │ Requested Values       │
   │ QTY: 5          │ QTY: 2                 │
   │ RW:  3          │ RW:  0                 │
   │ NG:  2          │ NG:  2                 │
   │                                          │
   │ For OP10 operations:                     │
   │ RP:  5          │ RP:  2                 │
   ├──────────────────────────────────────────┤
   │ Reason for Change:                       │
   │ Incorrect quantity entered. Should be 2  │
   │ units total with all marked as no-good.  │
   ├──────────────────────────────────────────┤
   │ Your Comments:                           │
   │ ┌─────────────────────────────────────┐  │
   │ │                                     │  │
   │ └─────────────────────────────────────┘  │
   ├──────────────────────────────────────────┤
   │ [Reject]                    [Approve]    │
   └──────────────────────────────────────────┘
   ```

### 13.5 API Endpoints

```
POST /api/operation-defect-edit-requests
- Creates a new edit request
- Requires: operationDefectId, requestedQty, requestedRw, requestedNg, reason

GET /api/operation-defect-edit-requests
- Lists edit requests with filtering options
- Admin sees all requests; encoders see only their own

GET /api/operation-defect-edit-requests/:id
- Gets details of a specific edit request

PUT /api/operation-defect-edit-requests/:id/resolve
- Resolves a request (approve/reject)
- Requires admin role
- Requires: status, comments (optional)
```

### 13.6 Business Logic

1. **Validation Rules**:

   - Requested quantities must be valid numbers
   - Rework quantity cannot exceed total quantity
   - No-good quantity must equal total quantity minus rework
   - Reason field is required and must be descriptive

2. **Approval Processing**:

   - When approved, system updates the defect quantities
   - System recalculates output quantity for the operation
   - Updates cascade to subsequent operations if needed
   - Changes are logged in the audit trail

3. **Impact Analysis**:
   - Before approval, system calculates the potential impact
   - Shows admin how operation output will change
   - Identifies downstream operations affected by the change

### 13.7 Security Considerations

1. **Permission Enforcement**:

   - Only encoders can create edit requests
   - Only admins can approve/reject requests
   - Users can only view requests they have permission for

2. **Audit Trail**:

   - All request actions are logged with user details
   - System maintains before/after values for all changes
   - Request history is preserved for compliance purposes

3. **Data Validation**:
   - All inputs are validated to prevent invalid data
   - Business rules enforcement ensures data integrity
   - System prevents manipulation of request details after submission

## 14. Replacement Quantity Feature

The system implements a replacement quantity feature specifically designed for OP10 operations to account for parts that are replaced during the manufacturing process:

### 14.1 Overview

Replacement quantities represent components that are replaced during the OP10 process. While defects typically reduce the output quantity, replacements offset this reduction by adding back to the output:

```
Output Quantity = Input Quantity - Effective Defects + Replacement Quantity
```

### 14.2 Implementation Details

1. **OP10 Specificity**:

   - Replacement quantity input field is only visible for OP10 operations
   - For OP10, by default, replacement quantity equals the defect quantity
   - For other operations, replacement quantities are tracked but not visible for editing

2. **Database Schema**:

   ```sql
   ALTER TABLE "operation_defects" ADD COLUMN "quantityReplacement" INTEGER NOT NULL DEFAULT 0;
   ```

3. **UI Implementation**:

   - The RP (Replacement) field appears next to QTY, RW, and NG fields only for OP10
   - The field has blue styling to distinguish it from other quantity fields
   - Value is capped at the defect quantity to prevent invalid data

4. **Calculation Logic**:

   - When calculating output quantities, the system adds replacement quantities to offset defects
   - Replacement quantities propagate through the operation chain via output quantities
   - All operations display the total replacements in their operation details panel

5. **Restrictions**:
   - Only OP10 operations can have replacement quantities directly entered
   - Replacement quantities cannot exceed the defect quantity
   - For non-OP10 operations, replacement quantities are set to 0 by default

### 14.3 Application in Production Flow

1. **Data Entry**:

   - During OP10, operators record defects and their corresponding replacement quantities
   - The system automatically sets the default replacement quantity equal to the defect quantity
   - Operators can adjust replacement values if needed (up to the defect quantity)

2. **Quantity Propagation**:

   - The replacement effect is included in the OP10 output quantity
   - Subsequent operations receive an input quantity that already accounts for replacements
   - This ensures the correct part count flows through the entire production chain

3. **Visual Representation**:
   - All operations display total replacements in the operation info panel
   - This provides transparency about replacement quantities throughout production
   - Blue styling distinguishes replacements from other quantity types
