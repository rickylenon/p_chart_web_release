import { NextApiRequest, NextApiResponse } from "next";
import { apiAuthMiddleware } from "@/middlewares/apiAuthMiddleware";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("Export operation lines API called");

  if (req.method !== "GET") {
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

    console.log("Fetching operation lines for export...");

    // Fetch all operation lines from database
    const operationLines = await prisma.operationLine.findMany({
      orderBy: [{ operationNumber: "asc" }, { lineNumber: "asc" }],
    });

    console.log(`Found ${operationLines.length} operation lines`);

    if (operationLines.length === 0) {
      return res.status(404).json({
        error: "No operation lines found",
        message: "There are no operation lines in the database to export",
      });
    }

    // Get unique operation numbers and line numbers
    const uniqueOperations = [
      ...new Set(operationLines.map((line) => line.operationNumber)),
    ].sort();
    const uniqueLines = [
      ...new Set(operationLines.map((line) => line.lineNumber)),
    ].sort();

    console.log("Unique operations:", uniqueOperations);
    console.log("Unique lines count:", uniqueLines.length);

    // Create Excel data structure
    // First row: operation numbers as headers
    const excelData: string[][] = [];
    excelData.push(uniqueOperations);

    // Group lines by operation
    const operationGroups: { [key: string]: string[] } = {};

    for (const operationNumber of uniqueOperations) {
      operationGroups[operationNumber] = operationLines
        .filter((line) => line.operationNumber === operationNumber)
        .map((line) => line.lineNumber)
        .sort();
    }

    console.log("Operation groups:", operationGroups);

    // Find the maximum number of lines in any operation
    const maxLines = Math.max(
      ...Object.values(operationGroups).map((lines) => lines.length)
    );
    console.log("Maximum lines in any operation:", maxLines);

    // Create rows by filling each column with its operation's lines
    for (let rowIndex = 0; rowIndex < maxLines; rowIndex++) {
      const row: string[] = [];

      for (const operationNumber of uniqueOperations) {
        const operationLinesForOp = operationGroups[operationNumber];
        // Add the line at this index, or empty string if no more lines
        row.push(operationLinesForOp[rowIndex] || "");
      }

      excelData.push(row);
    }

    console.log(`Generated Excel data with ${excelData.length} rows`);

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);

    // Set column widths for better readability
    const columnWidths = uniqueOperations.map(() => ({ wch: 25 }));
    worksheet["!cols"] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Operation Lines");

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "buffer",
    });

    // Convert to base64 for response
    const base64String = excelBuffer.toString("base64");

    // Generate filename with timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const filename = `operation_lines_export_${timestamp}.xlsx`;

    console.log(`Export completed successfully. Filename: ${filename}`);

    return res.status(200).json({
      success: true,
      message: "Operation lines exported successfully",
      data: {
        filename,
        excelData: base64String,
        operationCount: uniqueOperations.length,
        lineCount: uniqueLines.length,
        totalRecords: operationLines.length,
      },
    });
  } catch (error) {
    console.error("Error exporting operation lines:", error);
    return res.status(500).json({
      error: "Failed to export operation lines",
      details: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
}

export default apiAuthMiddleware(handler);
