#!/usr/bin/env ts-node

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

interface StandardCostSample {
  itemName: string;
  description: string;
  costPerUnit: number;
  currency: string;
}

/**
 * Generate realistic cost based on item name patterns
 */
function generateRealisticCost(itemName: string): number {
  const name = itemName.toUpperCase();

  // Base cost factors based on item type patterns
  let baseCost = 1.0;

  // Adjust cost based on item patterns
  if (name.includes("SUBASSY") || name.includes("SUB-ASSY")) {
    baseCost = Math.random() * 3 + 1.5; // $1.50 - $4.50 for sub-assemblies
  } else if (name.includes("HARNESS")) {
    baseCost = Math.random() * 5 + 2.0; // $2.00 - $7.00 for harnesses
  } else if (name.includes("CABLE") || name.includes("C7")) {
    baseCost = Math.random() * 4 + 0.5; // $0.50 - $4.50 for cables
  } else if (name.includes("MX")) {
    baseCost = Math.random() * 6 + 1.0; // $1.00 - $7.00 for MX items
  } else if (name.includes("CONNECTOR") || name.includes("CONN")) {
    baseCost = Math.random() * 2 + 0.8; // $0.80 - $2.80 for connectors
  } else if (name.includes("PCB") || name.includes("BOARD")) {
    baseCost = Math.random() * 8 + 3.0; // $3.00 - $11.00 for PCBs
  } else {
    baseCost = Math.random() * 3 + 0.5; // $0.50 - $3.50 for other items
  }

  // Add some variation based on length (longer part numbers often more complex)
  const lengthFactor = Math.min(name.length / 30, 1.5);
  baseCost *= 0.8 + lengthFactor * 0.4;

  // Round to 4 decimal places (standard for costs)
  return Math.round(baseCost * 10000) / 10000;
}

/**
 * Generate description based on item name
 */
function generateDescription(itemName: string): string {
  const name = itemName.toUpperCase();

  if (name.includes("SUBASSY") || name.includes("SUB-ASSY")) {
    return `${itemName} Sub-Assembly`;
  } else if (name.includes("HARNESS")) {
    return `${itemName} Wire Harness`;
  } else if (name.includes("CABLE")) {
    return `${itemName} Cable Assembly`;
  } else if (name.includes("CONNECTOR") || name.includes("CONN")) {
    return `${itemName} Connector`;
  } else if (name.includes("PCB") || name.includes("BOARD")) {
    return `${itemName} Printed Circuit Board`;
  } else if (name.includes("MX")) {
    return `${itemName} Connector Assembly`;
  } else {
    return `${itemName} Component`;
  }
}

/**
 * Main function to generate sample data
 */
async function main() {
  try {
    console.log("🔍 Connecting to database...");

    // Get unique item names from production orders
    const productionOrders = await prisma.productionOrder.findMany({
      select: {
        itemName: true,
      },
      where: {
        itemName: {
          not: null,
        },
      },
    });

    console.log(`📊 Found ${productionOrders.length} production orders`);

    // Extract unique item names
    const uniqueItemNames = Array.from(
      new Set(
        productionOrders
          .map((po) => po.itemName)
          .filter((name): name is string => name !== null && name.trim() !== "")
      )
    ).sort();

    console.log(`✨ Found ${uniqueItemNames.length} unique item names`);

    if (uniqueItemNames.length === 0) {
      console.log("⚠️  No item names found in production orders");
      return;
    }

    // Generate sample cost data
    const sampleData: StandardCostSample[] = uniqueItemNames.map(
      (itemName) => ({
        itemName,
        description: generateDescription(itemName),
        costPerUnit: generateRealisticCost(itemName),
        currency: "USD",
      })
    );

    console.log("💰 Generated costs for all items");
    console.log(
      `   - Average cost: $${(
        sampleData.reduce((sum, item) => sum + item.costPerUnit, 0) /
        sampleData.length
      ).toFixed(4)}`
    );
    console.log(
      `   - Min cost: $${Math.min(
        ...sampleData.map((item) => item.costPerUnit)
      ).toFixed(4)}`
    );
    console.log(
      `   - Max cost: $${Math.max(
        ...sampleData.map((item) => item.costPerUnit)
      ).toFixed(4)}`
    );

    // Create CSV content
    const csvHeader = "Item Name,Description,Cost Per Unit,Currency\n";
    const csvRows = sampleData
      .map((item) => {
        // Escape commas in item names and descriptions
        const itemName = `"${item.itemName.replace(/"/g, '""')}"`;
        const description = `"${item.description.replace(/"/g, '""')}"`;
        const cost = item.costPerUnit.toFixed(4);
        return `${itemName},${description},${cost},${item.currency}`;
      })
      .join("\n");

    const csvContent = csvHeader + csvRows;

    // Ensure data directory exists
    const dataDir = path.join(__dirname, "../data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`📁 Created data directory: ${dataDir}`);
    }

    // Write CSV file
    const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const filename = `standard_costs_sample_${timestamp}.csv`;
    const filepath = path.join(dataDir, filename);

    fs.writeFileSync(filepath, csvContent, "utf-8");
    console.log(`💾 Sample data written to: ${filepath}`);

    // Also create a version without timestamp for template use
    const templateFilepath = path.join(dataDir, "standard_costs_sample.csv");
    fs.writeFileSync(templateFilepath, csvContent, "utf-8");
    console.log(`📋 Template file created: ${templateFilepath}`);

    // Show some sample data
    console.log("\n📋 Sample of generated data:");
    console.log("Item Name\t\t\t\tCost\tDescription");
    console.log("-".repeat(80));
    sampleData.slice(0, 10).forEach((item) => {
      const shortName =
        item.itemName.length > 25
          ? item.itemName.substring(0, 22) + "..."
          : item.itemName.padEnd(25);
      const cost = `$${item.costPerUnit.toFixed(4)}`;
      const shortDesc =
        item.description.length > 30
          ? item.description.substring(0, 27) + "..."
          : item.description;
      console.log(`${shortName}\t${cost}\t${shortDesc}`);
    });

    if (sampleData.length > 10) {
      console.log(`... and ${sampleData.length - 10} more items`);
    }

    console.log(`\n✅ Successfully generated sample standard costs data!`);
    console.log(`📂 Files created:`);
    console.log(`   - ${filename} (timestamped version)`);
    console.log(`   - standard_costs_sample.csv (template version)`);
    console.log(
      `\n💡 You can now use these files as sample data for testing the import functionality.`
    );
  } catch (error) {
    console.error("❌ Error generating sample data:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script immediately
main().catch((error) => {
  console.error("💥 Script failed:", error);
  process.exit(1);
});

export default main;
