// Script to update OP10 defects to have quantityReplacement equal to quantity
// where quantityReplacement is 0 or undefined
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log(
    "Starting migration of OP10 operation defects replacement quantities..."
  );

  try {
    // First, check if the quantityReplacement field exists in the schema
    let hasReplacementField = true;
    try {
      // Try to access an operation defect to check the schema
      const sampleDefect = await prisma.operationDefect.findFirst({
        select: {
          id: true,
        },
      });

      // If we found a defect, try to update it with quantityReplacement to see if field exists
      if (sampleDefect) {
        try {
          await prisma.$executeRaw`SELECT "quantityReplacement" FROM "operation_defects" LIMIT 1`;
          console.log("quantityReplacement field exists in the schema.");
        } catch (e) {
          console.log(
            "quantityReplacement field does not exist in the schema yet."
          );
          hasReplacementField = false;

          // Let's try to add the field if it doesn't exist
          console.log(
            "Attempting to add the quantityReplacement field to the schema..."
          );
          try {
            await prisma.$executeRaw`ALTER TABLE "operation_defects" ADD COLUMN "quantityReplacement" INTEGER NOT NULL DEFAULT 0`;
            console.log(
              "Successfully added quantityReplacement field to the schema!"
            );
            hasReplacementField = true;
          } catch (alterErr) {
            console.error("Error adding the field:", alterErr.message);
            return; // Exit if we can't add the field
          }
        }
      }
    } catch (e) {
      console.error("Error checking schema:", e);
      return; // Exit if we can't check the schema
    }

    if (!hasReplacementField) {
      console.log(
        "Cannot proceed with migration without the quantityReplacement field."
      );
      return;
    }

    // 1. Find all operations with operation code 'OP10'
    const op10Operations = await prisma.operation.findMany({
      where: {
        operation: "OP10",
      },
      select: {
        id: true,
        operation: true,
        productionOrderId: true,
        productionOrder: {
          select: {
            poNumber: true,
          },
        },
      },
    });

    console.log(`Found ${op10Operations.length} OP10 operations`);

    let totalUpdated = 0;

    for (const op of op10Operations) {
      // 2. For each OP10 operation, find defects that need updating
      // First get all defects for this operation
      const allDefects = await prisma.operationDefect.findMany({
        where: {
          operationId: op.id,
        },
      });

      console.log(
        `PO: ${op.productionOrder.poNumber} - Found ${allDefects.length} total defects`
      );

      // Filter defects that need updating (with zero replacement or equal to quantity)
      const defectsToUpdate = allDefects.filter(
        (d) =>
          d.quantityReplacement === 0 ||
          d.quantityReplacement === null ||
          d.quantityReplacement === undefined
      );

      console.log(
        `${defectsToUpdate.length} defects need quantityReplacement update`
      );

      // 3. Update each defect to set replacement = quantity
      for (const defect of defectsToUpdate) {
        await prisma.operationDefect.update({
          where: { id: defect.id },
          data: {
            quantityReplacement: defect.quantity,
          },
        });

        console.log(
          `  Updated defect ID ${defect.id}: quantity=${defect.quantity}, quantityReplacement set to ${defect.quantity}`
        );
        totalUpdated++;
      }
    }

    console.log(
      `Migration completed successfully! Updated ${totalUpdated} defect records.`
    );
  } catch (error) {
    console.error("Error during migration:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
