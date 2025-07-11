import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { withAuth } from "@/lib/auth";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  console.log("Operation Defects List API called");

  if (req.method === "POST") {
    try {
      // Parse request body
      const data =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      console.log(
        "Fetching operation defects for operationId:",
        data.operationId
      );

      const { operationId } = data;

      if (!operationId) {
        return res.status(400).json({ error: "Operation ID is required" });
      }

      // Get user ID for auth
      console.log("Session data:", session?.user);
      const userIdString = session?.user?.id;

      if (!userIdString || userIdString === "undefined") {
        console.log("Invalid user ID in session:", userIdString);
        return res
          .status(401)
          .json({ error: "Invalid user session - please login again" });
      }

      const userId = parseInt(userIdString);
      if (isNaN(userId)) {
        console.log("Failed to parse user ID:", userIdString);
        return res.status(401).json({ error: "Invalid user ID format" });
      }

      console.log("Authenticated user ID:", userId);

      // Fetch operation defects from the database
      const operationDefects = await prisma.operationDefect.findMany({
        where: {
          operationId: parseInt(operationId.toString()),
        },
        include: {
          defect: true,
          recordedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      console.log(
        `Found ${operationDefects.length} defects for operation ${operationId}`
      );

      // Return formatted operation defects
      return res.status(200).json({
        success: true,
        data: operationDefects,
      });
    } catch (error) {
      console.error("Error fetching operation defects:", error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: "Method not allowed" });
}

export default withAuth(handler);
