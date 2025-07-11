import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  console.log("Resolve Operation Defect Edit Request API called");

  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // Parse request body and ID
    const data = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { id } = req.query;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: "Valid request ID is required" });
    }

    const { status, comments } = data;

    if (!status || !["approved", "rejected"].includes(status)) {
      return res
        .status(400)
        .json({ error: "Valid status (approved/rejected) is required" });
    }

    // Get the user from the session
    const userId = session?.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ error: "Unauthorized - User not authenticated" });
    }

    // Convert user ID to integer (Prisma expects numbers for ID fields)
    const userIdInt =
      typeof userId === "string" ? parseInt(userId, 10) : userId;

    // Get the user role
    const userRole = session?.user?.role || "";
    const isAdmin =
      typeof userRole === "string" && userRole.toLowerCase() === "admin";
    console.log("User role:", userRole, "Is admin?", isAdmin);

    // Only admins can resolve edit requests
    if (!isAdmin) {
      return res.status(403).json({
        error: "Forbidden - Only admin users can resolve edit requests",
      });
    }

    // Get the edit request with related data
    const editRequest = await prisma.operationDefectEditRequest.findUnique({
      where: { id: Number(id) },
      include: {
        operationDefect: {
          include: {
            defect: true,
          },
        },
        operation: true,
        productionOrder: true,
      },
    });

    if (!editRequest) {
      return res.status(404).json({ error: "Edit request not found" });
    }

    // Check if the request is already resolved
    if (editRequest.status !== "pending") {
      return res.status(400).json({
        error: "This request has already been resolved",
      });
    }

    // Start a transaction to handle all database operations atomically
    const result = await prisma.$transaction(async (tx) => {
      // Update the edit request status
      const updatedRequest = await tx.operationDefectEditRequest.update({
        where: { id: Number(id) },
        data: {
          status,
          resolvedById: userIdInt,
          resolutionNote: comments || null,
          resolvedAt: new Date(),
        },
        include: {
          operationDefect: {
            include: {
              defect: true,
            },
          },
          operation: true,
          productionOrder: true,
          requestedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          resolvedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // If approved, update the operation defect with the requested values
      if (status === "approved") {
        console.log("Approved request - updating defect values");
        console.log("Request type:", editRequest.requestType);
        console.log("Operation defect ID:", editRequest.operationDefectId);
        console.log("Operation ID from request:", editRequest.operationId);
        console.log("Requested values:", {
          quantity: editRequest.requestedQty,
          quantityRework: editRequest.requestedRw,
          quantityNogood: editRequest.requestedNg,
        });

        try {
          // Handle "add" type requests differently
          if (editRequest.requestType === "add") {
            console.log("Processing ADD request type");
            console.log("Defect details:", {
              defectId: editRequest.defectId,
              defectName: editRequest.defectName,
              defectCategory: editRequest.defectCategory,
              defectReworkable: editRequest.defectReworkable,
            });

            // Create a new operation defect record
            const newDefect = await tx.operationDefect.create({
              data: {
                operationId: editRequest.operationId,
                defectId: editRequest.defectId || undefined,
                defectName: editRequest.defectName || "",
                defectCategory: editRequest.defectCategory || "",
                defectMachine: editRequest.defectMachine || undefined,
                defectReworkable: editRequest.defectReworkable || false,
                quantity: editRequest.requestedQty,
                quantityRework: editRequest.requestedRw,
                quantityNogood: editRequest.requestedNg,
                quantityReplacement:
                  editRequest.operationCode?.toLowerCase() === "op10"
                    ? editRequest.requestedReplacement ||
                      editRequest.requestedQty
                    : 0,
                recordedById: userIdInt,
                recordedAt: new Date(),
              },
            });

            console.log("Created new defect:", newDefect);

            // Update the edit request to link to the new defect
            await tx.operationDefectEditRequest.update({
              where: { id: Number(id) },
              data: {
                operationDefectId: newDefect.id,
              },
            });
          } else {
            // Original edit request handling - First, log the current values
            if (!editRequest.operationDefectId) {
              console.error(
                "Error: No operationDefectId found for edit request"
              );
              throw new Error(
                "Cannot process edit request - missing operationDefectId"
              );
            }

            const currentDefect = await tx.operationDefect.findUnique({
              where: { id: editRequest.operationDefectId },
              include: { defect: true },
            });

            console.log("Current defect values:", currentDefect);
            console.log(
              "Current operation ID in defect:",
              currentDefect?.operationId
            );

            // Check for mismatch between operation IDs
            if (
              currentDefect &&
              currentDefect.operationId !== editRequest.operationId
            ) {
              console.log("⚠️ DETECTED OPERATION ID MISMATCH! ⚠️");
              console.log(
                `Defect operation ID (${currentDefect.operationId}) doesn't match request operation ID (${editRequest.operationId})`
              );

              // Try to find the right defect by name in the correct operation
              if (!currentDefect.defect) {
                console.log(
                  `No defect reference found for operation defect ${currentDefect.id}`
                );
              } else {
                console.log(
                  `Looking for defect named "${currentDefect.defect.name}" in operation ${editRequest.operationId}...`
                );
                const correctDefect = await tx.operationDefect.findFirst({
                  where: {
                    operationId: editRequest.operationId,
                    defect: {
                      name: currentDefect.defect.name,
                    },
                  },
                  include: { defect: true },
                });

                if (correctDefect) {
                  const defectName = correctDefect.defect?.name || "unknown";
                  console.log(
                    `✅ Found matching defect: ID ${correctDefect.id}, name: "${defectName}" in operation ${correctDefect.operationId}`
                  );

                  // Update the correct defect
                  const updatedDefect = await tx.operationDefect.update({
                    where: { id: correctDefect.id },
                    data: {
                      quantity: editRequest.requestedQty,
                      quantityRework: editRequest.requestedRw,
                      quantityNogood: editRequest.requestedNg,
                      quantityReplacement:
                        editRequest.operationCode?.toLowerCase() === "op10"
                          ? editRequest.requestedReplacement ||
                            editRequest.requestedQty
                          : correctDefect.quantityReplacement,
                    },
                  });

                  console.log("Updated correct defect values:", updatedDefect);
                } else {
                  // Try searching for it by the defect name from the frontend
                  console.log(
                    `Looking up defect by alternate name from editRequest data...`
                  );
                  const defectNameFromRequest =
                    editRequest.operationDefect?.defect?.name || "";
                  console.log(
                    `Looking for "${defectNameFromRequest}" in operation ${editRequest.operationId}`
                  );

                  const alternateDefect = await tx.operationDefect.findFirst({
                    where: {
                      operationId: editRequest.operationId,
                      defect: {
                        name: { contains: defectNameFromRequest.trim() },
                      },
                    },
                    include: { defect: true },
                  });

                  if (alternateDefect) {
                    const defectName =
                      alternateDefect.defect?.name || "unknown";
                    console.log(
                      `✅ Found alternate defect: ID ${alternateDefect.id}, name: "${defectName}" in operation ${alternateDefect.operationId}`
                    );

                    // Update the alternate defect
                    const updatedDefect = await tx.operationDefect.update({
                      where: { id: alternateDefect.id },
                      data: {
                        quantity: editRequest.requestedQty,
                        quantityRework: editRequest.requestedRw,
                        quantityNogood: editRequest.requestedNg,
                        quantityReplacement:
                          editRequest.operationCode?.toLowerCase() === "op10"
                            ? editRequest.requestedReplacement ||
                              editRequest.requestedQty
                            : alternateDefect.quantityReplacement,
                      },
                    });

                    console.log(
                      "Updated alternate defect values:",
                      updatedDefect
                    );
                  } else {
                    console.log(
                      "⚠️ No matching defect found by any name in the correct operation. Using original defect ID as fallback."
                    );

                    // Fall back to updating the original defect ID
                    if (editRequest.operationDefectId) {
                      const updatedDefect = await tx.operationDefect.update({
                        where: { id: editRequest.operationDefectId },
                        data: {
                          quantity: editRequest.requestedQty,
                          quantityRework: editRequest.requestedRw,
                          quantityNogood: editRequest.requestedNg,
                          quantityReplacement:
                            editRequest.operationCode?.toLowerCase() === "op10"
                              ? editRequest.requestedReplacement ||
                                editRequest.requestedQty
                              : 0,
                        },
                      });

                      console.log(
                        "Updated fallback defect values:",
                        updatedDefect
                      );
                    } else {
                      console.error(
                        "Cannot update defect - operationDefectId is null"
                      );
                      throw new Error(
                        "Cannot update defect - missing operationDefectId"
                      );
                    }
                  }
                }
              }
            } else {
              // Normal case - operation IDs match
              const updatedDefect = await tx.operationDefect.update({
                where: { id: editRequest.operationDefectId },
                data: {
                  quantity: editRequest.requestedQty,
                  quantityRework: editRequest.requestedRw,
                  quantityNogood: editRequest.requestedNg,
                  quantityReplacement:
                    editRequest.operationCode?.toLowerCase() === "op10"
                      ? editRequest.requestedReplacement ||
                        editRequest.requestedQty
                      : 0,
                },
              });

              console.log("Updated defect values:", updatedDefect);
            }
          }
        } catch (error) {
          console.error("Error updating operation defect:", error);
          throw error;
        }

        // Recalculate output quantity for the operation based on all defects
        const allDefects = await tx.operationDefect.findMany({
          where: { operationId: editRequest.operationId },
          include: { defect: true },
        });

        // Calculate total effective defects
        let totalEffectiveDefects = allDefects.reduce((sum, defect) => {
          const effectiveDefectCount = defect.defectReworkable
            ? defect.quantity - defect.quantityRework
            : defect.quantity;

          const defectName = defect.defect?.name || "unknown";
          console.log(
            `Defect: ${defectName}, Effective: ${effectiveDefectCount}`
          );
          return sum + effectiveDefectCount;
        }, 0);

        // Get total replacement quantity for OP10 operations
        const totalReplacements = allDefects.reduce(
          (sum, defect) => sum + (defect.quantityReplacement || 0),
          0
        );
        console.log(`Total replacements: ${totalReplacements}`);

        // Calculate new output quantity including replacements
        const operation = editRequest.operation;
        const outputQuantity = Math.max(
          0,
          operation.inputQuantity - totalEffectiveDefects + totalReplacements
        );
        console.log(
          `Recalculated output quantity: ${outputQuantity} (Input: ${operation.inputQuantity}, Defects: ${totalEffectiveDefects}, Replacements: ${totalReplacements})`
        );

        // Update operation output quantity
        await tx.operation.update({
          where: { id: editRequest.operationId },
          data: { outputQuantity },
        });

        // Check if there are subsequent operations that need to be updated
        const operations = await tx.operation.findMany({
          where: {
            productionOrderId: editRequest.productionOrderId,
          },
          orderBy: { id: "asc" },
        });

        // Find current operation index
        const currentOpIndex = operations.findIndex(
          (op) => op.id === editRequest.operationId
        );

        // If there are subsequent operations, update their input quantities
        if (currentOpIndex >= 0 && currentOpIndex < operations.length - 1) {
          for (let i = currentOpIndex + 1; i < operations.length; i++) {
            const prevOp = operations[i - 1];
            const currOp = operations[i];

            // Update input quantity from previous operation's output
            await tx.operation.update({
              where: { id: currOp.id },
              data: { inputQuantity: prevOp.outputQuantity || 0 },
            });

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

              // Calculate replacements for this operation
              const opTotalReplacements = opDefects.reduce(
                (sum, defect) => sum + (defect.quantityReplacement || 0),
                0
              );

              const opOutputQuantity = Math.max(
                0,
                (prevOp.outputQuantity || 0) -
                  opTotalEffectiveDefects +
                  opTotalReplacements
              );

              console.log(
                `Updating subsequent operation ${
                  currOp.id
                } output quantity: ${opOutputQuantity} (Input: ${
                  prevOp.outputQuantity || 0
                }, Defects: ${opTotalEffectiveDefects}, Replacements: ${opTotalReplacements})`
              );

              await tx.operation.update({
                where: { id: currOp.id },
                data: { outputQuantity: opOutputQuantity },
              });
            }
          }
        }
      }

      return updatedRequest;
    });

    console.log(`Edit request ${id} ${status}: ${result.resolvedAt}`);

    // Create a notification for the user who requested the edit
    try {
      console.log("Creating notification for the requesting user");

      // Get the user who requested the edit
      const requestedById = result.requestedById;
      if (!requestedById) {
        console.error("Cannot create notification: No requestedById found");
      } else {
        // Create notification directly in the database using Prisma
        const notification = await prisma.notification.create({
          data: {
            type: "defect-edit",
            title: `Edit Request ${
              status === "approved" ? "Approved" : "Rejected"
            }`,
            message: `Your edit request for ${
              result.operationDefect?.defect?.name ||
              `Defect ID: ${result.operationDefectId}`
            } on PO: ${result.productionOrder?.poNumber} has been ${status}${
              comments ? `. Note: ${comments}` : ""
            }`,
            userId: requestedById,
            sourceId: result.id.toString(),
            sourceType: "operationDefectEditRequest",
            linkUrl: "/operation-defects-edit-requests",
            isRead: false,
          },
        });

        console.log(
          "Notification created successfully in database:",
          notification.id
        );
      }
    } catch (error) {
      console.error("Error creating notification:", error);
      // Don't block the main response if notification creation fails
    }

    return res.status(200).json({
      message: `Edit request ${status} successfully`,
      editRequest: result,
    });
  } catch (error) {
    console.error("Error resolving edit request:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withAuth(handler);
