#!/usr/bin/env node

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const process = require("process");

// Configuration
const LOCAL_DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://pchart_user:pchart_password@localhost:5432/pchart_web";
const SQL_INPUT_FILE = path.join(
  process.cwd(),
  "data",
  "production-data-latest.sql"
);

// Create Prisma client for local database only
const localPrisma = new PrismaClient({
  datasources: {
    db: {
      url: LOCAL_DATABASE_URL,
    },
  },
  log: ["error", "warn"],
});

// Logging utility
function log(message, type = "INFO") {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
}

// Error handling utility
function handleError(error, context) {
  log(`Error in ${context}: ${error.message}`, "ERROR");
  if (error.code) {
    log(`Error code: ${error.code}`, "ERROR");
  }
  if (error.meta) {
    log(`Error meta: ${JSON.stringify(error.meta)}`, "ERROR");
  }
}

// SQL file execution function
async function executeSqlFile() {
  try {
    log("Checking for SQL input file...");

    if (!fs.existsSync(SQL_INPUT_FILE)) {
      throw new Error(`SQL input file not found: ${SQL_INPUT_FILE}`);
    }

    const fileStats = fs.statSync(SQL_INPUT_FILE);
    const fileSizeMB = (fileStats.size / 1024 / 1024).toFixed(2);
    log(`Found SQL file: ${SQL_INPUT_FILE} (${fileSizeMB} MB)`);

    log("Reading SQL file content...");
    const sqlContent = fs.readFileSync(SQL_INPUT_FILE, "utf8");

    if (!sqlContent || sqlContent.trim().length === 0) {
      throw new Error("SQL file is empty or contains no content");
    }

    log(`SQL file loaded successfully (${sqlContent.length} characters)`);

    // Split SQL content into individual statements
    log("Parsing SQL statements...");
    const statements = splitSqlStatements(sqlContent);
    log(`Found ${statements.length} SQL statements to execute`);

    // Execute statements one by one
    log("Executing SQL statements...");
    let executedCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      try {
        await localPrisma.$executeRawUnsafe(statement);
        executedCount++;

        // Log progress for large operations
        if (executedCount % 100 === 0 || executedCount === statements.length) {
          log(`Executed ${executedCount}/${statements.length} statements`);
        }
      } catch (error) {
        log(`Failed to execute statement ${i + 1}: ${error.message}`, "ERROR");
        log(`Statement: ${statement.substring(0, 200)}...`, "ERROR");
        throw error;
      }
    }

    log(`✓ SQL file executed successfully (${executedCount} statements)`);
    return true;
  } catch (error) {
    handleError(error, "executeSqlFile");
    throw error;
  }
}

// Helper function to split SQL content into individual statements
function splitSqlStatements(sqlContent) {
  // Remove comments and split by semicolons
  const statements = [];
  const lines = sqlContent.split("\n");
  let currentStatement = "";

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith("--")) {
      continue;
    }

    currentStatement += line + "\n";

    // If line ends with semicolon, it's the end of a statement
    if (trimmedLine.endsWith(";")) {
      const statement = currentStatement.trim();
      if (statement && statement !== ";") {
        // Filter out problematic sequence reset for notifications table
        // since notifications table uses String ID (cuid) not integer sequence
        if (!statement.includes("notifications_id_seq")) {
          statements.push(statement);
        } else {
          log(
            `Skipping problematic statement: ${statement.substring(0, 100)}...`,
            "WARN"
          );
        }
      }
      currentStatement = "";
    }
  }

  // Add any remaining statement
  if (currentStatement.trim()) {
    const statement = currentStatement.trim();
    if (statement && !statement.includes("notifications_id_seq")) {
      statements.push(statement);
    }
  }

  return statements;
}

