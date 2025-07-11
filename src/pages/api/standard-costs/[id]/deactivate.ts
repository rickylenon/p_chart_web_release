import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { withAuth } from "@/lib/auth";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  try {
    console.log(
      "API: StandardCosts deactivate auth session validated, user:",
      session?.user?.name
    );

    const { id } = req.query;
    const standardCostId = parseInt(id as string, 10);

    if (isNaN(standardCostId)) {
      return res.status(400).json({ error: "Invalid standard cost ID" });
    }

    // Check if user has admin role
    const userRole = session?.user?.role || "";
    const isAdmin = userRole.toLowerCase() === "admin";

    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    if (req.method === "PUT") {
      try {
        console.log(`Deactivating standard cost with ID: ${standardCostId}`);

        // Check if standard cost exists
        const existingStandardCost = await prisma.standardCost.findUnique({
          where: { id: standardCostId },
        });

        if (!existingStandardCost) {
          return res.status(404).json({ error: "Standard cost not found" });
        }

        if (!existingStandardCost.isActive) {
          return res
            .status(400)
            .json({ error: "Standard cost is already inactive" });
        }

        // Get user ID for audit tracking
        const userId = session?.user?.id ? parseInt(session.user.id) : null;

        // Deactivate the standard cost
        const deactivatedStandardCost = await prisma.standardCost.update({
          where: { id: standardCostId },
          data: {
            isActive: false,
            updatedById: userId,
          },
        });

        console.log(`Deactivated standard cost with ID: ${standardCostId}`);

        // Convert Decimal to number for JSON serialization
        const serializedStandardCost = {
          ...deactivatedStandardCost,
          costPerUnit: Number(deactivatedStandardCost.costPerUnit),
        };

        return res.status(200).json({
          message: "Standard cost deactivated successfully",
          standardCost: serializedStandardCost,
        });
      } catch (error) {
        console.error("Error deactivating standard cost:", error);
        return res.status(500).json({
          error: "Failed to deactivate standard cost",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Method not supported
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Error in deactivate handler:", error);
    return res.status(500).json({ error: "Failed to process request" });
  }
}

export default withAuth(handler);
