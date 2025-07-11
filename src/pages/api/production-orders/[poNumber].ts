import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { withErrorHandling } from "@/lib/apiErrorHandler";

// Define a type for the augmented request with session
interface AuthenticatedRequest extends NextApiRequest {
  session: {
    user: {
      id: number;
      username: string;
      role: string;
    };
  };
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  const { poNumber } = req.query;
  const user = session?.user;

  if (!poNumber || typeof poNumber !== "string") {
    return res.status(400).json({ error: "PO Number is required" });
  }

  console.log(`Production order API called for PO: ${poNumber}`);

  if (req.method === "GET") {
    try {
      // Fetch the production order from the database
      const order = await prisma.productionOrder.findUnique({
        where: { poNumber },
        include: {
          operations: {
            include: {
              operationDefects: true,
            },
          },
        },
      });

      if (!order) {
        console.log(`No production order found for PO: ${poNumber}`);
        return res.status(404).json({ error: "Production order not found" });
      }

      console.log(`Found production order: ${order.poNumber}`);

      // Get the user role to check if the user is an admin
      const userRole = session?.user?.role || "";
      const isAdmin =
        typeof userRole === "string" && userRole.toLowerCase() === "admin";
      console.log("User role:", userRole, "Is admin?", isAdmin);

      // Return order data directly without setting locks
      return res.status(200).json(order);
    } catch (error) {
      console.error("Error fetching production order:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch production order" });
    }
  }

  if (req.method === "PUT") {
    try {
      // Parse the request body
      const updates =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      console.log(`Updating production order ${poNumber} with:`, updates);

      // Get the user role
      const userRole = session?.user?.role || "";
      const isAdmin =
        typeof userRole === "string" && userRole.toLowerCase() === "admin";
      console.log("User role:", userRole, "Is admin?", isAdmin);

      // Check if user has admin permission to update production orders
      if (!isAdmin) {
        console.log("Non-admin user tried to update a production order");
        return res
          .status(403)
          .json({ error: "Only admin users can update production orders" });
      }

      // Get the existing order to check if quantity changed
      const existingOrder = await prisma.productionOrder.findUnique({
        where: { poNumber },
        include: {
          operations: {
            include: {
              operationDefects: true,
            },
            orderBy: {
              id: "asc", // Ensure operations are ordered consistently
            },
          },
        },
      });

      if (!existingOrder) {
        return res.status(404).json({ error: "Production order not found" });
      }

      // Check if quantity is changing
      const oldQuantity = existingOrder.poQuantity;
      const newQuantity = updates.quantity
        ? parseInt(updates.quantity)
        : oldQuantity;
      const isQuantityChanged = oldQuantity !== newQuantity;

      if (isQuantityChanged) {
        console.log(
          `Quantity is changing from ${oldQuantity} to ${newQuantity}`
        );
      }

      // Start a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update the production order in the database
        const updatedOrder = await tx.productionOrder.update({
          where: { poNumber },
          data: {
            lotNumber: updates.lotNumber,
            poQuantity: newQuantity,
            itemName: updates.itemName,
            updatedAt: new Date(),
          },
          include: {
            operations: {
              orderBy: {
                id: "asc",
              },
            },
          },
        });

        // Check if operations exist, if not create them
        if (updatedOrder.operations.length === 0) {
          console.log(
            `No operations found for PO ${poNumber}, creating them now`
          );

          // Get all operation steps
          const operationSteps = await tx.operationStep.findMany({
            orderBy: { stepOrder: "asc" },
          });

          // We'll need a default operator and encoder
          const defaultUser = await tx.user.findFirst();

          if (!defaultUser) {
            throw new Error("No users found in the system");
          }

          // Create operations for each step
          for (const step of operationSteps) {
            // Only set input quantity from PO for first operation (OP10)
            // Other operations will get their input from the previous operation when it completes
            const isFirstOperation =
              step.stepOrder ===
              Math.min(...operationSteps.map((s) => s.stepOrder));
            const inputQty = isFirstOperation ? updatedOrder.poQuantity : 0;

            await tx.operation.create({
              data: {
                productionOrderId: updatedOrder.id,
                operation: step.operationNumber,
                operatorId: defaultUser.id,
                inputQuantity: inputQty,
                encodedById: defaultUser.id,
                rf: 1, // Default RF value is 1
              },
            });
            console.log(
              `Created operation ${step.operationNumber} for PO: ${poNumber} (Input Qty: ${inputQty})`
            );
          }
        } else if (isQuantityChanged) {
          // If quantity changed, we need to update operations
          console.log("Updating operations due to quantity change");

          // Get operation steps for ordering
          const operationSteps = await tx.operationStep.findMany({
            orderBy: { stepOrder: "asc" },
          });

          // Sort operations by their step order
          const sortedOperations = [...updatedOrder.operations].sort((a, b) => {
            const aStep = operationSteps.find(
              (s) =>
                s.operationNumber.toLowerCase() === a.operation.toLowerCase()
            );
            const bStep = operationSteps.find(
              (s) =>
                s.operationNumber.toLowerCase() === b.operation.toLowerCase()
            );
            return (aStep?.stepOrder || 0) - (bStep?.stepOrder || 0);
          });

          // First, update the first operation's input quantity
          const firstOperation = sortedOperations[0];

          if (firstOperation) {
            await tx.operation.update({
              where: { id: firstOperation.id },
              data: { inputQuantity: newQuantity },
            });
            console.log(
              `Updated first operation ${firstOperation.operation} input quantity to ${newQuantity}`
            );

            // Calculate output quantity based on defects
            if (firstOperation.startTime) {
              const defects = await tx.operationDefect.findMany({
                where: { operationId: firstOperation.id },
              });

              // Calculate total effective defects
              let totalEffectiveDefects = defects.reduce((sum, defect) => {
                const effectiveDefectCount = defect.defectReworkable
                  ? defect.quantity - defect.quantityRework
                  : defect.quantity;

                return sum + effectiveDefectCount;
              }, 0);

              // Get total replacement quantity
              const totalReplacements = defects.reduce(
                (sum, defect) => sum + (defect.quantityReplacement || 0),
                0
              );
              console.log(
                `First operation total replacements: ${totalReplacements}`
              );

              // Update output quantity - include replacements in the calculation
              const outputQuantity = Math.max(
                0,
                newQuantity - totalEffectiveDefects + totalReplacements
              );

              await tx.operation.update({
                where: { id: firstOperation.id },
                data: { outputQuantity },
              });
              console.log(
                `Updated first operation output quantity to ${outputQuantity}`
              );

              // Cascade changes to subsequent operations if first operation is complete
              if (firstOperation.endTime) {
                for (let i = 1; i < sortedOperations.length; i++) {
                  const prevOp = sortedOperations[i - 1];
                  const currOp = sortedOperations[i];

                  // Update input quantity from previous operation's output
                  await tx.operation.update({
                    where: { id: currOp.id },
                    data: { inputQuantity: prevOp.outputQuantity || 0 },
                  });
                  console.log(
                    `Cascaded update: Set ${currOp.operation} input to ${
                      prevOp.outputQuantity || 0
                    }`
                  );

                  // If current operation is started, also update its output quantity based on defects
                  if (currOp.startTime) {
                    const opDefects = await tx.operationDefect.findMany({
                      where: { operationId: currOp.id },
                    });

                    const opTotalEffectiveDefects = opDefects.reduce(
                      (sum, defect) => {
                        const effectiveDefectCount = defect.defectReworkable
                          ? defect.quantity - defect.quantityRework
                          : defect.quantity;

                        return sum + effectiveDefectCount;
                      },
                      0
                    );

                    // Get total replacement quantity
                    const opTotalReplacements = opDefects.reduce(
                      (sum, defect) => sum + (defect.quantityReplacement || 0),
                      0
                    );
                    console.log(
                      `Operation ${currOp.operation} total replacements: ${opTotalReplacements}`
                    );

                    const opOutputQuantity = Math.max(
                      0,
                      (prevOp.outputQuantity || 0) -
                        opTotalEffectiveDefects +
                        opTotalReplacements
                    );

                    await tx.operation.update({
                      where: { id: currOp.id },
                      data: { outputQuantity: opOutputQuantity },
                    });
                    console.log(
                      `Updated ${currOp.operation} output quantity to ${opOutputQuantity}`
                    );
                  }
                }
              }
            }
          }
        }

        // Return the updated production order with all operations and defects
        return tx.productionOrder.findUnique({
          where: { id: updatedOrder.id },
          include: {
            operations: {
              include: {
                operationDefects: true,
              },
            },
          },
        });
      });

      console.log(`Production order updated: ${result?.poNumber}`);
      return res.status(200).json(result);
    } catch (error) {
      console.error("Error updating production order:", error);
      return res
        .status(500)
        .json({ error: "Failed to update production order" });
    }
  }

  if (req.method === "DELETE") {
    try {
      // Get the user role
      const userRole = session?.user?.role || "";
      const isAdmin =
        typeof userRole === "string" && userRole.toLowerCase() === "admin";
      console.log(
        `Delete request for production order ${poNumber} by user role: ${userRole}, isAdmin: ${isAdmin}`
      );

      // Check if user has admin permission to delete production orders
      if (!isAdmin) {
        console.log("Non-admin user tried to delete a production order");
        return res
          .status(403)
          .json({ error: "Only admin users can delete production orders" });
      }

      // Check if production order exists
      const existingOrder = await prisma.productionOrder.findUnique({
        where: { poNumber },
        include: {
          operations: {
            include: {
              operationDefects: true,
            },
          },
        },
      });

      if (!existingOrder) {
        console.log(`Production order ${poNumber} not found for deletion`);
        return res.status(404).json({ error: "Production order not found" });
      }

      // Perform the deletion in a transaction to ensure all related records are deleted
      await prisma.$transaction(async (tx) => {
        // First delete related operation defects
        for (const operation of existingOrder.operations) {
          if (operation.operationDefects.length > 0) {
            console.log(
              `Deleting ${operation.operationDefects.length} defects for operation ${operation.operation}`
            );
            await tx.operationDefect.deleteMany({
              where: { operationId: operation.id },
            });
          }
        }

        // Then delete operations
        if (existingOrder.operations.length > 0) {
          console.log(
            `Deleting ${existingOrder.operations.length} operations for PO ${poNumber}`
          );
          await tx.operation.deleteMany({
            where: { productionOrderId: existingOrder.id },
          });
        }

        // Finally delete the production order
        console.log(`Deleting production order ${poNumber}`);
        await tx.productionOrder.delete({
          where: { id: existingOrder.id },
        });
      });

      console.log(`Production order ${poNumber} successfully deleted`);
      return res
        .status(200)
        .json({ message: `Production order ${poNumber} successfully deleted` });
    } catch (error) {
      console.error("Error deleting production order:", error);
      return res
        .status(500)
        .json({ error: "Failed to delete production order" });
    }
  }

  // Method not supported
  return res.status(405).json({ error: "Method not allowed" });
}

// Apply both error handling and authentication middleware
export default withAuth(withErrorHandling(handler));

// Note: As of [current date], admin users no longer automatically acquire locks on production orders
// that are already locked by other users. A different approach for admin override will be implemented
// in the future, but not through automatic acquisition.
