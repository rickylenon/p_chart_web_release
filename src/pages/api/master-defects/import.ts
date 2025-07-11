import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
    if (ext !== ".xlsx" && ext !== ".xls") {
      return cb(new Error("Only Excel files are allowed"));
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

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  try {
    console.log(
      "API: MasterDefects import auth session validated, user:",
      session?.user?.name
    );

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    console.log("Processing Excel import for master defects");

    // Run the multer middleware to handle file upload
    await runMiddleware(req, res, upload.single("file"));

    // Check if file exists
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log(
      `Received file: ${file.originalname}, size: ${file.size} bytes`
    );

    // Create a readable stream from the buffer
    const stream = new Readable();
    stream.push(file.buffer);
    stream.push(null); // Signal end of stream

    // Read Excel file from buffer
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.read(stream);

    // Get the first worksheet
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return res
        .status(400)
        .json({ error: "Excel file contains no worksheets" });
    }

    console.log(`Reading worksheet: ${worksheet.name}`);

    // Extract column headers
    const headers: Record<string, number> = {};
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      headers[cell.value?.toString().trim() || ""] = colNumber;
    });

    // Check if required columns exist
    const requiredColumns = ["Name", "Category", "Reworkable"];
    const missingColumns = requiredColumns.filter((col) => !(col in headers));
    if (missingColumns.length > 0) {
      return res.status(400).json({
        error: `Excel file is missing required columns: ${missingColumns.join(
          ", "
        )}`,
      });
    }

    console.log("Headers validated:", headers);

    // Prepare for import
    const defectsToProcess: any[] = [];
    const errors: any[] = [];

    // Iterate through rows, starting from second row (skipping header)
    let rowCount = 0;
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      try {
        rowCount++;
        const name = row.getCell(headers["Name"]).value?.toString().trim();
        const description = headers["Description"]
          ? row.getCell(headers["Description"]).value?.toString().trim()
          : null;
        const category = row
          .getCell(headers["Category"])
          .value?.toString()
          .trim();
        const operation = headers["Operation"]
          ? row.getCell(headers["Operation"]).value?.toString().trim()
          : null;
        const machine = headers["Machine"]
          ? row.getCell(headers["Machine"]).value?.toString().trim()
          : null;
        const reworkableCell = row
          .getCell(headers["Reworkable"])
          .value?.toString()
          .trim();
        const statusCell = headers["Status"]
          ? row.getCell(headers["Status"]).value?.toString().trim()
          : "Active";

        // Validate required fields
        if (!name || !category) {
          errors.push(
            `Row ${rowNumber}: Missing required fields (name or category)`
          );
          return;
        }

        // Parse boolean values
        const reworkable =
          reworkableCell === "Yes" ||
          reworkableCell === "yes" ||
          reworkableCell === "true" ||
          reworkableCell === "TRUE" ||
          reworkableCell === "1";
        const isActive =
          statusCell !== "Inactive" &&
          statusCell !== "inactive" &&
          statusCell !== "false" &&
          statusCell !== "FALSE" &&
          statusCell !== "0";

        const defect = {
          name,
          description,
          category,
          applicableOperation: operation || null,
          machine: machine || null,
          reworkable,
          isActive,
        };

        defectsToProcess.push({ defect, rowNumber });
      } catch (e) {
        errors.push(
          `Error processing row ${rowNumber}: ${
            e instanceof Error ? e.message : String(e)
          }`
        );
      }
    });

    console.log(`Processed ${rowCount} rows from Excel`);
    console.log(`Found ${defectsToProcess.length} defects to process`);

    // Deduplicate within the Excel file based on name + applicableOperation
    const uniqueDefects = new Map();
    const duplicatesSkipped: string[] = [];

    defectsToProcess.forEach(({ defect, rowNumber }) => {
      const key = `${defect.name}|${defect.applicableOperation || "NULL"}`;
      if (uniqueDefects.has(key)) {
        duplicatesSkipped.push(
          `Row ${rowNumber}: Duplicate of "${defect.name}" + "${
            defect.applicableOperation || "NULL"
          }"`
        );
      } else {
        uniqueDefects.set(key, defect);
      }
    });

    const defectsToCreate = Array.from(uniqueDefects.values());

    console.log(
      `After deduplication: ${defectsToCreate.length} unique defects to create`
    );
    console.log(
      `Skipped ${duplicatesSkipped.length} duplicates within Excel file`
    );
    console.log(`Encountered ${errors.length} errors`);

    // Begin database transaction with optimized batch processing
    console.log("Starting database import process...");

    const result = await processBatchImport(
      defectsToCreate,
      errors,
      duplicatesSkipped
    );

    console.log(
      `Import completed: ${result.created} created, ${result.updated} updated, ${result.errors.length} total errors`
    );

    // Return results
    return res.status(200).json({
      success: true,
      ...result,
      message: `Import completed: ${result.created} defects created, ${result.updated} defects updated, ${result.errors.length} errors`,
    });
  } catch (error) {
    console.error("Error importing master defects from Excel:", error);
    return res.status(500).json({
      error: "Failed to import master defects",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

// Ultra-optimized processing for massive datasets (1900+ items) in Vercel serverless
async function processBatchImport(
  defectsToCreate: any[],
  initialErrors: string[],
  duplicatesSkipped: string[]
) {
  const errors = [...initialErrors];
  let totalCreated = 0;
  let totalUpdated = 0;

  console.log(
    `Processing ${defectsToCreate.length} defects with ultra-optimized approach for large dataset`
  );

  // Track timing for large imports
  const startTime = Date.now();
  console.log(`⏱️ Import started at: ${new Date().toISOString()}`);

  try {
    // Single transaction with aggressive optimization for 1900+ items
    const result = await prisma.$transaction(
      async (tx) => {
        let createdCount = 0;
        let updatedCount = 0;

        console.log("Fetching all existing defects for bulk comparison...");

        // Get all existing defects in one efficient query
        const existingDefects = await tx.masterDefect.findMany({
          select: {
            id: true,
            name: true,
            applicableOperation: true,
          },
        });

        console.log(
          `Found ${existingDefects.length} existing defects in database`
        );

        // Create efficient lookup map
        const existingMap = new Map();
        existingDefects.forEach((existing) => {
          const key = `${existing.name}|${
            existing.applicableOperation || "NULL"
          }`;
          existingMap.set(key, existing.id);
        });

        // Separate into create and update arrays
        const toCreate: any[] = [];
        const toUpdate: Array<any & { id: number }> = [];

        defectsToCreate.forEach((defect) => {
          const key = `${defect.name}|${defect.applicableOperation || "NULL"}`;
          if (existingMap.has(key)) {
            toUpdate.push({ ...defect, id: existingMap.get(key) });
          } else {
            toCreate.push(defect);
          }
        });

        console.log(
          `Separated: ${toCreate.length} to create, ${toUpdate.length} to update`
        );

        // Report progress for large datasets
        if (defectsToCreate.length > 1000) {
          console.log(
            `🚀 LARGE DATASET DETECTED: Processing ${defectsToCreate.length} items with ultra-optimization`
          );
          console.log(
            `📊 Breakdown: ${toCreate.length} new items, ${toUpdate.length} updates`
          );
          console.log(
            `⚡ Expected chunks: ~${Math.ceil(
              toCreate.length / 200
            )} create chunks, ~${Math.ceil(toUpdate.length / 30)} update chunks`
          );
        }

        // Ultra-efficient bulk create with chunking for large datasets
        if (toCreate.length > 0) {
          console.log("Processing bulk creates...");
          const CREATE_CHUNK_SIZE = 200; // Larger chunks for creates as they're faster

          for (let i = 0; i < toCreate.length; i += CREATE_CHUNK_SIZE) {
            const chunk = toCreate.slice(i, i + CREATE_CHUNK_SIZE);
            try {
              const chunkResult = await tx.masterDefect.createMany({
                data: chunk,
                skipDuplicates: true,
              });
              createdCount += chunkResult.count;
              console.log(
                `Created chunk ${Math.floor(i / CREATE_CHUNK_SIZE) + 1}: ${
                  chunkResult.count
                } defects`
              );
            } catch (createError) {
              console.error(
                `Create chunk ${Math.floor(i / CREATE_CHUNK_SIZE) + 1} failed:`,
                createError
              );
              // Individual fallback for failed chunk
              for (const defect of chunk) {
                try {
                  await tx.masterDefect.create({ data: defect });
                  createdCount++;
                } catch (individualError) {
                  errors.push(
                    `Create error "${defect.name}": ${
                      individualError instanceof Error
                        ? individualError.message
                        : String(individualError)
                    }`
                  );
                }
              }
            }
          }
          console.log(`Total created: ${createdCount} defects`);
        }

        // Efficient updates with parallel processing
        if (toUpdate.length > 0) {
          console.log("Processing bulk updates with parallel execution...");
          const UPDATE_CHUNK_SIZE = 30; // Optimal size for parallel updates

          for (let i = 0; i < toUpdate.length; i += UPDATE_CHUNK_SIZE) {
            const chunk = toUpdate.slice(i, i + UPDATE_CHUNK_SIZE);

            // Process updates in parallel for maximum speed
            const updatePromises = chunk.map((defect) =>
              tx.masterDefect
                .update({
                  where: { id: defect.id },
                  data: {
                    name: defect.name,
                    description: defect.description,
                    category: defect.category,
                    applicableOperation: defect.applicableOperation,
                    machine: defect.machine,
                    reworkable: defect.reworkable,
                    isActive: defect.isActive,
                  },
                })
                .then(() => 1)
                .catch((error) => {
                  errors.push(
                    `Update error "${defect.name}": ${
                      error instanceof Error ? error.message : String(error)
                    }`
                  );
                  return 0;
                })
            );

            const chunkResults = await Promise.all(updatePromises);
            const chunkUpdatedCount = chunkResults.reduce(
              (sum, result) => sum + result,
              0
            );
            updatedCount += chunkUpdatedCount;

            console.log(
              `Updated parallel chunk ${
                Math.floor(i / UPDATE_CHUNK_SIZE) + 1
              }: ${chunkUpdatedCount}/${chunk.length} defects`
            );
          }

          console.log(`Total updated: ${updatedCount} defects`);
        }

        return { created: createdCount, updated: updatedCount };
      },
      {
        timeout: 55000, // 55 seconds - maximized for Vercel but safe
      }
    );

    totalCreated = result.created;
    totalUpdated = result.updated;

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(
      `✅ Ultra-optimized import completed successfully: ${totalCreated} created, ${totalUpdated} updated, ${errors.length} errors`
    );
    console.log(`⏱️ Total execution time: ${duration} seconds`);
    console.log(
      `📈 Performance: ${Math.round(
        defectsToCreate.length / parseFloat(duration)
      )} items/second`
    );
  } catch (transactionError) {
    console.error("Ultra-optimized transaction failed:", transactionError);
    errors.push(
      `Transaction failed: ${
        transactionError instanceof Error
          ? transactionError.message
          : String(transactionError)
      }`
    );
  }

  return {
    created: totalCreated,
    updated: totalUpdated,
    errors: errors,
    duplicatesSkipped: duplicatesSkipped.length,
  };
}

export default withAuth(handler);
