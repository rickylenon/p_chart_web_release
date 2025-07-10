import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Manual loading of DATABASE_URL from .env file
function loadDatabaseUrl() {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    const envContent = fs.readFileSync(envPath, "utf8");
    const dbUrlMatch = envContent.match(/^DATABASE_URL\s*=\s*(.*)$/m);

    if (dbUrlMatch && dbUrlMatch[1]) {
      const dbUrl = dbUrlMatch[1].trim();
      console.log(`📌 Manually loaded DATABASE_URL from .env file`);
      return dbUrl;
    }
  } catch (err) {
    console.error("Error reading .env file:", err);
  }

  // Fallback to environment variable
  return process.env.DATABASE_URL;
}

// Load environment variables
dotenv.config();

// Function to safely log database URL without exposing credentials
function getSafeDbUrl(url: string): string {
  if (!url) return "Not set";
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.username ? "***:***" : ""}@${
      urlObj.host
    }${urlObj.pathname}`;
  } catch (e) {
    return url.replace(/\/\/[^@]+@/, "//***:***@");
  }
}

// Function to check database type from URL
function getDatabaseType(url: string): string {
  if (!url) return "unknown";
  if (url.startsWith("postgresql://") || url.startsWith("postgres://"))
    return "postgresql";
  if (url.startsWith("mysql://")) return "mysql";
  if (url.startsWith("file:") || url.includes(".db")) return "sqlite";
  return "unknown";
}

async function testConnection() {
  console.log("\n🔍 Testing database connection...");
  console.log("==============================");

  // Get database URL and type
  const dbUrl = loadDatabaseUrl() || "";
  const dbType = getDatabaseType(dbUrl);

  // Log environment info
  console.log("\n📊 Environment Information:");
  console.log(`Node Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Database URL: ${getSafeDbUrl(dbUrl)}`);
  console.log(`Detected Database Type: ${dbType}`);

  // Check for schema and URL mismatch
  console.log("\n🔎 Checking Database Configuration:");
  try {
    const prisma = new PrismaClient({
      log: ["error", "warn"],
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    });

    console.log("\n🔌 Attempting to connect to database...");

    // Test connection with appropriate query based on database type
    let result;

    if (dbType === "postgresql") {
      result =
        await prisma.$queryRaw`SELECT current_timestamp as time, current_database() as database, version() as version`;
    } else if (dbType === "mysql") {
      result =
        await prisma.$queryRaw`SELECT NOW() as time, DATABASE() as database, VERSION() as version`;
    } else if (dbType === "sqlite") {
      result =
        await prisma.$queryRaw`SELECT datetime('now') as time, 'SQLite' as database, sqlite_version() as version`;
    } else {
      // Generic query for unknown database type
      try {
        result = await prisma.$queryRaw`SELECT 1 as connected`;
      } catch (e: any) {
        throw new Error(
          `Unsupported database type or connection error: ${e.message}`
        );
      }
    }

    console.log("\n✅ Successfully connected to database!");
    console.log("==============================");
    console.log("Connection details:");
    console.log(result);

    // Get database statistics
    console.log("\n📈 Database Statistics:");

    // Count users
    const userCount = await prisma.user.count();
    console.log(`Users: ${userCount}`);

    // Count production orders
    const poCount = await prisma.productionOrder.count();
    console.log(`Production Orders: ${poCount}`);

    // Count operations
    const operationsCount = await prisma.operation.count();
    console.log(`Operations: ${operationsCount}`);

    // Count defects
    const defectsCount = await prisma.masterDefect.count();
    console.log(`Master Defects: ${defectsCount}`);

    // Get 5 most recent production orders
    console.log("\n🔄 Recent Production Orders:");
    const recentPOs = await prisma.productionOrder.findMany({
      select: {
        id: true,
        poNumber: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    recentPOs.forEach((po) => {
      console.log(
        `ID: ${po.id}, PO: ${po.poNumber}, Status: ${po.status}, Created: ${po.createdAt}`
      );
    });

    await prisma.$disconnect();
  } catch (error: any) {
    console.error("\n❌ Failed to connect to database:");
    console.error(error);

    // Check for common errors and provide specific advice
    const errorMsg = error.toString();

    if (
      errorMsg.includes("the URL must start with the protocol `postgresql://`")
    ) {
      console.log("\n🚨 Database Configuration Error:");
      console.log(
        "Your Prisma schema is configured for PostgreSQL but your DATABASE_URL doesn't match."
      );
      console.log("You have two options to fix this:");
      console.log(
        "1. Change your DATABASE_URL in .env to use PostgreSQL format:"
      );
      console.log(
        "   DATABASE_URL=postgresql://username:password@localhost:5432/pchart"
      );
      console.log(
        "2. OR update your schema.prisma provider to match your current database type."
      );

      // Check if looks like an SQLite connection
      if (dbType === "sqlite") {
        console.log(
          "\nIt appears you're trying to use SQLite. To use SQLite with Prisma:"
        );
        console.log(
          "1. Change provider in schema.prisma from 'postgresql' to 'sqlite'"
        );
        console.log(
          "2. Make sure your DATABASE_URL looks like: DATABASE_URL=file:./dev.db"
        );
      }
    } else if (errorMsg.includes("Can't reach database server")) {
      console.log("\n🚨 Connection Error:");
      console.log("Cannot reach the database server. Please check:");
      console.log("1. Is your database server running?");
      console.log("2. Are the host and port correct in your DATABASE_URL?");
      console.log("3. Do you have the necessary network access?");
    } else if (errorMsg.includes("Authentication failed")) {
      console.log("\n🚨 Authentication Error:");
      console.log(
        "Database username or password is incorrect in your DATABASE_URL."
      );
    } else if (
      errorMsg.includes("database") &&
      errorMsg.includes("does not exist")
    ) {
      console.log("\n🚨 Database Not Found Error:");
      console.log(
        "The database specified in your connection string doesn't exist."
      );
      console.log("You need to create it first. Run the following command:");
      console.log("   createdb pchart_web");
    }

    // Additional troubleshooting info
    console.log("\n🔧 General Troubleshooting tips:");
    console.log("1. Check if your DATABASE_URL is correct in .env file");
    console.log("2. Ensure database server is running");
    console.log("3. Verify network connectivity to database server");
    console.log("4. Check if database exists and user has proper permissions");
    console.log("\n💡 Run this command to check your .env file:");
    console.log("   cat .env | grep DATABASE_URL");
  }

  console.log("\n👋 Database connection test completed");
}

// Run the test
testConnection().catch((e) => {
  console.error("Unhandled error during connection test:", e);
  process.exit(1);
});
