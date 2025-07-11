import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createAuditLog, getClientInfo } from "@/lib/auditLogger";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { poNumber, operationCode, rf, lineNo, timestamp } = req.body;
    console.log(
      `Completing operation for PO: ${poNumber}, Operation: ${operationCode}, RF: ${rf}, Line: ${lineNo}`
    );

    if (!poNumber || !operationCode || !lineNo) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Get the user role
    const userRole = session?.user?.role || "";
    const isAdmin =
      typeof userRole === "string" && userRole.toLowerCase() === "admin";
    console.log("User role:", userRole, "Is admin?", isAdmin);

    // Parse resource factor
    const resourceFactor = parseInt(rf) || 1;

    // Get the production order with operations
    const productionOrder = await prisma.productionOrder.findUnique({
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

    if (!productionOrder) {
      return res.status(404).json({ error: "Production order not found" });
    }

    // Find the operation to complete
    const operation = productionOrder.operations.find(
      (op) => op.operation.toLowerCase() === operationCode.toLowerCase()
    );

    if (!operation) {
      return res.status(404).json({ error: "Operation not found" });
    }

    // If the operation is already completed and the user is not an admin, prevent editing
    if (operation.endTime && !isAdmin) {
      console.log("Non-admin user tried to edit a completed operation");
      return res.status(403).json({
        error: "Only admin users can edit completed operations",
      });
    }

    // Get all operation steps to determine sequence
    const operationSteps = await prisma.operationStep.findMany({
      orderBy: { stepOrder: "asc" },
    });

    // Sort operations by their step order
    const sortedOperations = [...productionOrder.operations].sort((a, b) => {
      const aStep = operationSteps.find(
        (s) => s.operationNumber.toLowerCase() === a.operation.toLowerCase()
      );
      const bStep = operationSteps.find(
        (s) => s.operationNumber.toLowerCase() === b.operation.toLowerCase()
      );
      return (aStep?.stepOrder || 0) - (bStep?.stepOrder || 0);
    });

    // Find the current operation index
    const currentOpIndex = sortedOperations.findIndex(
      (op) => op.id === operation.id
    );

    // Determine the next operation (if any)
    const nextOperation =
      currentOpIndex < sortedOperations.length - 1
        ? sortedOperations[currentOpIndex + 1]
        : null;

    // Calculate total effective defects
    const defects = operation.operationDefects || [];
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
    console.log(`Total replacements: ${totalReplacements}`);

    // Calculate output quantity - include replacements in the calculation
    const outputQuantity = Math.max(
      0,
      operation.inputQuantity - totalEffectiveDefects + totalReplacements
    );

    console.log(
      `Output calculation: Input (${operation.inputQuantity}) - Effective Defects (${totalEffectiveDefects}) + Replacements (${totalReplacements}) = ${outputQuantity}`
    );

    // Get the current user id for audit logging
    const userId = session?.user?.id ? parseInt(session.user.id) : null;
    if (!userId) {
      return res
        .status(401)
        .json({ error: "User ID is required for this operation" });
    }

    // Get client info for audit logs
    const clientInfo = getClientInfo(req);

    // Process within a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Save original operation state for audit log
      const originalOperation = { ...operation };

      // Record end time and output quantity for the current operation
      const completedOperation = await tx.operation.update({
        where: { id: operation.id },
        data: {
          endTime: timestamp ? new Date(timestamp) : new Date(),
          outputQuantity: outputQuantity,
          rf: resourceFactor,
          lineNo: lineNo,
        },
      });

      console.log(
        `Operation ${operationCode} completed with output: ${outputQuantity}`
      );

      // Create audit log for the operation completion
      await createAuditLog({
        tableName: "operations",
        recordId: operation.id,
        action: "update",
        oldValues: originalOperation,
        newValues: completedOperation,
        userId,
        ...clientInfo,
      });

      // Update the production order's current operation
      let updatedOrderData: Record<string, any> = {};

      if (nextOperation) {
        // Move to next operation
        updatedOrderData = {
          currentOperation: nextOperation.operation,
          currentOperationEndTime: null,
          currentOperationStartTime: null,
        };

        // Save original next operation state for audit log
        const originalNextOp = { ...nextOperation };

        // Update the next operation's input quantity
        const updatedNextOperation = await tx.operation.update({
          where: { id: nextOperation.id },
          data: { inputQuantity: outputQuantity },
        });

        // Create audit log for the next operation input quantity update
        await createAuditLog({
          tableName: "operations",
          recordId: nextOperation.id,
          action: "update",
          oldValues: originalNextOp,
          newValues: updatedNextOperation,
          userId,
          ...clientInfo,
        });

        console.log(
          `Updated next operation (${nextOperation.operation}) input quantity to ${outputQuantity}`
        );
      } else {
        // This was the last operation, mark the PO as completed
        updatedOrderData = {
          status: "COMPLETED",
          currentOperationEndTime: new Date(),
        };

        console.log(`No next operation, marking PO as completed`);
      }

      // Save original production order state for audit log
      const originalProductionOrder = { ...productionOrder };

      // Update the production order
      const updatedOrder = await tx.productionOrder.update({
        where: { id: productionOrder.id },
        data: updatedOrderData,
        include: {
          operations: {
            include: {
              operationDefects: true,
            },
          },
        },
      });

      // Create audit log for the production order update
      await createAuditLog({
        tableName: "production_orders",
        recordId: productionOrder.id,
        action: "update",
        oldValues: originalProductionOrder,
        newValues: updatedOrder,
        userId,
        ...clientInfo,
      });

      return updatedOrder;
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error completing operation:", error);
    return res.status(500).json({
      error: "An error occurred while completing the operation",
    });
  }
}

export default withAuth(handler);
