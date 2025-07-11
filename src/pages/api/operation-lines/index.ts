import { NextApiRequest, NextApiResponse } from "next";
import { apiAuthMiddleware } from "@/middlewares/apiAuthMiddleware";
import prisma from "@/lib/prisma";

interface OperationLine {
  id: number;
  operationNumber: string;
  lineNumber: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("Operation lines API called");

  if (req.method === "GET") {
    try {
      const { operation } = req.query;

      if (!operation) {
        return res.status(400).json({ error: "Operation is required" });
      }

      // Convert operation to uppercase for matching
      const operationCode = (operation as string).toUpperCase();
      console.log(
        `Fetching lines for operation: ${operation} (normalized to ${operationCode})`
      );

      // Use Prisma's raw query with uppercase comparison
      const operationLines = await prisma.$queryRaw<OperationLine[]>`
        SELECT id, "operationNumber", "lineNumber" 
        FROM operation_lines 
        WHERE UPPER("operationNumber") = ${operationCode}
        ORDER BY "lineNumber" ASC
      `;

      // Extract just the line numbers
      const lineNumbers = operationLines.map(
        (line: OperationLine) => line.lineNumber
      );

      console.log(
        `Found ${lineNumbers.length} lines for operation ${operationCode}`
      );

      return res.status(200).json({
        lines: lineNumbers,
      });
    } catch (error) {
      console.error("Error fetching operation lines:", error);
      return res.status(500).json({ error: "Failed to fetch operation lines" });
    }
  }

  // Method not supported
  return res.status(405).json({ error: "Method not allowed" });
}

export default apiAuthMiddleware(handler);
