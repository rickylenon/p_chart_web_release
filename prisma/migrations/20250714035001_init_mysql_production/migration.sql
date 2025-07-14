-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'Encoder',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastLogin` DATETIME(3) NULL,
    `department` VARCHAR(191) NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `production_orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `poNumber` VARCHAR(191) NOT NULL,
    `lotNumber` VARCHAR(191) NULL,
    `poQuantity` INTEGER NOT NULL,
    `itemName` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL,
    `currentOperation` VARCHAR(191) NULL,
    `currentOperationStartTime` DATETIME(3) NULL,
    `currentOperationEndTime` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `editingUserId` INTEGER NULL,
    `editingUserName` VARCHAR(191) NULL,
    `lockedAt` DATETIME(3) NULL,
    `costPerUnit` DECIMAL(10, 4) NULL,
    `totalDefectCost` DECIMAL(10, 2) NULL DEFAULT 0,
    `lastCostUpdate` DATETIME(3) NULL,

    UNIQUE INDEX `production_orders_poNumber_key`(`poNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `operations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productionOrderId` INTEGER NOT NULL,
    `operation` VARCHAR(191) NOT NULL,
    `operatorId` INTEGER NOT NULL,
    `startTime` DATETIME(3) NULL,
    `endTime` DATETIME(3) NULL,
    `inputQuantity` INTEGER NOT NULL,
    `outputQuantity` INTEGER NULL,
    `productionHours` DOUBLE NULL,
    `accumulatedManHours` DOUBLE NULL,
    `rf` INTEGER NULL,
    `lineNo` VARCHAR(191) NULL,
    `shift` VARCHAR(191) NULL,
    `encodedById` INTEGER NOT NULL,
    `encodedTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `defectCost` DECIMAL(10, 2) NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `master_defects` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `applicableOperation` VARCHAR(191) NULL,
    `reworkable` BOOLEAN NOT NULL DEFAULT false,
    `machine` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deactivatedAt` DATETIME(3) NULL,
    `deactivatedById` INTEGER NULL,

    UNIQUE INDEX `master_defects_name_applicableOperation_key`(`name`, `applicableOperation`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `standard_costs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `itemName` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `costPerUnit` DECIMAL(10, 4) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdById` INTEGER NULL,
    `updatedById` INTEGER NULL,

    UNIQUE INDEX `standard_costs_itemName_key`(`itemName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `operation_defects` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `operationId` INTEGER NOT NULL,
    `defect_id` INTEGER NULL,
    `defectName` VARCHAR(191) NULL,
    `defectCategory` VARCHAR(191) NOT NULL,
    `defectMachine` VARCHAR(191) NULL,
    `defectReworkable` BOOLEAN NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `quantityRework` INTEGER NOT NULL DEFAULT 0,
    `quantityNogood` INTEGER NOT NULL DEFAULT 0,
    `quantityReplacement` INTEGER NOT NULL DEFAULT 0,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `recordedById` INTEGER NOT NULL,

    UNIQUE INDEX `operation_defects_operationId_defect_id_recordedAt_key`(`operationId`, `defect_id`, `recordedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `operation_defect_edit_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `operationDefectId` INTEGER NULL,
    `operationId` INTEGER NOT NULL,
    `productionOrderId` INTEGER NOT NULL,
    `requestedById` INTEGER NOT NULL,
    `requestType` VARCHAR(191) NOT NULL DEFAULT 'edit',
    `defectId` INTEGER NULL,
    `defectName` VARCHAR(191) NULL,
    `defectCategory` VARCHAR(191) NULL,
    `defectReworkable` BOOLEAN NULL,
    `defectMachine` VARCHAR(191) NULL,
    `currentQty` INTEGER NOT NULL,
    `currentRw` INTEGER NOT NULL,
    `currentNg` INTEGER NOT NULL,
    `currentReplacement` INTEGER NOT NULL DEFAULT 0,
    `requestedQty` INTEGER NOT NULL,
    `requestedRw` INTEGER NOT NULL,
    `requestedNg` INTEGER NOT NULL,
    `requestedReplacement` INTEGER NOT NULL DEFAULT 0,
    `operationCode` VARCHAR(191) NULL,
    `reason` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `resolvedById` INTEGER NULL,
    `resolutionNote` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `operation_steps` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `label` VARCHAR(191) NOT NULL,
    `operationNumber` VARCHAR(191) NOT NULL,
    `stepOrder` INTEGER NOT NULL,

    UNIQUE INDEX `operation_steps_operationNumber_key`(`operationNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tableName` VARCHAR(191) NOT NULL,
    `recordId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `oldValues` TEXT NULL,
    `newValues` TEXT NULL,
    `userId` INTEGER NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `lastActivity` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sessions_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `linkUrl` VARCHAR(191) NULL,
    `userId` INTEGER NOT NULL,
    `sourceId` VARCHAR(191) NULL,
    `sourceType` VARCHAR(191) NULL,
    `metadata` JSON NULL,

    INDEX `notifications_userId_idx`(`userId`),
    INDEX `notifications_type_idx`(`type`),
    INDEX `notifications_isRead_idx`(`isRead`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `operation_lines` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `operationNumber` VARCHAR(191) NOT NULL,
    `lineNumber` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `operation_lines_operationNumber_lineNumber_key`(`operationNumber`, `lineNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `operations` ADD CONSTRAINT `operations_encodedById_fkey` FOREIGN KEY (`encodedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `operations` ADD CONSTRAINT `operations_operatorId_fkey` FOREIGN KEY (`operatorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `operations` ADD CONSTRAINT `operations_productionOrderId_fkey` FOREIGN KEY (`productionOrderId`) REFERENCES `production_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `master_defects` ADD CONSTRAINT `master_defects_deactivatedById_fkey` FOREIGN KEY (`deactivatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `operation_defects` ADD CONSTRAINT `operation_defects_defect_id_fkey` FOREIGN KEY (`defect_id`) REFERENCES `master_defects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `operation_defects` ADD CONSTRAINT `operation_defects_operationId_fkey` FOREIGN KEY (`operationId`) REFERENCES `operations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `operation_defects` ADD CONSTRAINT `operation_defects_recordedById_fkey` FOREIGN KEY (`recordedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `operation_defect_edit_requests` ADD CONSTRAINT `operation_defect_edit_requests_operationDefectId_fkey` FOREIGN KEY (`operationDefectId`) REFERENCES `operation_defects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `operation_defect_edit_requests` ADD CONSTRAINT `operation_defect_edit_requests_operationId_fkey` FOREIGN KEY (`operationId`) REFERENCES `operations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `operation_defect_edit_requests` ADD CONSTRAINT `operation_defect_edit_requests_productionOrderId_fkey` FOREIGN KEY (`productionOrderId`) REFERENCES `production_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `operation_defect_edit_requests` ADD CONSTRAINT `operation_defect_edit_requests_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `operation_defect_edit_requests` ADD CONSTRAINT `operation_defect_edit_requests_resolvedById_fkey` FOREIGN KEY (`resolvedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
