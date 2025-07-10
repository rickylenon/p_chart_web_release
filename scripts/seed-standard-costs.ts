#!/usr/bin/env ts-node

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface StandardCostData {
  itemName: string;
  description: string;
  costPerUnit: number;
  currency: string;
}

/**
 * Parse CSV price string to number
 * Handles formats like "$1.61", "1.61", etc.
 */
function parsePriceString(priceStr: string): number {
  // Remove currency symbols and whitespace
  const cleanPrice = priceStr.replace(/[$,\s]/g, "");
  const price = parseFloat(cleanPrice);

  if (isNaN(price)) {
    throw new Error(`Invalid price format: ${priceStr}`);
  }

  return price;
}

/**
 * Read and parse the CSV file using simple string operations
 */
function readCsvFile(filePath: string): StandardCostData[] {
  console.log(`📁 Reading CSV file: ${filePath}`);

  const csvData = fs.readFileSync(filePath, "utf-8");
  const lines = csvData.split("\n");

  if (lines.length < 2) {
    throw new Error("CSV file must have at least a header and one data row");
  }

  const results: StandardCostData[] = [];

  // Process each line (skip header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    try {
      const [description, priceStr] = line.split(",");

      if (!description || !priceStr) {
        console.warn(
          `⚠️  Line ${i + 1}: Missing description or price - skipping`
        );
        continue;
      }

      const itemName = description.trim();
      const costPerUnit = parsePriceString(priceStr);

      results.push({
        itemName,
        description: itemName, // Using same as itemName for now
        costPerUnit,
        currency: "USD",
      });
    } catch (error: any) {
      console.warn(`⚠️  Line ${i + 1}: ${error.message} - skipping`);
    }
  }

  console.log(`✅ Parsed ${results.length} standard cost records from CSV`);
  return results;
}

/**
 * Upsert standard costs into the database
 */
async function upsertStandardCosts(
  standardCosts: StandardCostData[]
): Promise<void> {
  console.log("🔄 Upserting standard costs...");

  let created = 0;
  let updated = 0;

  for (const cost of standardCosts) {
    try {
      // Check if it exists first to determine if it's create or update
      const existing = await prisma.standardCost.findUnique({
        where: { itemName: cost.itemName },
      });

      await prisma.standardCost.upsert({
        where: {
          itemName: cost.itemName,
        },
        update: {
          description: cost.description,
          costPerUnit: cost.costPerUnit,
          currency: cost.currency,
          isActive: true,
          updatedAt: new Date(),
        },
        create: {
          itemName: cost.itemName,
          description: cost.description,
          costPerUnit: cost.costPerUnit,
          currency: cost.currency,
          isActive: true,
        },
      });

      if (existing) {
        updated++;
      } else {
        created++;
      }
    } catch (error: any) {
      console.error(`❌ Error upserting cost for ${cost.itemName}:`, error);
    }
  }

  console.log(
    `✅ Standard costs upserted: ${created} created, ${updated} updated`
  );
}

/**
 * Update production orders with cost information
 */
async function updateProductionOrderCosts(): Promise<void> {
  console.log("🔄 Updating production orders with cost information...");

  // Get all production orders that don't have cost information
  const ordersWithoutCosts = await prisma.productionOrder.findMany({
    where: {
      costPerUnit: null,
    },
    select: {
      id: true,
      poNumber: true,
      itemName: true,
      poQuantity: true,
    },
  });

  console.log(
    `📊 Found ${ordersWithoutCosts.length} production orders without cost information`
  );

  let updated = 0;
  let notFound = 0;

  for (const order of ordersWithoutCosts) {
    if (!order.itemName) {
      console.warn(`⚠️  Skipping PO ${order.poNumber} - no item name`);
      continue;
    }

    try {
      // Find matching standard cost
      const standardCost = await prisma.standardCost.findFirst({
        where: {
          itemName: order.itemName,
          isActive: true,
        },
      });

      if (standardCost) {
        // Update production order with cost information
        await prisma.productionOrder.update({
          where: { id: order.id },
          data: {
            costPerUnit: standardCost.costPerUnit,
            lastCostUpdate: new Date(),
            totalDefectCost: 0, // Will be calculated in the next step
          },
        });

        updated++;
        console.log(
          `✅ Updated PO ${order.poNumber} (${order.itemName}) with cost $${standardCost.costPerUnit}`
        );
      } else {
        notFound++;
        console.warn(
          `⚠️  No standard cost found for PO ${order.poNumber} item: ${order.itemName}`
        );
      }
    } catch (error: any) {
      console.error(`❌ Error updating PO ${order.poNumber}:`, error);
    }
  }

  console.log(
    `✅ Production orders updated: ${updated} updated, ${notFound} items not found in standard costs`
  );
}

