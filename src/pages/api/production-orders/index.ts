import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { withAuth } from "@/lib/auth";

type ProductionOrderWithOperations = Prisma.ProductionOrderGetPayload<{
  include: {
    operations: {
      select: {
        operation: true;
        startTime: true;
        endTime: true;
      };
    };
  };
}> & {
  currentOperation: string | null;
  currentOperationStartTime: Date | null;
  currentOperationEndTime: Date | null;
};

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  if (req.method === "GET") {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";
      const sortField = (req.query.sortField as string) || "createdAt";
      const sortDirection = (req.query.sortDirection as string) || "desc";
      const skip = (page - 1) * limit;

      console.log("API Request Parameters:", {
        page,
        limit,
        search,
        sortField,
        sortDirection,
        skip,
      });

      // Map frontend field names to database field names
      const fieldMapping: Record<string, string> = {
        quantity: "poQuantity",
        itemName: "itemName",
        status: "status",
        poNumber: "poNumber",
        lotNumber: "lotNumber",
        createdDate: "createdAt",
        modifiedDate: "updatedAt",
        currentOperation: "currentOperation",
        lockStatus: "editingUserId", // Sort by lock status (editingUserId null = unlocked, not null = locked)
        actions: "editingUserId", // Alternative key for actions column
      };

      // Use the mapped field name or fallback to the original if not in mapping
      const dbSortField = fieldMapping[sortField] || sortField;

      console.log(`Mapped ${sortField} to database field ${dbSortField}`);

      // Special handling for lock status sorting
      if (sortField === "actions" || sortField === "lockStatus") {
        console.log(
          `Sorting by lock status: ${sortField} -> ${dbSortField} (${sortDirection})`
        );
      }

      // Build where clause for search
      const where = search
        ? {
            OR: [
              { poNumber: { contains: search } },
              { lotNumber: { contains: search } },
              { itemName: { contains: search } },
            ],
          }
        : {};

      // Get total count for pagination
      const total = await prisma.productionOrder.count({ where });

      // Fetch production orders with pagination and search
      const orders = await prisma.productionOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [dbSortField]: sortDirection === "asc" ? "asc" : "desc",
        },
        include: {
          operations: {
            select: {
              operation: true,
              startTime: true,
              endTime: true,
            },
          },
        },
      });

      console.log("API Response:", {
        totalOrders: orders.length,
        page,
        sortField: dbSortField,
        sortDirection,
        firstOrder: orders[0]?.poNumber,
        lastOrder: orders[orders.length - 1]?.poNumber,
      });

      // Get all unique editing user IDs to check their existence
      const editingUserIds = [
        ...new Set(
          orders
            .filter((order) => order.editingUserId !== null)
            .map((order) => order.editingUserId)
        ),
      ].filter((id) => id !== null);

      console.log(
        `Found ${editingUserIds.length} unique editing user IDs to check:`,
        editingUserIds
      );

      // Fetch all users in a single query to check which ones exist
      let existingUserIds: number[] = [];
      if (editingUserIds.length > 0) {
        try {
          // Make sure all user IDs are treated as numbers
          const numericUserIds = editingUserIds
            .map((id) =>
              typeof id === "string" ? parseInt(id as string) : (id as number)
            )
            .filter((id) => !isNaN(id as number));

          console.log("Numeric user IDs to check:", numericUserIds);

          const users = await prisma.user.findMany({
            where: {
              id: {
                in: numericUserIds,
              },
            },
            select: {
              id: true,
            },
          });

          existingUserIds = users.map((user) => user.id);
          console.log(
            `Found ${existingUserIds.length} existing users out of ${editingUserIds.length} editing users:`,
            existingUserIds
          );
        } catch (error) {
          console.error("Error checking editing user existence:", error);
          // Continue processing even if this check fails
        }
      }

      // Transform the data to match the frontend interface
      const transformedOrders = orders.map(
        (order: ProductionOrderWithOperations) => {
          // Check if the editing user exists (if there is one)
          const isUserDeleted = order.editingUserId
            ? !existingUserIds.includes(
                typeof order.editingUserId === "string"
                  ? parseInt(order.editingUserId)
                  : order.editingUserId
              )
            : false;

          console.log(
            `Order ${order.poNumber} - editingUserId: ${order.editingUserId}, isUserDeleted: ${isUserDeleted}`
          );

          return {
            poNumber: order.poNumber,
            lotNumber: order.lotNumber || "",
            quantity: order.poQuantity,
            itemName: order.itemName || "",
            status: order.status.toLowerCase(),
            currentOperation: order.currentOperation,
            currentOperationStartTime: order.currentOperationStartTime,
            currentOperationEndTime: order.currentOperationEndTime,
            operations: order.operations.map((op) => ({
              operation: op.operation,
              startTime: op.startTime,
              endTime: op.endTime,
            })),
            createdDate: order.createdAt,
            modifiedDate: order.updatedAt,
            isLocked: !!(order.editingUserId && order.lockedAt),
            editingUserId: order.editingUserId || null,
            editingUserName: order.editingUserName || null,
            lockedAt: order.lockedAt || null,
            isUserDeleted: isUserDeleted,
          };
        }
      );

      return res.status(200).json({
        orders: transformedOrders,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching production orders:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch production orders" });
    }
  } else if (req.method === "POST") {
    try {
      const { poNumber, lotNumber, quantity, itemName } = req.body;

      if (!poNumber) {
        return res.status(400).json({ error: "PO Number is required" });
      }

      const newOrder = await prisma.productionOrder.create({
        data: {
          poNumber,
          lotNumber: lotNumber || "",
          poQuantity: parseInt(quantity) || 0,
          itemName: itemName || "",
          status: "CREATED",
        },
      });

      console.log(`Created new production order: ${poNumber}`);
      return res.status(201).json(newOrder);
    } catch (error) {
      console.error("Error creating production order:", error);
      return res
        .status(500)
        .json({ error: "Failed to create production order" });
    }
  }

  // Handle other HTTP methods
  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}

export default withAuth(handler);
