-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'Encoder',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLogin" TIMESTAMP(3),
    "department" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_orders" (
    "id" SERIAL NOT NULL,
    "poNumber" TEXT NOT NULL,
    "lotNumber" TEXT,
    "poQuantity" INTEGER NOT NULL,
    "itemName" TEXT,
    "status" TEXT NOT NULL,
    "currentOperation" TEXT,
    "currentOperationStartTime" TIMESTAMP(3),
    "currentOperationEndTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "editingUserId" INTEGER,
    "editingUserName" TEXT,
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "production_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations" (
    "id" SERIAL NOT NULL,
    "productionOrderId" INTEGER NOT NULL,
    "operation" TEXT NOT NULL,
    "operatorId" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "inputQuantity" INTEGER NOT NULL,
    "outputQuantity" INTEGER,
    "productionHours" DOUBLE PRECISION,
    "accumulatedManHours" DOUBLE PRECISION,
    "rf" INTEGER,
    "lineNo" TEXT,
    "shift" TEXT,
    "encodedById" INTEGER NOT NULL,
    "encodedTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defects" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "applicableOperation" TEXT,
    "reworkable" BOOLEAN NOT NULL DEFAULT false,
    "machine" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deactivatedAt" TIMESTAMP(3),
    "deactivatedById" INTEGER,

    CONSTRAINT "defects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_defects" (
    "id" SERIAL NOT NULL,
    "operationId" INTEGER NOT NULL,
    "defect_id" INTEGER,
    "defectCategory" TEXT NOT NULL,
    "defectMachine" TEXT,
    "defectReworkable" BOOLEAN NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "quantityRework" INTEGER NOT NULL DEFAULT 0,
    "quantityNogood" INTEGER NOT NULL DEFAULT 0,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" INTEGER NOT NULL,

    CONSTRAINT "operation_defects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_defect_edit_requests" (
    "id" SERIAL NOT NULL,
    "operationDefectId" INTEGER NOT NULL,
    "operationId" INTEGER NOT NULL,
    "productionOrderId" INTEGER NOT NULL,
    "requestedById" INTEGER NOT NULL,
    "currentQty" INTEGER NOT NULL,
    "currentRw" INTEGER NOT NULL,
    "currentNg" INTEGER NOT NULL,
    "requestedQty" INTEGER NOT NULL,
    "requestedRw" INTEGER NOT NULL,
    "requestedNg" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolvedById" INTEGER,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "operation_defect_edit_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_steps" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "operationNumber" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,

    CONSTRAINT "operation_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValues" TEXT,
    "newValues" TEXT,
    "userId" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "production_orders_poNumber_key" ON "production_orders"("poNumber");

-- CreateIndex
CREATE UNIQUE INDEX "defects_name_key" ON "defects"("name");

-- CreateIndex
CREATE UNIQUE INDEX "operation_defects_operationId_defect_id_recordedAt_key" ON "operation_defects"("operationId", "defect_id", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "operation_steps_operationNumber_key" ON "operation_steps"("operationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "production_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_encodedById_fkey" FOREIGN KEY ("encodedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_deactivatedById_fkey" FOREIGN KEY ("deactivatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_defects" ADD CONSTRAINT "operation_defects_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_defects" ADD CONSTRAINT "operation_defects_defect_id_fkey" FOREIGN KEY ("defect_id") REFERENCES "defects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_defects" ADD CONSTRAINT "operation_defects_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_defect_edit_requests" ADD CONSTRAINT "operation_defect_edit_requests_operationDefectId_fkey" FOREIGN KEY ("operationDefectId") REFERENCES "operation_defects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_defect_edit_requests" ADD CONSTRAINT "operation_defect_edit_requests_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_defect_edit_requests" ADD CONSTRAINT "operation_defect_edit_requests_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "production_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_defect_edit_requests" ADD CONSTRAINT "operation_defect_edit_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_defect_edit_requests" ADD CONSTRAINT "operation_defect_edit_requests_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
