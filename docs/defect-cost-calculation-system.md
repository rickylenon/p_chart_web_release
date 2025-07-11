# Automatic Defect Cost Calculation System Documentation

## 1. System Overview

The Automatic Defect Cost Calculation system provides real-time financial impact analysis of manufacturing defects by calculating the cost of defective products based on standard item costs and production quantities. The system integrates seamlessly with the existing P-Chart production tracking workflow.

### 1.1 Key Features

- **Standard Cost Management**: CRUD system for managing item standard costs (similar to Master Defects)
- **Automatic Cost Calculation**: Real-time defect cost calculation when defects are recorded
- **Historical Data Integrity**: Completed production orders maintain original cost basis
- **Dashboard Integration**: Cost-based charts with existing filter system
- **Simple Architecture**: No complex foreign key relationships, self-contained cost data

### 1.2 Business Logic

- **Cost Capture**: Standard costs are captured at production order creation time
- **Cost Updates**: Changes to standard costs affect only new and in-progress production orders
- **Defect Cost Formula**: `(Input Quantity - Output Quantity) × Cost Per Unit`
- **Total PO Cost**: Sum of all operation defect costs within a production order

## 2. Database Schema

### 2.1 Standard Cost Management Table

```sql
CREATE TABLE "standard_costs" (
    "id" SERIAL NOT NULL,
    "itemName" TEXT NOT NULL,
    "description" TEXT,
    "costPerUnit" DECIMAL(10,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "standard_costs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "standard_costs_itemName_key" ON "standard_costs"("itemName");
```

### 2.2 Production Order Schema Extensions

```sql
-- Add cost fields to existing production_orders table
ALTER TABLE "production_orders" ADD COLUMN "costPerUnit" DECIMAL(10,4);
ALTER TABLE "production_orders" ADD COLUMN "totalDefectCost" DECIMAL(10,2) DEFAULT 0;
ALTER TABLE "production_orders" ADD COLUMN "lastCostUpdate" TIMESTAMP(3);
```

### 2.3 Operation Schema Extensions

```sql
-- Add defect cost field to operations table
ALTER TABLE "operations" ADD COLUMN "defectCost" DECIMAL(10,2) DEFAULT 0;
```

### 2.4 Prisma Schema Models

```typescript
model StandardCost {
  id          Int      @id @default(autoincrement())
  itemName    String   @unique
  description String?
  costPerUnit Decimal  @db.Decimal(10, 4)
  currency    String   @default("USD")
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdById Int?
  updatedById Int?

  @@map("standard_costs")
}

model ProductionOrder {
  // ... existing fields
  costPerUnit       Decimal? @db.Decimal(10, 4)  // Captured at PO creation
  totalDefectCost   Decimal? @db.Decimal(10, 2)  // Calculated defect cost
  lastCostUpdate    DateTime?                     // When cost was last calculated

  // ... existing relations (no StandardCost relation)
}

model Operation {
  // ... existing fields
  defectCost        Decimal? @db.Decimal(10, 2)  // Operation-specific defect cost

  // ... existing relations
}
```

## 3. Standard Cost Management System

### 3.1 API Endpoints

Following the same pattern as Master Defects Management:

#### 3.1.1 Core CRUD Operations

```typescript
// GET /api/standard-costs
// - List all standard costs with filtering, sorting, pagination
// - Query params: search, active, page, limit, sortField, sortDirection

// POST /api/standard-costs
// - Create new standard cost
// - Body: { itemName, description?, costPerUnit, currency? }

// GET /api/standard-costs/[id]
// - Get specific standard cost details

// PUT /api/standard-costs/[id]
// - Update existing standard cost
// - Triggers cost recalculation for ongoing POs

// DELETE /api/standard-costs/[id]
// - Deactivate standard cost (soft delete)
// - Sets isActive = false, deactivatedAt = now()
```

#### 3.1.2 Utility Endpoints

```typescript
// POST /api/standard-costs/import
// - Import standard costs from CSV file
// - Validates data format and duplicates

// GET /api/standard-costs/export
// - Export standard costs to CSV format

// POST /api/standard-costs/recalculate
// - Recalculate defect costs for ongoing production orders
// - Admin-only operation
```

