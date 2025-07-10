-- AlterTable
ALTER TABLE "operation_defect_edit_requests" ADD COLUMN     "currentReplacement" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "operationCode" TEXT,
ADD COLUMN     "requestedReplacement" INTEGER NOT NULL DEFAULT 0;
