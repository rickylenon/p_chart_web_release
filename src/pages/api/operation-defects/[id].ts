import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createAuditLog, getClientInfo } from "@/lib/auditLogger";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  console.log("Operation Defect ID API called with method:", req.method);

  // Get the operation defect ID from the URL
  const { id } = req.query;
  const defectId = parseInt(id as string);

  if (isNaN(defectId)) {
    return res.status(400).json({ error: "Invalid operation defect ID" });
  }

  console.log(`Processing operation defect ID: ${defectId}`);

  // Get user role and check if admin
  const userRole = session?.user?.role || "";
  const isAdmin =
    typeof userRole === "string" && userRole.toLowerCase() === "admin";
  console.log("User role:", userRole, "Is admin?", isAdmin);

  // Get user ID for audit logs
  const userId = session?.user?.id ? parseInt(session.user.id) : null;
  if (!userId) {
    return res
      .status(401)
      .json({ error: "User ID is required for this operation" });
  }

  // Get client info for audit logs
  const clientInfo = getClientInfo(req);

  if (req.method === "DELETE") {
    try {
      // Check if the operation defect exists
      const operationDefect = await prisma.operationDefect.findUnique({
        where: { id: defectId },
        include: {
          operation: true,
        },
      });

      if (!operationDefect) {
        return res.status(404).json({ error: "Operation defect not found" });
      }

      // Check if the operation is completed and user is not admin
      if (operationDefect.operation.endTime && !isAdmin) {
        console.log(
          "Non-admin user tried to delete a defect from a completed operation"
        );
        return res.status(403).json({
          error:
            "Only admin users can delete defects from completed operations",
        });
      }

      // Start a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Store the operation defect for audit logging
        const defectToDelete = { ...operationDefect };

        // Delete the operation defect
        await tx.operationDefect.delete({
          where: { id: defectId },
        });

        console.log(`Deleted operation defect ID ${defectId}`);

        // Create audit log for the deletion
        await createAuditLog({
          tableName: "operation_defects",
          recordId: defectId,
          action: "delete",
          oldValues: defectToDelete,
          userId,
          ...clientInfo,
        });

        // Recalculate all defects for this operation
        const allDefects = await tx.operationDefect.findMany({
          where: { operationId: operationDefect.operationId },
        });

        // Calculate total effective defects
        let totalEffectiveDefects = allDefects.reduce((sum, defect) => {
          const effectiveDefectCount = defect.defectReworkable
            ? defect.quantity - defect.quantityRework
            : defect.quantity;

          console.log(
            `Defect ID: ${defect.defectId}, Effective: ${effectiveDefectCount}`
          );
          return sum + effectiveDefectCount;
        }, 0);

        console.log(
          `Input quantity: ${operationDefect.operation.inputQuantity}, Total effective defects: ${totalEffectiveDefects}`
        );

        // Get total replacement quantity
        const totalReplacements = allDefects.reduce(
          (sum, defect) => sum + (defect.quantityReplacement || 0),
          0
        );
        console.log(`Total replacements: ${totalReplacements}`);

        // Recalculate output quantity - include replacements in the calculation
        const outputQuantity = Math.max(
          0,
          operationDefect.operation.inputQuantity -
            totalEffectiveDefects +
            totalReplacements
        );
        console.log(`Recalculated output quantity: ${outputQuantity}`);

        // Store original operation for audit log
        const originalOperation = await tx.operation.findUnique({
          where: { id: operationDefect.operationId },
        });

        // Update the operation with the new output quantity
        const updatedOperation = await tx.operation.update({
          where: { id: operationDefect.operationId },
          data: { outputQuantity },
        });

        // Create audit log for operation update
        await createAuditLog({
          tableName: "operations",
          recordId: operationDefect.operationId,
          action: "update",
          oldValues: originalOperation,
          newValues: updatedOperation,
          userId,
          ...clientInfo,
        });

        // Get the updated operation to return to client
        const updatedOperationRecord = await tx.operation.findUnique({
          where: { id: operationDefect.operationId },
          include: {
            productionOrder: true,
          },
        });

        return updatedOperationRecord;
      });

      // Get updated production order to return to client
      const updatedOrder = await prisma.productionOrder.findUnique({
        where: { id: result?.productionOrder.id },
        include: {
          operations: true,
        },
      });

      return res.status(200).json(updatedOrder);
    } catch (error) {
      console.error("Error deleting operation defect:", error);

      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "An unknown error occurred while deleting the operation defect",
      });
    }
  } else {
    // Method not allowed
    return res.status(405).json({ error: "Method not allowed" });
  }
}

export default withAuth(handler);
