import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("[HEALTH CHECK] Starting health check...");

  if (req.method !== "GET") {
    console.log("[HEALTH CHECK] Invalid method:", req.method);
    return res.status(405).json({
      status: "error",
      message: "Method not allowed",
      timestamp: new Date().toISOString(),
    });
  }

  try {
    // Basic application health
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      checks: {
        database: "unknown",
        application: "healthy",
      },
    };

    console.log("[HEALTH CHECK] Basic app status: healthy");

    // Database health check
    try {
      console.log("[HEALTH CHECK] Testing database connection...");
      await prisma.$queryRaw`SELECT 1`;
      health.checks.database = "healthy";
      console.log("[HEALTH CHECK] Database connection: healthy");
    } catch (dbError) {
      console.error("[HEALTH CHECK] Database connection failed:", dbError);
      health.checks.database = "unhealthy";
      health.status = "degraded";
    }

    // Return appropriate status code
    const statusCode = health.status === "healthy" ? 200 : 503;
    console.log(
      `[HEALTH CHECK] Returning status: ${health.status} (${statusCode})`
    );

    return res.status(statusCode).json(health);
  } catch (error) {
    console.error(
      "[HEALTH CHECK] Unexpected error during health check:",
      error
    );

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return res.status(500).json({
      status: "unhealthy",
      message: "Internal server error during health check",
      timestamp: new Date().toISOString(),
      error:
        process.env.NODE_ENV === "development"
          ? errorMessage
          : "Internal error",
    });
  }
}
