import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/auth";
import ExcelJS from "exceljs";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  try {
    console.log(
      "API: StandardCosts template auth session validated, user:",
      session?.user?.name
    );

    // Check if user has admin role
    const userRole = session?.user?.role || "";
    const isAdmin = userRole.toLowerCase() === "admin";

    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    if (req.method === "GET") {
      try {
        console.log("Generating standard costs template Excel file");

        // Create a new Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Standard Costs Template");

        // Add header row with styling
        worksheet.columns = [
          { header: "Item Name", key: "itemName", width: 30 },
          { header: "Description", key: "description", width: 40 },
          { header: "Cost Per Unit", key: "costPerUnit", width: 15 },
          { header: "Currency", key: "currency", width: 12 },
        ];

        // Style the header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4F46E5" }, // Blue background
        };
        headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } }; // White text
        headerRow.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });

        // Add example data rows
        const exampleData = [
          {
            itemName: "ITEM001",
            description: "Example Item 1",
            costPerUnit: 12.5,
            currency: "USD",
          },
          {
            itemName: "ITEM002",
            description: "Example Item 2",
            costPerUnit: 25.75,
            currency: "USD",
          },
          {
            itemName: "ITEM003",
            description: "Example Item 3",
            costPerUnit: 8.25,
            currency: "USD",
          },
        ];

        // Add the example data rows
        exampleData.forEach((data, index) => {
          const row = worksheet.addRow(data);

          // Apply styling to data rows
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

          // Apply light blue background to example rows
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFEFF6FF" }, // Light blue for example rows
          };
        });

        // Add instructions in a separate area
        const instructionRow = worksheet.getRow(6);
        instructionRow.getCell(1).value = "Instructions:";
        instructionRow.getCell(1).font = { bold: true };

        const instructions = [
          "1. Replace the example data above with your actual standard costs",
          "2. Item Name is required and must be unique",
          "3. Cost Per Unit must be a positive number",
          "4. Currency defaults to USD if not specified",
          "5. Description is optional but recommended",
          "6. Delete these instruction rows before importing",
        ];

        instructions.forEach((instruction, index) => {
          const row = worksheet.getRow(7 + index);
          row.getCell(1).value = instruction;
          row.getCell(1).font = { italic: true };
        });

        console.log("Template Excel file generated successfully");

        // Set headers for Excel download
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="standard_costs_template.xlsx"'
        );

        // Write to buffer and send response
        const buffer = await workbook.xlsx.writeBuffer();
        console.log("Template Excel file written to buffer, sending to client");
        res.send(buffer);
      } catch (error) {
        console.error("Error generating template:", error);
        return res.status(500).json({
          error: "Failed to generate template",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Method not supported
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Error in template handler:", error);
    return res.status(500).json({ error: "Failed to process request" });
  }
}

export default withAuth(handler);
