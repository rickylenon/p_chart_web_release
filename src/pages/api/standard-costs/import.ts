import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { withAuth } from "@/lib/auth";
import ExcelJS from "exceljs";
import multer from "multer";
import { Readable } from "stream";
import path from "path";

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".xlsx" && ext !== ".xls" && ext !== ".csv") {
      return cb(
        new Error("Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed")
      );
    }
    cb(null, true);
  },
});

// Helper function to run middleware
const runMiddleware = (req: NextApiRequest, res: NextApiResponse, fn: any) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
};

// Configure body parser settings for Next.js API
export const config = {
  api: {
    bodyParser: false,
  },
};

interface StandardCostRecord {
  itemName: string;
  description: string;
  costPerUnit: number;
  currency: string;
  lineNumber: number;
}

// Helper function to parse CSV data
function parseCSVData(csvData: string): StandardCostRecord[] {
  const lines = csvData
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line);
  const records: StandardCostRecord[] = [];
  const errors: string[] = [];

  if (lines.length < 2) {
    throw new Error("CSV file must have at least a header and one data row");
  }

  // Process each line (skip header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    try {
      // Handle CSV with potential commas in quoted fields
      const csvMatch = line.match(
        /^"?([^",]+)"?,\s*"?([^",]*)"?,\s*([^,]+),\s*(.+)$/
      );
      if (!csvMatch) {
        errors.push(`Line ${i + 1}: Invalid CSV format`);
        continue;
      }

      const [, itemName, description, costPerUnitStr, currency] = csvMatch;

      if (!itemName || !costPerUnitStr) {
        errors.push(`Line ${i + 1}: Missing Item Name or Cost Per Unit`);
        continue;
      }

      const cleanCostStr = costPerUnitStr.replace(/[$,\s]/g, "");
      const costPerUnit = parseFloat(cleanCostStr);

      if (isNaN(costPerUnit) || costPerUnit < 0) {
        errors.push(`Line ${i + 1}: Invalid cost per unit "${costPerUnitStr}"`);
        continue;
      }

      records.push({
        itemName: itemName.trim(),
        description: description?.trim() || itemName.trim(),
        costPerUnit,
        currency: currency?.trim() || "USD",
        lineNumber: i + 1,
      });
    } catch (error) {
      errors.push(
        `Line ${i + 1}: Parse error - ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  if (errors.length > 0) {
    console.warn("CSV parsing errors:", errors);
  }

  return records;
}

// Helper function to parse Excel data
async function parseExcelData(buffer: Buffer): Promise<StandardCostRecord[]> {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.read(stream);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("Excel file contains no worksheets");
  }

  // Extract column headers
  const headers: Record<string, number> = {};
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    headers[cell.value?.toString().trim() || ""] = colNumber;
  });

  // Check if required columns exist
  const requiredColumns = ["Item Name", "Cost Per Unit"];
  const missingColumns = requiredColumns.filter((col) => !(col in headers));
  if (missingColumns.length > 0) {
    throw new Error(
      `Excel file is missing required columns: ${missingColumns.join(", ")}`
    );
  }

  const records: StandardCostRecord[] = [];
  let rowCount = 0;

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header row

    rowCount++;
    const itemName = row.getCell(headers["Item Name"]).value?.toString().trim();
    const description = headers["Description"]
      ? row.getCell(headers["Description"]).value?.toString().trim()
      : "";
    const costPerUnitStr = row
      .getCell(headers["Cost Per Unit"])
      .value?.toString()
      .trim();
    const currency = headers["Currency"]
      ? row.getCell(headers["Currency"]).value?.toString().trim()
      : "USD";

    if (!itemName || !costPerUnitStr) {
      throw new Error(
        `Row ${rowNumber}: Missing required fields (Item Name or Cost Per Unit)`
      );
    }

    const cleanCostStr = costPerUnitStr.replace(/[$,\s]/g, "");
    const costPerUnit = parseFloat(cleanCostStr);

    if (isNaN(costPerUnit) || costPerUnit < 0) {
      throw new Error(
        `Row ${rowNumber}: Invalid cost per unit "${costPerUnitStr}"`
      );
    }

    records.push({
      itemName,
      description: description || itemName,
      costPerUnit,
      currency: currency || "USD",
      lineNumber: rowNumber,
    });
  });

  return records;
}

// Helper function to update production orders with new costs
async function updateProductionOrderCosts(
  updatedItems: string[]
): Promise<{ updated: number; skipped: number }> {
  console.log(
    `🔄 Updating production orders for ${updatedItems.length} items...`
  );

  let updated = 0;
  let skipped = 0;

  for (const itemName of updatedItems) {
    try {
      // Find the standard cost for this item
      const standardCost = await prisma.standardCost.findUnique({
        where: { itemName },
        select: { costPerUnit: true, isActive: true },
      });

      if (!standardCost || !standardCost.isActive) {
        console.warn(
          `⚠️  Standard cost not found or inactive for item: ${itemName}`
        );
        continue;
      }

      // Update production orders that meet the criteria:
      // 1. Same item name
      // 2. costPerUnit is NULL or 0
      // 3. Status is NOT 'Completed'
      const updateResult = await prisma.productionOrder.updateMany({
        where: {
          itemName: itemName,
          OR: [{ costPerUnit: null }, { costPerUnit: 0 }],
          status: {
            not: "Completed",
          },
        },
        data: {
          costPerUnit: standardCost.costPerUnit,
          lastCostUpdate: new Date(),
        },
      });

      if (updateResult.count > 0) {
        updated += updateResult.count;
        console.log(
          `✅ Updated ${updateResult.count} production orders for ${itemName} with cost $${standardCost.costPerUnit}`
        );
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(
        `❌ Error updating production orders for ${itemName}:`,
        error
      );
      skipped++;
    }
  }

  console.log(
    `📊 Production order update summary: ${updated} updated, ${skipped} skipped`
  );
  return { updated, skipped };
}

// Helper function to process records in batches
async function processBatch(
  records: StandardCostRecord[],
  userId: number | null
): Promise<{ success: number; errors: string[]; updatedItems: string[] }> {
  let successCount = 0;
  const errors: string[] = [];
  const updatedItems: string[] = [];

  for (const record of records) {
    try {
      await prisma.standardCost.upsert({
        where: { itemName: record.itemName },
        update: {
          description: record.description,
          costPerUnit: record.costPerUnit,
          currency: record.currency,
          updatedById: userId,
          updatedAt: new Date(),
        },
        create: {
          itemName: record.itemName,
          description: record.description,
          costPerUnit: record.costPerUnit,
          currency: record.currency,
          isActive: true,
          createdById: userId,
        },
      });
      successCount++;
      updatedItems.push(record.itemName);
    } catch (error) {
      console.error(`Error processing ${record.itemName}:`, error);
      errors.push(
        `Line ${record.lineNumber}: Failed to process ${record.itemName} - ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  return { success: successCount, errors, updatedItems };
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  const startTime = Date.now();

  try {
    console.log(
      "API: StandardCosts import auth session validated, user:",
      session?.user?.name
    );

    // Check if user has admin role
    const userRole = session?.user?.role || "";
    const isAdmin = userRole.toLowerCase() === "admin";

    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    console.log("Processing file upload...");

    // Run the multer middleware to handle file upload
    await runMiddleware(req, res, upload.single("file"));

    // Check if file exists
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Get replaceAll option from form data
    const replaceAll = req.body?.replaceAll === "true";
    console.log(`Import mode: ${replaceAll ? "Replace All" : "Update/Add"}`);

    const fileExt = path.extname(file.originalname).toLowerCase();
    console.log(
      `Received file: ${file.originalname}, size: ${file.size} bytes, type: ${fileExt}`
    );

    // Get user ID for audit tracking
    const userId = session?.user?.id ? parseInt(session.user.id) : null;

    let validRecords: StandardCostRecord[] = [];
    let totalErrorCount = 0;
    const allErrors: string[] = [];

    // Parse file based on extension
    try {
      if (fileExt === ".csv") {
        console.log("Parsing CSV file...");
        const csvData = file.buffer.toString("utf-8");
        validRecords = parseCSVData(csvData);
      } else {
        console.log("Parsing Excel file...");
        validRecords = await parseExcelData(file.buffer);
      }

      console.log(`Validation complete: ${validRecords.length} valid records`);
    } catch (error) {
      console.error("Error parsing file:", error);
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to parse file",
      });
    }

    if (validRecords.length === 0) {
      return res.status(400).json({
        error: "No valid records found in file",
        errors: allErrors.slice(0, 10),
      });
    }

    let totalSuccessCount = 0;
    let totalDeletedCount = 0;
    const allUpdatedItems: string[] = [];

    // Use database transaction for Replace All mode to ensure data integrity
    if (replaceAll) {
      console.log("🔄 Replace All mode: Starting transaction...");

      await prisma.$transaction(async (tx) => {
        // First, delete all existing standard costs
        const deleteResult = await tx.standardCost.deleteMany({});
        totalDeletedCount = deleteResult.count;
        console.log(`🗑️  Deleted ${totalDeletedCount} existing standard costs`);

        // Then, create all new records in batches
        const BATCH_SIZE = 50;
        console.log(
          `📦 Creating ${validRecords.length} new records in batches of ${BATCH_SIZE}...`
        );

        for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
          const batch = validRecords.slice(i, i + BATCH_SIZE);
          const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(validRecords.length / BATCH_SIZE);

          console.log(
            `Processing batch ${batchNumber}/${totalBatches} (${batch.length} records)...`
          );

          for (const record of batch) {
            try {
              await tx.standardCost.create({
                data: {
                  itemName: record.itemName,
                  description: record.description,
                  costPerUnit: record.costPerUnit,
                  currency: record.currency,
                  isActive: true,
                  createdById: userId,
                },
              });
              totalSuccessCount++;
              allUpdatedItems.push(record.itemName);
            } catch (error) {
              console.error(`Error creating ${record.itemName}:`, error);
              allErrors.push(
                `Line ${record.lineNumber}: Failed to create ${
                  record.itemName
                } - ${error instanceof Error ? error.message : "Unknown error"}`
              );
              totalErrorCount++;
            }
          }

          // Check if we're approaching timeout (20 seconds)
          const elapsed = Date.now() - startTime;
          if (elapsed > 18000) {
            // 18 seconds to leave buffer for production order updates
            console.log(
              `Approaching timeout at ${elapsed}ms, stopping batch processing`
            );
            const remainingRecords = validRecords.length - (i + BATCH_SIZE);
            if (remainingRecords > 0) {
              allErrors.push(
                `Timeout: ${remainingRecords} records were not processed due to time limit`
              );
            }
            break;
          }
        }
      });

      console.log(
        `✅ Replace All transaction completed: ${totalDeletedCount} deleted, ${totalSuccessCount} created`
      );
    } else {
      // Process records in batches for Update/Add mode (existing logic)
      const BATCH_SIZE = 50;
      console.log(
        `Processing ${validRecords.length} records in batches of ${BATCH_SIZE}...`
      );

      for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
        const batch = validRecords.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(validRecords.length / BATCH_SIZE);

        console.log(
          `Processing batch ${batchNumber}/${totalBatches} (${batch.length} records)...`
        );

        const result = await processBatch(batch, userId);
        totalSuccessCount += result.success;
        totalErrorCount += result.errors.length;
        allErrors.push(...result.errors);
        allUpdatedItems.push(...result.updatedItems);

        // Check if we're approaching timeout (20 seconds)
        const elapsed = Date.now() - startTime;
        if (elapsed > 20000) {
          // 20 seconds
          console.log(
            `Approaching timeout at ${elapsed}ms, stopping batch processing`
          );
          const remainingRecords = validRecords.length - (i + BATCH_SIZE);
          if (remainingRecords > 0) {
            allErrors.push(
              `Timeout: ${remainingRecords} records were not processed due to time limit`
            );
          }
          break;
        }
      }
    }

    // Update production orders with new costs
    let poUpdateSummary = { updated: 0, skipped: 0 };
    if (allUpdatedItems.length > 0) {
      try {
        poUpdateSummary = await updateProductionOrderCosts(allUpdatedItems);
      } catch (error) {
        console.error("Error updating production orders:", error);
        allErrors.push(
          `Production order update failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(
      `Import completed in ${elapsed}ms: ${totalSuccessCount} success, ${totalErrorCount} errors`
    );

    return res.status(200).json({
      success: true,
      message: replaceAll
        ? `${fileExt.toUpperCase()} replace completed`
        : `${fileExt.toUpperCase()} import completed`,
      successCount: totalSuccessCount,
      errorCount: totalErrorCount,
      deletedCount: totalDeletedCount,
      replaceAll: replaceAll,
      errors: allErrors.slice(0, 20), // Limit errors to first 20
      processingTime: elapsed,
      productionOrdersUpdated: poUpdateSummary.updated,
      productionOrdersSkipped: poUpdateSummary.skipped,
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`Error in import handler after ${elapsed}ms:`, error);
    return res.status(500).json({
      error: "Failed to import file",
      details: error instanceof Error ? error.message : "Unknown error",
      processingTime: elapsed,
    });
  }
}

export default withAuth(handler);