### 3.2 Frontend Pages

#### 3.2.1 Main Management Page

```
/standard-costs/index.tsx
- DataTable with CRUD operations
- Search, filter, sort functionality
- Import/Export buttons
- Admin-only access
```

#### 3.2.2 Create/Edit Pages

```
/standard-costs/create.tsx
- Form for creating new standard cost
- Validation for itemName uniqueness

/standard-costs/edit/[id].tsx
- Form for editing existing standard cost
- Warning about impact on ongoing POs
```

### 3.3 UI Components

#### 3.3.1 Standard Costs DataTable

```typescript
interface StandardCost {
  id: number;
  itemName: string;
  description: string | null;
  costPerUnit: number;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Columns: Item Name, Description, Cost/Unit, Currency, Status, Actions
// Features: Search, Filter, Sort, Export, Create, Edit, Deactivate
```

#### 3.3.2 Cost Input Components

```typescript
// Currency-formatted input field
<CostInput
  value={costPerUnit}
  onChange={setCostPerUnit}
  currency="USD"
  placeholder="0.0000"
/>

// Cost summary display
<CostSummary
  totalCost={defectCost}
  quantity={defectQuantity}
  unitCost={costPerUnit}
/>
```

## 4. Cost Calculation Logic

### 4.1 Core Calculation Service

```typescript
// src/lib/costCalculationService.ts
export class DefectCostCalculator {
  /**
   * Calculate defect cost for a single operation
   */
  async calculateOperationDefectCost(
    operationId: number
  ): Promise<OperationCostResult> {
    const operation = await prisma.operation.findUnique({
      where: { id: operationId },
      include: {
        productionOrder: true,
        operationDefects: true,
      },
    });

    const costPerUnit = operation.productionOrder.costPerUnit;
    if (!costPerUnit) return { defectCost: 0, message: "No cost per unit set" };

    // Calculate effective defects (considering rework)
    const totalEffectiveDefects = operation.operationDefects.reduce(
      (sum, defect) => {
        const effectiveDefects = defect.defectReworkable
          ? defect.quantity - defect.quantityRework
          : defect.quantity;
        return sum + effectiveDefects;
      },
      0
    );

    const defectCost = totalEffectiveDefects * costPerUnit;

    // Update operation defect cost
    await prisma.operation.update({
      where: { id: operationId },
      data: { defectCost },
    });

    return { defectCost, effectiveDefects: totalEffectiveDefects };
  }

  /**
   * Calculate total defect cost for a production order
   */
  async calculateProductionOrderDefectCost(
    poId: number
  ): Promise<POCostResult> {
    const operations = await prisma.operation.findMany({
      where: { productionOrderId: poId },
      select: { defectCost: true },
    });

    const totalDefectCost = operations.reduce(
      (sum, op) => sum + (op.defectCost || 0),
      0
    );

    // Update production order total defect cost
    await prisma.productionOrder.update({
      where: { id: poId },
      data: {
        totalDefectCost,
        lastCostUpdate: new Date(),
      },
    });

    return { totalDefectCost, operationCount: operations.length };
  }

  /**
   * Update cost per unit for ongoing production orders when standard cost changes
   */
  async updateOngoingPOCosts(
    itemName: string,
    newCostPerUnit: number
  ): Promise<UpdateResult> {
    const updatedPOs = await prisma.productionOrder.updateMany({
      where: {
        itemName: itemName,
        status: { in: ["CREATED", "IN_PROGRESS"] }, // Not COMPLETED
      },
      data: {
        costPerUnit: newCostPerUnit,
        lastCostUpdate: new Date(),
      },
    });

    // Recalculate defect costs for updated POs
    const ongoingPOs = await prisma.productionOrder.findMany({
      where: {
        itemName: itemName,
        status: { in: ["CREATED", "IN_PROGRESS"] },
      },
    });

    for (const po of ongoingPOs) {
      await this.recalculateProductionOrderCosts(po.id);
    }

    return { updatedCount: updatedPOs.count };
  }
}
```

