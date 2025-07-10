/*
  Warnings:

  - You are about to drop the `defects` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateTable
CREATE TABLE "master_defects" (
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

    CONSTRAINT "master_defects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "master_defects_name_key" ON "master_defects"("name");

-- Copy data from defects to master_defects
INSERT INTO "master_defects" ("id", "name", "description", "category", "applicableOperation", "reworkable", "machine", "isActive", "deactivatedAt", "deactivatedById")
SELECT "id", "name", "description", "category", "applicableOperation", "reworkable", "machine", "isActive", "deactivatedAt", "deactivatedById"
FROM "defects";

-- AddForeignKey
ALTER TABLE "master_defects" ADD CONSTRAINT "master_defects_deactivatedById_fkey" FOREIGN KEY ("deactivatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "operation_defects" DROP CONSTRAINT "operation_defects_defect_id_fkey";

-- AddForeignKey
ALTER TABLE "operation_defects" ADD CONSTRAINT "operation_defects_defect_id_fkey" FOREIGN KEY ("defect_id") REFERENCES "master_defects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "defects" DROP CONSTRAINT "defects_deactivatedById_fkey";

-- DropTable
DROP TABLE "defects";
