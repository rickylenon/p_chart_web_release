import { NextApiRequest, NextApiResponse } from "next";
import { apiAuthMiddleware } from "@/middlewares/apiAuthMiddleware";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";

interface OperationLineData {
  operationNumber: string;
  lineNumber: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("Upload operation lines API called");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Check if user is admin
    const userRole = req.headers["x-user-role"] as string;
    const isAdmin =
      typeof userRole === "string" && userRole.toLowerCase() === "admin";

    if (!isAdmin) {
      console.log("Access denied - user role:", userRole);
      return res.status(403).json({ error: "Admin access required" });
    }

    const { excelData, mode } = req.body;

    if (!excelData || !mode) {
      return res
        .status(400)
        .json({ error: "Excel data and mode are required" });
    }

    if (!["update", "replace"].includes(mode)) {
      return res
        .status(400)
        .json({ error: "Mode must be 'update' or 'replace'" });
    }

    console.log(`Processing operation lines upload with mode: ${mode}`);

    // Parse Excel data
    let workbook: XLSX.WorkBook;
    let worksheet: XLSX.WorkSheet;
    let excelRows: any[];

    try {
      // Convert base64 string back to buffer
      const buffer = Buffer.from(excelData, "base64");

      // Read the workbook
      workbook = XLSX.read(buffer, { type: "buffer" });

      // Get the first worksheet
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return res.status(400).json({ error: "Excel file has no worksheets" });
      }

      worksheet = workbook.Sheets[sheetName];

      // Convert worksheet to JSON
      excelRows = XLSX.utils.sheet_to_json(worksheet, {
        header: 1, // Use first row as header
        raw: false, // Return formatted strings
        defval: "", // Default value for empty cells
      });

      console.log(`Parsed ${excelRows.length} rows from Excel`);
    } catch (parseError) {
      console.error("Excel parsing error:", parseError);
      return res.status(400).json({
        error:
          "Invalid Excel format. Please ensure Excel file is properly formatted.",
      });
    }

    // Validate Excel structure
    if (excelRows.length === 0) {
      return res
        .status(400)
        .json({ error: "Excel file is empty or has no valid data" });
    }

    // Get the headers (operation numbers) from the first row
    const headers = excelRows[0] as string[];
    console.log("Excel headers found:", headers);

    if (!headers || headers.length === 0) {
      return res.status(400).json({ error: "Excel file has no header row" });
    }

    // Convert Excel format to operation lines
    const operationLines: OperationLineData[] = [];

    // Process each column (operation)
    for (let colIndex = 0; colIndex < headers.length; colIndex++) {
      const header = headers[colIndex];

      // Skip empty headers
      if (!header?.trim()) continue;

      const operationNumber = header.trim().toUpperCase();

      // Process each data row for this operation (skip header row)
      for (let rowIndex = 1; rowIndex < excelRows.length; rowIndex++) {
        const row = excelRows[rowIndex] as string[];
        const lineNumber = row[colIndex];

        // Skip empty cells
        if (!lineNumber?.trim()) continue;

        operationLines.push({
          operationNumber,
          lineNumber: lineNumber.trim(),
        });
      }
    }

    console.log(`Converted to ${operationLines.length} operation lines`);

    if (operationLines.length === 0) {
      return res.status(400).json({
        error:
          "No valid operation lines found in Excel. Please check that your Excel has operation headers (OP10, OP15, etc.) and line data.",
      });
    }

    // Validate operation numbers format
    const validOperations = operationLines.filter((line) => {
      return /^OP\d+$/i.test(line.operationNumber);
    });

    if (validOperations.length !== operationLines.length) {
      const invalidOps = [
        ...new Set(
          operationLines
            .filter((line) => !/^OP\d+$/i.test(line.operationNumber))
            .map((line) => line.operationNumber)
        ),
      ];

      console.log("Invalid operation numbers found:", invalidOps);

      return res.status(400).json({
        error:
          "Invalid operation numbers found. Operation numbers must be in format OP10, OP15, etc.",
        details: [`Invalid operations: ${invalidOps.join(", ")}`],
      });
    }

    // Remove duplicates within the data
    const uniqueLines = operationLines.filter(
      (line, index, self) =>
        index ===
        self.findIndex(
          (l) =>
            l.operationNumber === line.operationNumber &&
            l.lineNumber === line.lineNumber
        )
    );

    if (uniqueLines.length !== operationLines.length) {
      console.log(
        `Removed ${
          operationLines.length - uniqueLines.length
        } duplicate entries from Excel`
      );
    }

    let result;

    if (mode === "replace") {
      // Replace all records: delete all existing and insert new ones
      console.log("Replacing all operation lines...");

      result = await prisma.$transaction(async (tx) => {
        // Delete all existing records
        const deleteResult = await tx.operationLine.deleteMany({});
        console.log(`Deleted ${deleteResult.count} existing operation lines`);

        // Insert new records
        let inserted = 0;
        const errors: string[] = [];

        for (const line of uniqueLines) {
          try {
            await tx.operationLine.create({
              data: line,
            });
            inserted++;
          } catch (error) {
            console.error(
              `Error inserting line ${line.operationNumber}-${line.lineNumber}:`,
              error
            );
            errors.push(`${line.operationNumber}-${line.lineNumber}: ${error}`);
          }
        }

        return {
          mode: "replace",
          deleted: deleteResult.count,
          inserted,
          errors,
          total: uniqueLines.length,
        };
      });
    } else {
      // Update mode: insert new records, skip existing ones
      console.log("Updating operation lines (insert new, skip existing)...");

      let inserted = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const line of uniqueLines) {
        try {
          await prisma.operationLine.create({ data: line });
          inserted++;
        } catch (error: any) {
          if (error.code === "P2002") {
            // Unique constraint violation - record exists
            skipped++;
          } else {
            console.error(
              `Error inserting line ${line.operationNumber}-${line.lineNumber}:`,
              error
            );
            errors.push(
              `${line.operationNumber}-${line.lineNumber}: ${
                error.message || error
              }`
            );
          }
        }
      }

      result = {
        mode: "update",
        inserted,
        skipped,
        errors,
        total: uniqueLines.length,
      };
    }

    console.log("Operation lines upload completed:", result);

    return res.status(200).json({
      success: true,
      message: `Operation lines ${
        mode === "replace" ? "replaced" : "updated"
      } successfully`,
      data: result,
    });
  } catch (error) {
    console.error("Error processing operation lines upload:", error);
    return res.status(500).json({
      error: "Failed to process operation lines upload",
      details: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
}

export default apiAuthMiddleware(handler);