### 4.2 Integration Points

#### 4.2.1 Production Order Creation

```typescript
// When creating a new production order:
const standardCost = await prisma.standardCost.findUnique({
  where: { itemName: formData.itemName, isActive: true },
});

const po = await prisma.productionOrder.create({
  data: {
    // ... other fields
    costPerUnit: standardCost?.costPerUnit || null,
  },
});
```

#### 4.2.2 Defect Recording Integration

```typescript
// In existing operation-defects API:
const result = await prisma.$transaction(async (tx) => {
  // ... existing defect update logic ...

  // Calculate and update defect costs
  const calculator = new DefectCostCalculator();
  await calculator.calculateOperationDefectCost(operation.id);
  await calculator.calculateProductionOrderDefectCost(
    operation.productionOrderId
  );

  return updatedData;
});
```

#### 4.2.3 Standard Cost Update Impact

```typescript
// When updating a standard cost:
const calculator = new DefectCostCalculator();
await calculator.updateOngoingPOCosts(itemName, newCostPerUnit);
```

## 5. Dashboard Cost Charts

### 5.1 New API Endpoint

```typescript
// src/pages/api/dashboard/cost-charts.ts
export default withAuth(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  // Support same filters as existing dashboard charts
  const { year, month, line, series, status, poNumber } = req.query;

  // Generate cost-based chart data:
  // 1. Daily defect costs over time
  // 2. Cost by operation type
  // 3. Cost by defect category
  // 4. Cost vs production volume comparison
});
```

### 5.2 Chart Components

#### 5.2.1 Defect Cost Over Time Chart

```typescript
// src/components/dashboard/defect-cost-chart.tsx
export function DefectCostChart({ refreshTrigger = 0 }) {
  // Line chart showing daily/weekly defect costs
  // Uses same filter context as existing charts
  // Shows cost trends over selected time period
}
```

#### 5.2.2 Cost by Operation Chart

```typescript
// Bar chart showing which operations (OP10, OP15, etc.) have highest defect costs
// Helps identify problematic operation steps
```

#### 5.2.3 Cost by Defect Category Chart

```typescript
// Pie chart showing cost breakdown by defect categories
// Helps prioritize defect reduction efforts
```

### 5.3 Dashboard Integration

#### 5.3.1 Stats Cards Enhancement

```typescript
// Add cost metrics to existing dashboard stats
interface DashboardStats {
  // ... existing stats
  totalDefectCost: number; // Today's defect cost
  avgDefectCostPerPO: number; // Average defect cost per PO
  costSavingsTarget: number; // Target cost reduction
}
```

#### 5.3.2 Dashboard Layout Update

```typescript
// Add cost chart section to dashboard
<div className="space-y-6">
  <DefectRatioChart refreshTrigger={refreshTrigger} />
  <MachineDefectsCharts refreshTrigger={refreshTrigger} />
  <DefectCostChart refreshTrigger={refreshTrigger} /> {/* New */}
</div>
```

## 6. UI Enhancements

### 6.1 Production Order Cost Display

#### 6.1.1 Production Order Header

```typescript
// Add cost information to PO header
<div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
  <div className="flex justify-between items-center">
    <div>
      <h3 className="font-semibold">Cost Information</h3>
      <p className="text-sm text-gray-600">
        Standard Cost: ${po.costPerUnit}/unit
      </p>
    </div>
    <div className="text-right">
      <div className="text-2xl font-bold text-red-600">
        ${po.totalDefectCost || 0}
      </div>
      <div className="text-sm text-gray-500">Total Defect Cost</div>
    </div>
  </div>
</div>
```

#### 6.1.2 Operation Cost Display

```typescript
// Add cost info to operation panels
<div className="flex justify-between font-medium text-red-600 dark:text-red-400 mt-1">
  <span>Operation Defect Cost:</span>
  <span>${operationStatus?.defectCost?.toFixed(2) || "0.00"}</span>
</div>
```

### 6.2 Defect Cost Breakdown

