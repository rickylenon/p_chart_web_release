import { NextApiRequest, NextApiResponse } from "next";
import { apiAuthMiddleware } from "@/middlewares/apiAuthMiddleware";
import prisma from "@/lib/prisma";
import { withAuth } from "@/lib/auth";
import { createAuditLog, getClientInfo } from "@/lib/auditLogger";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  console.log("Operation Defects API called");

  if (req.method === "POST") {
    try {
      // Parse request body
      const data =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      console.log("Creating/Updating operation defect with data:", data);

      const { poNumber, operationCode, defect } = data;

      if (!poNumber || !operationCode || !defect || !defect.id) {
        return res.status(400).json({
          error: "PO Number, Operation Code, and Defect data are required",
        });
      }

      // Get the user role
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

      // Get the production order and its operations
      const productionOrder = await prisma.productionOrder.findUnique({
        where: { poNumber },
        include: {
          operations: {
            include: {
              operationDefects: true,
            },
          },
        },
      });

      if (!productionOrder) {
        return res.status(404).json({ error: "Production order not found" });
      }

      // Find the specific operation
      const operation = productionOrder.operations.find(
        (op) => op.operation.toLowerCase() === operationCode.toLowerCase()
      );

      if (!operation) {
        return res
          .status(404)
          .json({ error: "Operation not found for this production order" });
      }

      // Check if the operation is completed and user is not admin
      if (operation.endTime && !isAdmin) {
        console.log("Non-admin user tried to edit a completed operation");
        return res.status(403).json({
          error: "Only admin users can edit completed operations",
        });
      }

      // Start a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Get a default user for recordedBy
        const defaultUser = await tx.user.findFirst();

        if (!defaultUser) {
          throw new Error("No users found in the system");
        }

        console.log(
          `Processing defect: ${defect.name}, quantity: ${defect.quantity}, rework: ${defect.quantityRework}, nogood: ${defect.quantityNogood}`
        );

        // Get the defect record from the database
        const defectRecord = await tx.masterDefect.findUnique({
          where: { id: defect.id },
        });

        if (!defectRecord) {
          throw new Error(`Defect with ID ${defect.id} not found`);
        }

        console.log(
          `Found defect record: ${defectRecord.name} (ID: ${defectRecord.id})`
        );

        if (!defectRecord.isActive) {
          console.log(
            `Warning: Defect ${defectRecord.name} is marked as inactive`
          );
        }

        // Check if this defect already exists for this operation
        const existingDefect = operation.operationDefects.find(
          (od) => od.defectId === defect.id
        );

        // Create or update the defect
        if (existingDefect) {
          // Store the original defect for audit logging
          const originalDefect = { ...existingDefect };

          // Update existing defect
          const updatedDefect = await tx.operationDefect.update({
            where: { id: existingDefect.id },
            data: {
              quantity: defect.quantity,
              quantityRework: defect.quantityRework,
              quantityNogood: defect.quantityNogood,
              quantityReplacement:
                operationCode.toLowerCase() === "op10"
                  ? defect.quantityReplacement !== undefined
                    ? defect.quantityReplacement
                    : defect.quantity
                  : 0,
              defectName: defectRecord.name,
              recordedById: userId,
              recordedAt: new Date(),
            },
          });

          // Create audit log for defect update
          await createAuditLog({
            tableName: "operation_defects",
            recordId: existingDefect.id,
            action: "update",
            oldValues: originalDefect,
            newValues: updatedDefect,
            userId,
            ...clientInfo,
          });

          console.log(
            `Updated existing defect record for ${defectRecord.name} and created audit log`
          );
        } else {
          // Create new defect
          const newDefect = await tx.operationDefect.create({
            data: {
              operationId: operation.id,
              defectId: defectRecord.id,
              defectName: defectRecord.name,
              defectCategory: defectRecord.category || "Unknown",
              defectMachine: defectRecord.machine || null,
              defectReworkable: defectRecord.reworkable,
              quantity: defect.quantity,
              quantityRework: defect.quantityRework,
              quantityNogood: defect.quantityNogood,
              quantityReplacement:
                operationCode.toLowerCase() === "op10"
                  ? defect.quantityReplacement !== undefined
                    ? defect.quantityReplacement
                    : defect.quantity
                  : 0,
              recordedById: userId,
            },
          });

          // Create audit log for defect creation
          await createAuditLog({
            tableName: "operation_defects",
            recordId: newDefect.id,
            action: "create",
            newValues: newDefect,
            userId,
            ...clientInfo,
          });

          console.log(
            `Created new defect record for ${defectRecord.name} (ID: ${defectRecord.id}) and created audit log`
          );
        }

        // Recalculate all defects for this operation
        const allDefects = await tx.operationDefect.findMany({
          where: { operationId: operation.id },
        });

        // Calculate total effective defects
        let totalEffectiveDefects = allDefects.reduce((sum, defect) => {
          const effectiveDefectCount = defect.defectReworkable
            ? defect.quantity - defect.quantityRework
            : defect.quantity;

          // Get defect name for logging
          console.log(
            `Defect ID: ${defect.defectId}, Effective: ${effectiveDefectCount}`
          );
          return sum + effectiveDefectCount;
        }, 0);

        console.log(
          `Input quantity: ${operation.inputQuantity}, Total effective defects: ${totalEffectiveDefects}`
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
          operation.inputQuantity - totalEffectiveDefects + totalReplacements
        );
        console.log(`Recalculated output quantity: ${outputQuantity}`);

        // Store original operation for audit log
        const originalOperation = await tx.operation.findUnique({
          where: { id: operation.id },
        });

        // Update the operation with the new output quantity
        const updatedOperation = await tx.operation.update({
          where: { id: operation.id },
          data: { outputQuantity },
        });

        // Create audit log for operation update
        await createAuditLog({
          tableName: "operations",
          recordId: operation.id,
          action: "update",
          oldValues: originalOperation,
          newValues: updatedOperation,
          userId,
          ...clientInfo,
        });

        // Get operation steps to determine sequence
        const operationSteps = await tx.operationStep.findMany({
          orderBy: { stepOrder: "asc" },
        });

        const currentStep = operationSteps.find(
          (step) =>
            step.operationNumber.toLowerCase() === operationCode.toLowerCase()
        );

        if (!currentStep) {
          throw new Error("Operation step not found");
        }

        // Filter for operations that come after this one
        const subsequentOperations = productionOrder.operations
          .filter((op) => {
            const stepIndex = operationSteps.findIndex(
              (s) =>
                s.operationNumber.toLowerCase() === op.operation.toLowerCase()
            );
            const currentStepIndex = operationSteps.findIndex(
              (s) => s.id === currentStep.id
            );
            return stepIndex > currentStepIndex;
          })
          .sort((a, b) => {
            const aIndex = operationSteps.findIndex(
              (s) =>
                s.operationNumber.toLowerCase() === a.operation.toLowerCase()
            );
            const bIndex = operationSteps.findIndex(
              (s) =>
                s.operationNumber.toLowerCase() === b.operation.toLowerCase()
            );
            return aIndex - bIndex;
          });

        console.log(
          `Found ${subsequentOperations.length} subsequent operations to update`
        );

        // Only propagate changes to subsequent operations if the current operation has been completed
        if (operation.endTime && subsequentOperations.length > 0) {
          console.log(
            "Operation is completed - cascading changes to all subsequent operations"
          );

          // Create a function to recursively update operations
          const updateOperationChain = async (
            currentOpIndex = 0,
            inputQuantity = outputQuantity
          ) => {
            if (currentOpIndex >= subsequentOperations.length) {
              return; // Base case: no more operations to update
            }

            const currentOp = subsequentOperations[currentOpIndex];
            console.log(
              `Updating operation ${currentOp.operation} input from ${currentOp.inputQuantity} to ${inputQuantity}`
            );

            // Get original operation for audit log
            const originalOp = await tx.operation.findUnique({
              where: { id: currentOp.id },
            });

            // Update the current operation's input quantity
            const updatedOp = await tx.operation.update({
              where: { id: currentOp.id },
              data: { inputQuantity },
            });

            // Create audit log for operation update
            await createAuditLog({
              tableName: "operations",
              recordId: currentOp.id,
              action: "update",
              oldValues: originalOp,
              newValues: updatedOp,
              userId,
              ...clientInfo,
            });

            // If this operation has been started or completed, recalculate its output
            if (currentOp.startTime) {
              console.log(
                `Operation ${currentOp.operation} has been started - recalculating output`
              );

              // Get all defects for this operation
              const opDefects = await tx.operationDefect.findMany({
                where: { operationId: currentOp.id },
              });

              // Calculate effective defects
              const opEffectiveDefects = opDefects.reduce((sum, defect) => {
                return (
                  sum +
                  (defect.defectReworkable
                    ? defect.quantity - defect.quantityRework
                    : defect.quantity)
                );
              }, 0);

              // Calculate new output quantity
              const newOutputQuantity = Math.max(
                0,
                inputQuantity - opEffectiveDefects
              );
              console.log(
                `Recalculated output for ${currentOp.operation}: ${newOutputQuantity}`
              );

              // Get latest operation data for audit log
              const latestOp = await tx.operation.findUnique({
                where: { id: currentOp.id },
              });

              // Update operation output
              const updatedOpWithOutput = await tx.operation.update({
                where: { id: currentOp.id },
                data: { outputQuantity: newOutputQuantity },
              });

              // Create audit log for output quantity update
              await createAuditLog({
                tableName: "operations",
                recordId: currentOp.id,
                action: "update",
                oldValues: latestOp,
                newValues: updatedOpWithOutput,
                userId,
                ...clientInfo,
              });

              // Continue the chain with the next operation using the new output
              await updateOperationChain(currentOpIndex + 1, newOutputQuantity);
            } else {
              // If this operation hasn't been started, don't calculate output
              // but still continue the chain with the next operation
              console.log(
                `Operation ${currentOp.operation} hasn't been started - not calculating output yet`
              );
              await updateOperationChain(currentOpIndex + 1, inputQuantity);
            }
          };

          // Start the recursive update process
          await updateOperationChain();
        }

        return tx.productionOrder.findUnique({
          where: { id: productionOrder.id },
          include: {
            operations: {
              include: {
                operationDefects: true,
              },
            },
          },
        });
      });

      console.log(
        `Operation defect processed successfully for PO: ${poNumber}`
      );
      return res.status(200).json(result);
    } catch (error) {
      console.error("Error processing operation defect:", error);
      return res.status(500).json({
        error: "Failed to process operation defect",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withAuth(handler);
