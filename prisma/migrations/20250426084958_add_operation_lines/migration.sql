-- CreateTable
CREATE TABLE "operation_lines" (
    "id" SERIAL NOT NULL,
    "operationNumber" TEXT NOT NULL,
    "lineNumber" TEXT NOT NULL,

    CONSTRAINT "operation_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "operation_lines_operationNumber_lineNumber_key" ON "operation_lines"("operationNumber", "lineNumber");
