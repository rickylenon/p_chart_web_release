import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import ExcelJS from "exceljs";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  try {
    console.log(
      "API: StandardCosts export auth session validated, user:",
      session?.user?.name
    );

    // Check if user has admin role
    const userRole = session?.user?.role || "";
    const isAdmin = userRole.toLowerCase() === "admin";

    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    console.log("Exporting standard costs to Excel");

    // Get all standard costs from the database
    const standardCosts = await prisma.standardCost.findMany({
      orderBy: [{ itemName: "asc" }],
    });

    console.log(`Found ${standardCosts.length} standard costs to export`);

    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Standard Costs");

    // Add header row with styling
    worksheet.columns = [
      { header: "Item Name", key: "itemName", width: 30 },
      { header: "Description", key: "description", width: 40 },
      { header: "Cost Per Unit", key: "costPerUnit", width: 15 },
      { header: "Currency", key: "currency", width: 12 },
      { header: "Status", key: "isActive", width: 10 },
      { header: "Created At", key: "createdAt", width: 15 },
      { header: "Updated At", key: "updatedAt", width: 15 },
    ];

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF9CA3AF" }, // Gray background
    };
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Add the data rows
    standardCosts.forEach((cost) => {
      worksheet.addRow({
        itemName: cost.itemName,
        description: cost.description || "",
        costPerUnit: Number(cost.costPerUnit),
        currency: cost.currency,
        isActive: cost.isActive ? "Active" : "Inactive",
        createdAt: cost.createdAt.toLocaleDateString(),
        updatedAt: cost.updatedAt.toLocaleDateString(),
      });
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      column.width = column.width || 20;
    });

    // Apply styling to all data cells
    for (let i = 2; i <= standardCosts.length + 1; i++) {
      const row = worksheet.getRow(i);
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        // Format cost per unit as currency
        if (colNumber === 3) {
          // Cost Per Unit column
          cell.numFmt = "$#,##0.0000";
        }
      });

      // Apply different background color to alternate rows
      if (i % 2 === 0) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF9FAFB" }, // Light gray for even rows
        };
      }
    }

    console.log("Excel file generated, preparing for download");

    // Set response headers for file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=standard-costs.xlsx"
    );

    // Write to buffer and send response
    const buffer = await workbook.xlsx.writeBuffer();
    console.log("Excel file written to buffer, sending to client");
    res.send(buffer);
  } catch (error) {
    console.error("Error exporting standard costs to Excel:", error);
    res.status(500).json({
      error: "Failed to export standard costs",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export default withAuth(handler);