/**
 * Update operations with defect costs (for existing operations)
 */
async function updateOperationDefectCosts(): Promise<void> {
  console.log("🔄 Updating operations with defect costs...");

  // Get all operations that belong to production orders with cost information
  const operations = await prisma.operation.findMany({
    where: {
      defectCost: null,
      productionOrder: {
        costPerUnit: {
          not: null,
        },
      },
    },
    include: {
      productionOrder: true,
      operationDefects: true,
    },
  });

  console.log(
    `📊 Found ${operations.length} operations to update with defect costs`
  );

  let updated = 0;

  for (const operation of operations) {
    try {
      // Calculate defect cost for this operation
      const totalDefects = operation.operationDefects.reduce(
        (sum, defect) => sum + defect.quantity,
        0
      );
      const costPerUnit = operation.productionOrder.costPerUnit
        ? Number(operation.productionOrder.costPerUnit)
        : 0;
      const defectCost = totalDefects * costPerUnit;

      await prisma.operation.update({
        where: { id: operation.id },
        data: {
          defectCost: defectCost,
        },
      });

      updated++;

      if (totalDefects > 0) {
        console.log(
          `✅ Updated operation ${
            operation.operation
          } with defect cost $${defectCost.toFixed(
            2
          )} (${totalDefects} defects)`
        );
      }
    } catch (error: any) {
      console.error(
        `❌ Error updating operation ${operation.operation}:`,
        error
      );
    }
  }

  console.log(`✅ Operations updated with defect costs: ${updated}`);
}

/**
 * Recalculate total defect costs for production orders
 */
async function recalculateProductionOrderDefectCosts(): Promise<void> {
  console.log("🔄 Recalculating total defect costs for production orders...");

  const productionOrders = await prisma.productionOrder.findMany({
    where: {
      costPerUnit: {
        not: null,
      },
    },
    include: {
      operations: {
        include: {
          operationDefects: true,
        },
      },
    },
  });

  console.log(
    `📊 Found ${productionOrders.length} production orders to recalculate defect costs`
  );

  let updated = 0;

  for (const po of productionOrders) {
    try {
      // Calculate total defect cost across all operations
      let totalDefectCost = 0;
      const costPerUnit = po.costPerUnit ? Number(po.costPerUnit) : 0;

      for (const operation of po.operations) {
        const operationDefects = operation.operationDefects.reduce(
          (sum, defect) => sum + defect.quantity,
          0
        );
        totalDefectCost += operationDefects * costPerUnit;
      }

      await prisma.productionOrder.update({
        where: { id: po.id },
        data: {
          totalDefectCost: totalDefectCost,
          lastCostUpdate: new Date(),
        },
      });

      updated++;

      if (totalDefectCost > 0) {
        console.log(
          `✅ Updated PO ${
            po.poNumber
          } total defect cost: $${totalDefectCost.toFixed(2)}`
        );
      }
    } catch (error: any) {
      console.error(
        `❌ Error recalculating defect cost for PO ${po.poNumber}:`,
        error
      );
    }
  }

  console.log(`✅ Production order defect costs recalculated: ${updated}`);
}

/**
 * Main seeding function
 */
async function main() {
  try {
    console.log("🚀 Starting standard costs seeding process...");

    // Path to the CSV file
    const csvPath = path.join(process.cwd(), "data", "standard_cost.csv");

    // Check if CSV file exists
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }

    // Step 1: Read and parse CSV
    const standardCosts = readCsvFile(csvPath);

    if (standardCosts.length === 0) {
      throw new Error("No valid standard cost data found in CSV");
    }

    // Step 2: Upsert standard costs
    await upsertStandardCosts(standardCosts);

    // Step 3: Update production orders with cost information
    await updateProductionOrderCosts();

    // Step 4: Update operations with defect costs
    await updateOperationDefectCosts();

    // Step 5: Recalculate total defect costs for production orders
    await recalculateProductionOrderDefectCosts();

    console.log("🎉 Standard costs seeding completed successfully!");

    // Print summary
    const totalStandardCosts = await prisma.standardCost.count({
      where: { isActive: true },
    });
    const ordersWithCosts = await prisma.productionOrder.count({
      where: { costPerUnit: { not: null } },
    });
    const totalOrders = await prisma.productionOrder.count();

    console.log("\n📊 Summary:");
    console.log(`   • Active standard costs: ${totalStandardCosts}`);
    console.log(
      `   • Production orders with costs: ${ordersWithCosts}/${totalOrders}`
    );
    console.log(
      `   • Coverage: ${((ordersWithCosts / totalOrders) * 100).toFixed(1)}%`
    );
  } catch (error: any) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main().catch(console.error);

export { main as seedStandardCosts };
