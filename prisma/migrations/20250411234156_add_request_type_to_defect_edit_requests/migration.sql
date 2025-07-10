-- DropForeignKey
ALTER TABLE "operation_defect_edit_requests" DROP CONSTRAINT "operation_defect_edit_requests_operationDefectId_fkey";

-- AlterTable
ALTER TABLE "operation_defect_edit_requests" ADD COLUMN     "defectCategory" TEXT,
ADD COLUMN     "defectId" INTEGER,
ADD COLUMN     "defectMachine" TEXT,
ADD COLUMN     "defectName" TEXT,
ADD COLUMN     "defectReworkable" BOOLEAN,
ADD COLUMN     "requestType" TEXT NOT NULL DEFAULT 'edit',
ALTER COLUMN "operationDefectId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "operation_defects" ADD COLUMN     "defectName" TEXT;

-- AddForeignKey
ALTER TABLE "operation_defect_edit_requests" ADD CONSTRAINT "operation_defect_edit_requests_operationDefectId_fkey" FOREIGN KEY ("operationDefectId") REFERENCES "operation_defects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