// Test database connection and check for SQL file
async function testConnection() {
  try {
    log("Testing Local DB connection...");
    await localPrisma.$connect();
    const localUserCount = await localPrisma.user.count();
    log(
      `✓ Local DB connected successfully (${localUserCount} users currently in local DB)`
    );

    log("Checking for SQL input file...");
    if (!fs.existsSync(SQL_INPUT_FILE)) {
      log(`✗ SQL input file not found: ${SQL_INPUT_FILE}`, "ERROR");
      log("Please run: node scripts/production-data-export.js", "ERROR");
      return false;
    }

    const fileStats = fs.statSync(SQL_INPUT_FILE);
    const fileSizeMB = (fileStats.size / 1024 / 1024).toFixed(2);
    const fileAge = Math.round(
      (Date.now() - fileStats.mtime.getTime()) / (1000 * 60)
    ); // minutes
    log(`✓ SQL file found: ${fileSizeMB} MB, ${fileAge} minutes old`);

    return true;
  } catch (error) {
    handleError(error, "testConnection");
    return false;
  }
}

// Main synchronization function - executes SQL file
async function syncProductionData() {
  const startTime = new Date();
  log("========================================");
  log("Starting Production Data Synchronization (From SQL File)");
  log(`Sync started at: ${startTime.toISOString()}`);
  log("========================================");

  try {
    // Test connection and check for SQL file
    const connectionOk = await testConnection();
    if (!connectionOk) {
      throw new Error("Connection test or SQL file check failed");
    }

    log("");
    log("Executing SQL file to synchronize production data...");

    // Execute the SQL file
    await executeSqlFile();

    // Get final record counts for reporting
    log("");
    log("Counting synchronized records...");

    const counts = {
      users: await localPrisma.user.count(),
      masterDefects: await localPrisma.masterDefect.count(),
      productionOrders: await localPrisma.productionOrder.count(),
      operations: await localPrisma.operation.count(),
      operationDefects: await localPrisma.operationDefect.count(),
      operationSteps: await localPrisma.operationStep.count(),
      operationLines: await localPrisma.operationLine.count(),
    };

    // Count optional tables if they exist
    try {
      counts.standardCosts = await localPrisma.standardCost.count();
    } catch (e) {
      counts.standardCosts = 0;
    }

    try {
      counts.editRequests =
        await localPrisma.operationDefectEditRequest.count();
    } catch (e) {
      counts.editRequests = 0;
    }

    try {
      counts.notifications = await localPrisma.notification.count();
    } catch (e) {
      counts.notifications = 0;
    }

    try {
      counts.auditLogs = await localPrisma.auditLog.count();
    } catch (e) {
      counts.auditLogs = 0;
    }

    try {
      counts.sessions = await localPrisma.session.count();
    } catch (e) {
      counts.sessions = 0;
    }

    const totalRecords = Object.values(counts).reduce(
      (sum, count) => sum + count,
      0
    );

    const endTime = new Date();
    const duration = (endTime - startTime) / 1000; // seconds

    log("");
    log("========================================");
    log("Production Data Sync COMPLETED Successfully!");
    log(`Input file: ${SQL_INPUT_FILE}`);
    log(`Total records synchronized: ${totalRecords}`);
    log(`Record counts:`);
    Object.entries(counts).forEach(([table, count]) => {
      log(`  ${table}: ${count}`);
    });
    log(`Sync duration: ${duration.toFixed(2)} seconds`);
    log(`Completed at: ${endTime.toISOString()}`);
    log("========================================");

    return {
      success: true,
      totalRecords: totalRecords,
      duration: duration,
      inputFile: SQL_INPUT_FILE,
      counts: counts,
    };
  } catch (error) {
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;

    log("");
    log("========================================");
    log("Production Data Sync FAILED!");
    handleError(error, "syncProductionData");
    log(`Sync duration before failure: ${duration.toFixed(2)} seconds`);
    log(`Failed at: ${endTime.toISOString()}`);
    log("========================================");

    throw error;
  } finally {
    // Disconnect from database
    await localPrisma.$disconnect();
    log("Database connection closed");
  }
}

// Export for use in other scripts
module.exports = {
  syncProductionData,
  testConnection,
  executeSqlFile,
};

// Run if called directly
if (require.main === module) {
  syncProductionData()
    .then((result) => {
      console.log("\n✓ Data synchronization completed successfully!");
      console.log(`Total records synced: ${result.totalRecords}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n✗ Data synchronization failed!");
      console.error("Error:", error.message);
      process.exit(1);
    });
}
