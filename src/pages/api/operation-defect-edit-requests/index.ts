import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  console.log("Operation Defect Edit Requests API called");

  // Handle POST request to create a new edit request
  if (req.method === "POST") {
    try {
      // Parse request body
      const data =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      console.log("Creating edit request with data:", data);

      const {
        operationDefectId,
        poNumber,
        currentQty,
        currentRw,
        currentNg,
        requestedQty,
        requestedRw,
        requestedNg,
        reason,
        requestId, // Add support for requestId parameter
        requestType = "edit", // Default to 'edit' if not specified
        operationId, // For "add" type requests
        defectId, // For "add" type requests
        defectName, // For "add" type requests
        defectCategory, // For "add" type requests
        defectReworkable, // For "add" type requests
        defectMachine, // For "add" type requests
        currentReplacement, // Added from the new data structure
        requestedReplacement, // Added from the new data structure
      } = data;

      console.log(`Request type: ${requestType}`);

      // Check if required fields are provided based on request type
      if (requestType === "add") {
        const missingFields = [];
        if (!operationId) missingFields.push("operationId");
        if (!poNumber) missingFields.push("poNumber");
        if (!reason) missingFields.push("reason");
        if (!defectId) missingFields.push("defectId");
        if (!defectName) missingFields.push("defectName");
        if (requestedQty === undefined) missingFields.push("requestedQty");
        if (requestedRw === undefined) missingFields.push("requestedRw");
        if (requestedNg === undefined) missingFields.push("requestedNg");

        if (missingFields.length > 0) {
          console.error(
            `Missing fields for add request: ${missingFields.join(", ")}`
          );
          console.log(
            "Received data:",
            JSON.stringify(
              {
                operationId,
                poNumber,
                reason,
                defectId,
                defectName,
                requestedQty,
                requestedRw,
                requestedNg,
              },
              null,
              2
            )
          );

          return res.status(400).json({
            error: `Missing required fields for add request: ${missingFields.join(
              ", "
            )}`,
          });
        }

        // Log the data being processed
        console.log("Processing add request with data:", {
          operationId,
          defectId,
          poNumber,
          requestedQty,
          requestedRw,
          requestedNg,
        });
      } else {
        // For edit requests, check operationDefectId similarly with detailed errors
        const missingFields = [];
        if (!operationDefectId) missingFields.push("operationDefectId");
        if (!poNumber) missingFields.push("poNumber");
        if (!reason) missingFields.push("reason");
        if (currentQty === undefined) missingFields.push("currentQty");
        if (currentRw === undefined) missingFields.push("currentRw");
        if (currentNg === undefined) missingFields.push("currentNg");
        if (requestedQty === undefined) missingFields.push("requestedQty");
        if (requestedRw === undefined) missingFields.push("requestedRw");
        if (requestedNg === undefined) missingFields.push("requestedNg");

        if (missingFields.length > 0) {
          console.error(
            `Missing fields for edit request: ${missingFields.join(", ")}`
          );
          return res.status(400).json({
            error: `Missing required fields for edit request: ${missingFields.join(
              ", "
            )}`,
          });
        }
      }

      // Convert any string IDs to integers to prevent Prisma validation errors
      let opDefectIdInt = operationDefectId
        ? typeof operationDefectId === "string"
          ? parseInt(operationDefectId, 10)
          : operationDefectId
        : null;

      let operationIdInt = operationId
        ? typeof operationId === "string"
          ? parseInt(operationId, 10)
          : operationId
        : null;

      let defectIdInt = defectId
        ? typeof defectId === "string"
          ? parseInt(defectId, 10)
          : defectId
        : null;

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

      // Don't allow admins to create edit requests (they can directly edit)
      if (isAdmin) {
        return res.status(400).json({
          error:
            "Admin users can edit directly instead of creating edit requests",
        });
      }

      // Get the operation defect first to get the correct operation ID (only for edit requests)
      let operationDefect = null;
      let operationIdToUse = null;

      if (requestType === "edit" || requestType === "delete") {
        console.log(`Looking up operation defect with ID: ${opDefectIdInt}`);

        // Get the defect name from the request data
        const defectNameForLookup = defectName || null;
        console.log(`Defect name from request: ${defectNameForLookup}`);

        operationDefect = await prisma.operationDefect.findUnique({
          where: { id: opDefectIdInt },
          include: { defect: true },
        });

        // If the operation defect doesn't exist or its name doesn't match, try to find it by name
        if (
          !operationDefect ||
          (defectNameForLookup &&
            operationDefect.defect?.name !== defectNameForLookup)
        ) {
          console.log(
            `Defect ID ${opDefectIdInt} not found or name mismatch. Found: ${operationDefect?.defect?.name}, Expected: ${defectNameForLookup}`
          );
          console.log("Attempting to find defect by name instead...");

          if (defectNameForLookup) {
            // Find the production order first
            const productionOrder = await prisma.productionOrder.findUnique({
              where: { poNumber },
              include: {
                operations: true,
              },
            });

            if (!productionOrder) {
              return res
                .status(404)
                .json({ error: "Production order not found" });
            }

            // Find operations for this PO
            const operations = productionOrder.operations;

            // First, find the defect ID by name
            const defect = await prisma.masterDefect.findFirst({
              where: { name: defectNameForLookup },
            });

            if (!defect) {
              console.log(`No defect found with name: ${defectNameForLookup}`);
              return res
                .status(404)
                .json({ error: "Defect not found by name" });
            }

            console.log(
              `Found defect by name: ${defectNameForLookup}, ID: ${defect.id}`
            );

            // Then, find the operation defect using the defect ID
            operationDefect = await prisma.operationDefect.findFirst({
              where: {
                operationId: { in: operations.map((op) => op.id) },
                defectId: defect.id,
              },
              include: { defect: true },
            });

            if (operationDefect) {
              console.log(
                `Found operation defect with defect name: ${defectNameForLookup}, ID: ${operationDefect.id}, Operation ID: ${operationDefect.operationId}`
              );
              // Update the opDefectIdInt to use the found defect's ID instead of the original ID
              opDefectIdInt = operationDefect.id;
              console.log(
                `Updated operation defect ID to use: ${opDefectIdInt}`
              );
            } else {
              console.log(
                `No operation defect found with defect name: ${defectNameForLookup}`
              );
              return res
                .status(404)
                .json({ error: "Operation defect not found by name" });
            }
          } else {
            console.log(
              `No defect name provided and defect ID ${opDefectIdInt} not found`
            );
            return res
              .status(404)
              .json({ error: "Operation defect not found" });
          }
        }

        if (!operationDefect) {
          return res.status(404).json({ error: "Operation defect not found" });
        }

        operationIdToUse = operationDefect.operationId;
      } else {
        // For 'add' requests, use the provided operationId directly
        operationIdToUse = operationIdInt;
      }

      // Additional check to prevent null operationId
      if (operationIdToUse === null) {
        console.error("Operation ID is null. Required for all request types.");
        return res
          .status(400)
          .json({ error: "Missing operation ID for request" });
      }

      // Get the production order
      const productionOrder = await prisma.productionOrder.findUnique({
        where: { poNumber },
      });

      if (!productionOrder) {
        return res.status(404).json({ error: "Production order not found" });
      }

      // Get the operation using the operation ID
      const operation = await prisma.operation.findUnique({
        where: { id: operationIdToUse },
      });

      if (!operation) {
        return res.status(404).json({ error: "Operation not found" });
      }

      // Check if operation is completed
      if (!operation.endTime) {
        return res.status(400).json({
          error: "Edit requests can only be created for completed operations",
        });
      }

      // Check if we're updating an existing request
      if (requestId) {
        console.log(`Updating existing edit request with ID: ${requestId}`);

        // Convert requestId to integer if it's a string
        const requestIdInt =
          typeof requestId === "string" ? parseInt(requestId, 10) : requestId;

        // Check if the request exists and belongs to this user
        const existingRequest =
          await prisma.operationDefectEditRequest.findUnique({
            where: { id: requestIdInt },
            include: { requestedBy: true },
          });

        if (!existingRequest) {
          return res.status(404).json({ error: "Edit request not found" });
        }

        // Check if the user is authorized to update this request
        if (existingRequest.requestedById !== userIdInt) {
          return res
            .status(403)
            .json({ error: "Not authorized to update this request" });
        }

        // Update the existing request
        const updatedRequest = await prisma.operationDefectEditRequest.update({
          where: { id: requestIdInt },
          data: {
            requestedQty,
            requestedRw,
            requestedNg,
            reason,
            // Include requestType in updates
            requestType: requestType || "edit",
            // Keep the status as pending
            status: "pending",
          },
        });

        console.log("Updated edit request:", updatedRequest);

        return res.status(200).json({
          message: "Edit request updated successfully",
          editRequest: updatedRequest,
        });
      }

      // Create the edit request with appropriate fields
      let editRequestData: any = {
        operation: { connect: { id: operationIdToUse } },
        productionOrder: { connect: { id: productionOrder.id } },
        requestedBy: { connect: { id: userIdInt } },
        currentQty: currentQty || 0,
        currentRw: currentRw || 0,
        currentNg: currentNg || 0,
        currentReplacement: data.currentReplacement || 0,
        requestedQty,
        requestedRw,
        requestedNg,
        requestedReplacement: data.requestedReplacement || 0,
        reason,
        status: "pending",
        requestType,
        operationCode: data.operationCode, // Store operation code to identify OP10
      };

      // Add type-specific fields
      if (
        (requestType === "edit" || requestType === "delete") &&
        opDefectIdInt
      ) {
        // For edit or delete requests, connect to an existing operation defect
        editRequestData.operationDefect = { connect: { id: opDefectIdInt } };
      } else if (requestType === "add") {
        // For add requests, store the defect information
        editRequestData.defectId = defectIdInt;
        editRequestData.defectName = defectName;
        editRequestData.defectCategory = defectCategory;
        editRequestData.defectReworkable = defectReworkable;
        editRequestData.defectMachine = defectMachine;
        // Don't set operationDefect or operationDefectId for add requests
      }

      console.log("Creating edit request with data:", editRequestData);

      try {
        // Create the edit request
        const editRequest = await prisma.operationDefectEditRequest.create({
          data: editRequestData,
        });

        console.log("Created edit request:", editRequest);

        // Create a notification for admin users directly using Prisma
        try {
          console.log("Creating notification for admin users");

          // Find admin users
          const adminUsers = await prisma.user.findMany({
            where: {
              role: {
                equals: "Admin",
                mode: "insensitive",
              },
            },
            select: { id: true },
          });

          console.log(`Found ${adminUsers.length} admin users to notify`);

          // Create notifications for each admin
          if (adminUsers.length > 0) {
            const notificationPromises = adminUsers.map((admin) => {
              let requestTypeLabel = "edit";
              if (requestType === "add") requestTypeLabel = "add";
              if (requestType === "delete") requestTypeLabel = "delete";

              return prisma.notification.create({
                data: {
                  type: "defect-edit",
                  title: `New Defect ${
                    requestTypeLabel.charAt(0).toUpperCase() +
                    requestTypeLabel.slice(1)
                  } Request`,
                  message: `A defect ${requestTypeLabel} has been requested for ${
                    defectName ||
                    data.defectName ||
                    `Defect ID: ${operationDefectId || defectId}`
                  } on PO: ${poNumber}`,
                  userId: admin.id,
                  sourceId: editRequest.id.toString(),
                  sourceType: "operationDefectEditRequest",
                  linkUrl: "/operation-defects-edit-requests",
                  isRead: false,
                },
              });
            });

            await Promise.all(notificationPromises);
            console.log("Notifications created successfully in database");
          } else {
            console.log("No admin users found to notify");
          }
        } catch (error) {
          console.error("Error creating notification:", error);
          // Don't block the main response if notification creation fails
        }

        return res.status(201).json({
          message: "Edit request created successfully",
          editRequest,
        });
      } catch (error: any) {
        console.error("Error creating edit request:", error);
        return res.status(500).json({
          error: "Internal server error",
          details: error.toString(),
        });
      }
    } catch (error: any) {
      console.error("Error creating edit request:", error);
      return res.status(500).json({
        error: "Internal server error",
        details: error.toString(),
      });
    }
  }

  // Handle GET request to fetch edit requests
  else if (req.method === "GET") {
    try {
      // Parse query parameters
      const {
        status,
        count,
        sortField,
        sortDirection,
        operationDefectId,
        operationId,
        requestType,
      } = req.query;

      // Build where clause based on parameters
      const where: any = {};
      if (status && typeof status === "string") {
        where.status = status;
      }

      // Add operationDefectId to where clause if provided
      if (operationDefectId) {
        console.log(`Filtering by operationDefectId: ${operationDefectId}`);

        // Skip if the operationDefectId is 'undefined' or not a valid number
        if (operationDefectId === "undefined" || operationDefectId === "null") {
          console.log(
            "Invalid operationDefectId value (undefined/null), returning empty results"
          );
          return res.status(200).json({
            editRequests: [],
          });
        }

        // Handle the case where operationDefectId is a string array (from query params)
        let operationDefectIdStr: string = Array.isArray(operationDefectId)
          ? operationDefectId[0]
          : (operationDefectId as string);

        // Convert to integer
        const operationDefectIdInt = parseInt(operationDefectIdStr, 10);

        // Verify it's a valid number
        if (isNaN(operationDefectIdInt)) {
          console.log(
            "Invalid operationDefectId (not a number), returning empty results"
          );
          return res.status(200).json({
            editRequests: [],
          });
        }

        where.operationDefectId = operationDefectIdInt;
      }

      // Add operationId to where clause if provided
      if (operationId) {
        console.log(`Filtering by operationId: ${operationId}`);

        // Handle the case where operationId is a string array (from query params)
        let operationIdStr: string = Array.isArray(operationId)
          ? operationId[0]
          : (operationId as string);

        // Convert to integer
        const operationIdInt = parseInt(operationIdStr, 10);

        // Verify it's a valid number
        if (isNaN(operationIdInt)) {
          console.log(
            "Invalid operationId (not a number), returning empty results"
          );
          return res.status(200).json({
            editRequests: [],
          });
        }

        where.operationId = operationIdInt;
      }

      // Add requestType to where clause if provided
      if (requestType) {
        console.log(`Filtering by requestType: ${requestType}`);
        where.requestType = Array.isArray(requestType)
          ? requestType[0]
          : requestType;
      }

      // If count parameter is true, return only the count
      if (count === "true") {
        console.log("Counting edit requests with filter:", where);

        const requestCount = await prisma.operationDefectEditRequest.count({
          where,
        });

        console.log("Edit request count:", requestCount);

        return res.status(200).json({
          count: requestCount,
        });
      }

      // Define the sort mapping for front-end to database fields
      const fieldMapping: Record<string, string> = {
        poNumber: "productionOrder.poNumber",
        operation: "operation.operation",
        defect: "operationDefect.defect.name",
        currentQty: "currentQty",
        requestedQty: "requestedQty",
        requestedBy: "requestedBy.name",
        createdAt: "createdAt",
        status: "status",
      };

      // Build orderBy object
      let orderBy: any = { createdAt: "desc" }; // Default sorting

      if (sortField && typeof sortField === "string") {
        const mappedField = fieldMapping[sortField];

        if (mappedField) {
          console.log(
            `Sorting by ${mappedField} in ${sortDirection || "desc"} order`
          );

          // For fields that require sorting by relations, we use different approach
          if (mappedField.includes(".")) {
            // For related fields, we use a different sorting approach
            const [relation, field] = mappedField.split(".");
            orderBy = {
              [relation]: {
                [field]: sortDirection === "asc" ? "asc" : "desc",
              },
            };
          } else {
            // For direct fields, we can sort directly
            orderBy = {
              [mappedField]: sortDirection === "asc" ? "asc" : "desc",
            };
          }
        }
      }

      // Otherwise, return the full list with details
      console.log(
        "Fetching edit requests with filter:",
        where,
        "and order:",
        orderBy
      );

      const editRequests = await prisma.operationDefectEditRequest.findMany({
        where,
        include: {
          operationDefect: true,
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
        orderBy,
      });

      console.log(`Found ${editRequests.length} edit requests`);
      if (editRequests.length > 0) {
        console.log("First edit request details:", {
          id: editRequests[0].id,
          operationDefectId: editRequests[0].operationDefectId,
          requestedBy: editRequests[0].requestedBy
            ? typeof editRequests[0].requestedBy === "object"
              ? `${editRequests[0].requestedBy.name} (${editRequests[0].requestedBy.id})`
              : editRequests[0].requestedBy
            : "Unknown",
          status: editRequests[0].status,
        });
      }

      return res.status(200).json({
        editRequests,
      });
    } catch (error) {
      console.error("Error fetching edit requests:", error);
      return res.status(500).json({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Handle unsupported HTTP methods
  else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

export default withAuth(handler);
