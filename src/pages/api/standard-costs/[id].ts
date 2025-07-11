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
      "API: StandardCosts [id] auth session validated, user:",
      session?.user?.name
    );

    const { id } = req.query;
    const standardCostId = parseInt(id as string, 10);

    if (isNaN(standardCostId)) {
      return res.status(400).json({ error: "Invalid standard cost ID" });
    }

    // Check if user has admin role for write operations
    const userRole = session?.user?.role || "";
    const isAdmin = userRole.toLowerCase() === "admin";

    if (req.method !== "GET" && !isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    if (req.method === "GET") {
      console.log(`Fetching standard cost with ID: ${standardCostId}`);

      const standardCost = await prisma.standardCost.findUnique({
        where: { id: standardCostId },
      });

      if (!standardCost) {
        return res.status(404).json({ error: "Standard cost not found" });
      }

      // Convert Decimal to number for JSON serialization
      const serializedStandardCost = {
        ...standardCost,
        costPerUnit: Number(standardCost.costPerUnit),
      };

      return res.status(200).json(serializedStandardCost);
    } else if (req.method === "PUT") {
      try {
        // Parse request body
        const data =
          typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        console.log(
          `Updating standard cost ${standardCostId} with data:`,
          data
        );

        const { itemName, description, costPerUnit, currency } = data;

        if (!itemName || !costPerUnit) {
          return res
            .status(400)
            .json({ error: "Item name and cost per unit are required" });
        }

        // Validate cost per unit is a positive number
        const cost = parseFloat(costPerUnit);
        if (isNaN(cost) || cost < 0) {
          return res
            .status(400)
            .json({ error: "Cost per unit must be a valid positive number" });
        }

        // Check if standard cost exists
        const existingStandardCost = await prisma.standardCost.findUnique({
          where: { id: standardCostId },
        });

        if (!existingStandardCost) {
          return res.status(404).json({ error: "Standard cost not found" });
        }

        // Check if item name is being changed to one that already exists
        if (itemName !== existingStandardCost.itemName) {
          const duplicateStandardCost = await prisma.standardCost.findUnique({
            where: { itemName },
          });

          if (duplicateStandardCost) {
            return res.status(409).json({
              error: "A standard cost with this item name already exists",
            });
          }
        }

        // Get user ID for audit tracking
        const userId = session?.user?.id ? parseInt(session.user.id) : null;

        // Update the standard cost
        const updatedStandardCost = await prisma.standardCost.update({
          where: { id: standardCostId },
          data: {
            itemName,
            description,
            costPerUnit: cost,
            currency: currency || "USD",
            updatedById: userId,
            updatedAt: new Date(),
          },
        });

        console.log(
          "Standard cost updated successfully:",
          updatedStandardCost.itemName
        );

        // Update production orders with new cost if the cost changed and item is active
        let poUpdateSummary = { updated: 0, skipped: 0 };
        if (
          existingStandardCost.isActive &&
          Number(existingStandardCost.costPerUnit) !== cost
        ) {
          try {
            poUpdateSummary = await updateProductionOrderCosts(itemName, cost);
          } catch (error) {
            console.error("Error updating production orders:", error);
            // Don't fail the main request if production order update fails
          }
        }

        // Convert Decimal to number for JSON serialization
        const serializedUpdatedStandardCost = {
          ...updatedStandardCost,
          costPerUnit: Number(updatedStandardCost.costPerUnit),
        };

        // TODO: Trigger cost recalculation for ongoing production orders
        // This will be implemented when we add the cost calculation service

        return res.status(200).json({
          success: true,
          data: serializedUpdatedStandardCost,
          productionOrdersUpdated: poUpdateSummary.updated,
          productionOrdersSkipped: poUpdateSummary.skipped,
        });
      } catch (error) {
        console.error("Error updating standard cost:", error);
        return res.status(500).json({
          error: "Failed to update standard cost",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } else if (req.method === "DELETE") {
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
            .json({ error: "Standard cost is already deactivated" });
        }

        // Soft delete by setting isActive to false
        const deactivatedStandardCost = await prisma.standardCost.update({
          where: { id: standardCostId },
          data: {
            isActive: false,
          },
        });

        console.log(`Deactivated standard cost with ID: ${standardCostId}`);
        return res.status(200).json({
          message: "Standard cost deactivated successfully",
          standardCost: deactivatedStandardCost,
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
    console.error("Error in handler:", error);
    return res.status(500).json({ error: "Failed to process request" });
  }
}

// Helper function to update production orders with new costs
async function updateProductionOrderCosts(
  itemName: string,
  newCost: number
): Promise<{ updated: number; skipped: number }> {
  console.log(
    `🔄 Updating production orders for item: ${itemName} with new cost: $${newCost}`
  );

  try {
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
        costPerUnit: newCost,
        lastCostUpdate: new Date(),
      },
    });

    console.log(
      `✅ Updated ${updateResult.count} production orders for ${itemName} with cost $${newCost}`
    );
    return { updated: updateResult.count, skipped: 0 };
  } catch (error) {
    console.error(
      `❌ Error updating production orders for ${itemName}:`,
      error
    );
    return { updated: 0, skipped: 1 };
  }
}

export default withAuth(handler);