```typescript
// Show cost breakdown in defect lists
<div className="text-xs text-gray-500 mt-1">
  <div className="flex justify-between">
    <span>Effective Defects:</span>
    <span>{effectiveDefects} units</span>
  </div>
  <div className="flex justify-between">
    <span>Cost Per Unit:</span>
    <span>${costPerUnit}/unit</span>
  </div>
  <div className="flex justify-between font-medium text-red-600">
    <span>Defect Cost:</span>
    <span>${(effectiveDefects * costPerUnit).toFixed(2)}</span>
  </div>
</div>
```

## 7. Data Migration and Setup

### 7.1 CSV Import Migration

```typescript
// Migration script to import existing standard_cost.csv
async function migrateStandardCosts() {
  const csvData = await fs.readFile("data/standard_cost.csv", "utf-8");
  const lines = csvData.split("\n");

  for (let i = 1; i < lines.length; i++) {
    // Skip header
    const [description, priceStr] = lines[i].split(",");
    if (description && priceStr) {
      const costPerUnit = parseFloat(priceStr.replace("$", ""));

      await prisma.standardCost.upsert({
        where: { itemName: description.trim() },
        update: { costPerUnit },
        create: {
          itemName: description.trim(),
          costPerUnit,
          isActive: true,
        },
      });
    }
  }
}
```

### 7.2 Historical Cost Assignment

```typescript
// Assign costs to existing production orders based on item name
async function assignHistoricalCosts() {
  const posWithoutCosts = await prisma.productionOrder.findMany({
    where: { costPerUnit: null },
    select: { id: true, itemName: true },
  });

  for (const po of posWithoutCosts) {
    const standardCost = await prisma.standardCost.findUnique({
      where: { itemName: po.itemName },
    });

    if (standardCost) {
      await prisma.productionOrder.update({
        where: { id: po.id },
        data: { costPerUnit: standardCost.costPerUnit },
      });
    }
  }
}
```

## 8. Security and Access Control

### 8.1 Standard Cost Management Access

- **Admin Only**: Full CRUD operations on standard costs
- **Manager**: Read-only access to standard costs
- **Encoder/Viewer**: No access to standard cost management

### 8.2 Cost Data Visibility

- **All Roles**: Can view defect costs in production orders (if they have PO access)
- **Dashboard Costs**: Available to all roles with dashboard access
- **Cost Reports**: Admin and Manager roles only

## 9. Performance Considerations

### 9.1 Database Indexing

```sql
-- Indexes for performance
CREATE INDEX "idx_standard_costs_item_active" ON "standard_costs"("itemName", "isActive");
CREATE INDEX "idx_production_orders_item_cost" ON "production_orders"("itemName", "costPerUnit");
CREATE INDEX "idx_operations_defect_cost" ON "operations"("defectCost");
```

### 9.2 Calculation Optimization

- **Batch Processing**: Process multiple cost calculations in transactions
- **Caching**: Cache frequently accessed standard costs
- **Background Jobs**: Large recalculations run in background

## 10. Testing Strategy

### 10.1 Unit Tests

- Cost calculation accuracy
- Standard cost CRUD operations
- Edge cases (missing costs, zero quantities)

### 10.2 Integration Tests

- Defect recording triggers cost calculation
- Standard cost updates affect ongoing POs only
- Dashboard chart data accuracy

### 10.3 Performance Tests

- Large dataset cost calculations
- Concurrent defect recording with cost updates
- Dashboard chart loading with filters

## 11. Deployment Checklist

### 11.1 Database Migration

- [ ] Run Prisma migration for new tables/columns
- [ ] Import existing CSV data to StandardCost table
- [ ] Assign costs to existing production orders
- [ ] Create database indexes

### 11.2 Code Deployment

- [ ] Deploy API endpoints
- [ ] Deploy frontend components
- [ ] Update navigation menus
- [ ] Test standard cost management UI

### 11.3 Data Validation

- [ ] Verify cost calculations accuracy
- [ ] Check dashboard chart data
- [ ] Validate historical cost assignments
- [ ] Test CSV import/export functionality

This documentation provides a comprehensive guide for implementing the Automatic Defect Cost Calculation system while maintaining simplicity and avoiding complex database relationships.
