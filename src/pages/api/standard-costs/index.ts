import { NextApiRequest, NextApiResponse } from "next";
import { apiAuthMiddleware } from "@/middlewares/apiAuthMiddleware";
import prisma from "@/lib/prisma";
import { withAuth } from "@/lib/auth";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  try {
    console.log(
      "API: StandardCosts index auth session validated, user:",
      session?.user?.name
    );

    // Check if user has admin role for write operations
    const userRole = session?.user?.role || "";
    const isAdmin = userRole.toLowerCase() === "admin";

    if (req.method !== "GET" && !isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    console.log("StandardCosts API called");

    if (req.method === "GET") {
      const {
        search,
        active,
        page = "1",
        limit = "20",
        sortField = "itemName",
        sortDirection = "asc",
      } = req.query;

      console.log(`Fetching standard costs with params:`, {
        search,
        active,
        page,
        limit,
        sortField,
        sortDirection,
      });

      // Parse pagination parameters
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      // Base query filters
      const where: any = {};

      // Add filters if provided
      if (active === "true") {
        where.isActive = true;
      } else if (active === "false") {
        where.isActive = false;
      }

      // Add search filter
      if (search && typeof search === "string") {
        where.OR = [
          {
            itemName: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: search,
              mode: "insensitive",
            },
          },
        ];
      }

      // Build orderBy object
      const orderBy: any = {};
      if (sortField === "costPerUnit") {
        orderBy.costPerUnit = sortDirection;
      } else if (sortField === "createdAt") {
        orderBy.createdAt = sortDirection;
      } else if (sortField === "updatedAt") {
        orderBy.updatedAt = sortDirection;
      } else {
        orderBy.itemName = sortDirection;
      }

      console.log(
        "Using query filters:",
        JSON.stringify(where, null, 2),
        "OrderBy:",
        orderBy
      );

      // Get standard costs with pagination
      const [standardCosts, totalCount] = await Promise.all([
        prisma.standardCost.findMany({
          where,
          orderBy,
          skip,
          take: limitNum,
        }),
        prisma.standardCost.count({ where }),
      ]);

      console.log(
        `Found ${standardCosts.length} standard costs out of ${totalCount} total`
      );

      // Convert Decimal fields to numbers for JSON serialization
      const serializedStandardCosts = standardCosts.map((cost) => ({
        ...cost,
        costPerUnit: Number(cost.costPerUnit),
      }));

      return res.status(200).json({
        data: serializedStandardCosts,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        page: pageNum,
        limit: limitNum,
      });
    } else if (req.method === "POST") {
      try {
        // Parse request body
        const data =
          typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        console.log("Creating new standard cost with data:", data);

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

        // Check if a standard cost with the same item name already exists
        const existingStandardCost = await prisma.standardCost.findUnique({
          where: { itemName },
        });

        if (existingStandardCost) {
          return res.status(409).json({
            error: "A standard cost with this item name already exists",
          });
        }

        // Get user ID for audit tracking
        const userId = session?.user?.id ? parseInt(session.user.id) : null;

        // Create the new standard cost
        const newStandardCost = await prisma.standardCost.create({
          data: {
            itemName,
            description,
            costPerUnit: cost,
            currency: currency || "USD",
            isActive: true,
            createdById: userId,
          },
        });

        console.log(`Created new standard cost with ID: ${newStandardCost.id}`);

        // Convert Decimal to number for JSON serialization
        const serializedStandardCost = {
          ...newStandardCost,
          costPerUnit: Number(newStandardCost.costPerUnit),
        };

        return res.status(201).json(serializedStandardCost);
      } catch (error) {
        console.error("Error creating standard cost:", error);
        return res.status(500).json({
          error: "Failed to create standard cost",
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

export default withAuth(handler);
