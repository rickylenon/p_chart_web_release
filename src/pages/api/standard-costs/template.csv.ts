import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/auth";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  try {
    console.log(
      "API: StandardCosts CSV template auth session validated, user:",
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

    console.log("Generating CSV template...");

    // Create CSV content with headers and sample data
    const csvContent = [
      // Header row
      "Item Name,Description,Cost Per Unit,Currency",
      // Sample data rows
      "HARNESS-ABC123,Wire Harness Assembly ABC123,2.50,USD",
      "SUB-ASSY-DEF456,Sub-Assembly DEF456 Component,3.75,USD",
      "CABLE-GHI789,Connector Cable GHI789,1.25,USD",
      "PCB-JKL012,Circuit Board JKL012,15.99,USD",
      "CONNECTOR-MNO345,Electrical Connector MNO345,0.85,USD",
    ].join("\n");

    // Set response headers for CSV download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="standard_costs_template.csv"'
    );

    // Send CSV content
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error("Error generating CSV template:", error);
    return res.status(500).json({
      error: "Failed to generate CSV template",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withAuth(handler);
