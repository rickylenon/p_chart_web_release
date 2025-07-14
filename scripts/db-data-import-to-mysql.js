#!/usr/bin/env node

const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const process = require("process");

// Configuration
const DB_CONFIG = {
  host: "localhost",
  port: 3306,
  database: "pchart_web",
  user: "root",
  password: "rootroot",
  multipleStatements: true, // Required for executing multiple SQL statements
  maxAllowedPacket: 1024 * 1024 * 128, // 128MB packet size
  connectTimeout: 60000, // 60 seconds
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

const SQL_INPUT_FILE = path.join(
  process.cwd(),
  "data",
  "production-data-latest.sql"
);

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
  if (error.sqlMessage) {
    log(`SQL Message: ${error.sqlMessage}`, "ERROR");
  }
}

// Helper function to split SQL statements into smaller chunks
function splitSqlStatements(sqlContent) {
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
        statements.push(statement);
      }
      currentStatement = "";
    }
  }

  // Add any remaining statement
  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }

  return statements;
}

// Test database connection and check for SQL file
async function testConnection() {
  let connection;
  try {
    log("Testing MySQL connection...");
    connection = await mysql.createConnection(DB_CONFIG);
    const [rows] = await connection.execute(
      "SELECT COUNT(*) as count FROM users"
    );
    const userCount = rows[0].count;
    log(
      `✓ MySQL connected successfully (${userCount} users currently in local DB)`
    );

    log("Checking for SQL input file...");
    if (!fs.existsSync(SQL_INPUT_FILE)) {
      log(`✗ SQL input file not found: ${SQL_INPUT_FILE}`, "ERROR");
      log("Please run: node scripts/db-data-export-postgres.js", "ERROR");
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
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Configure MySQL server settings for large imports
async function configureServerForImport(connection) {
  log("Configuring MySQL server for large imports...");
  const settings = [
    "SET GLOBAL max_allowed_packet=134217728", // 128MB
    "SET GLOBAL net_buffer_length=1048576", // 1MB
    "SET GLOBAL connect_timeout=60",
    "SET GLOBAL interactive_timeout=28800",
    "SET GLOBAL wait_timeout=28800",
    "SET GLOBAL net_write_timeout=1800",
    "SET GLOBAL net_read_timeout=1800",
  ];

  try {
    for (const setting of settings) {
      await connection.query(setting);
    }
    log("✓ MySQL server configured successfully for large imports");
  } catch (error) {
    log(
      "Warning: Could not configure MySQL server settings. You may need to run MySQL with elevated privileges.",
      "WARN"
    );
    log(`Attempted to set: ${settings.join(", ")}`, "WARN");
  }
}

// SQL file execution function
async function executeSqlFile() {
  let connection;
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

    // Connect to database
    connection = await mysql.createConnection(DB_CONFIG);

    // Configure server for large imports
    await configureServerForImport(connection);

    // Start transaction manually
    await connection.query("START TRANSACTION");

    // Execute statements one by one
    log("Executing SQL statements...");
    let executedCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip transaction statements as we handle them manually
      if (statement.trim().match(/^(START\s+TRANSACTION|COMMIT|ROLLBACK)/i)) {
        continue;
      }

      try {
        await connection.query(statement);
        executedCount++;

        // Log progress for large operations
        if (executedCount % 100 === 0 || executedCount === statements.length) {
          log(`Executed ${executedCount}/${statements.length} statements`);
        }
      } catch (error) {
        // Rollback on error
        await connection.query("ROLLBACK");
        log(`Failed to execute statement ${i + 1}: ${error.message}`, "ERROR");
        log(`Statement: ${statement.substring(0, 200)}...`, "ERROR");
        throw error;
      }
    }

    // Commit transaction
    await connection.query("COMMIT");

    log(`✓ SQL file executed successfully (${executedCount} statements)`);
    return true;
  } catch (error) {
    handleError(error, "executeSqlFile");
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Get table record counts
async function getTableCounts() {
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    const tables = [
      "users",
      "master_defects",
      "production_orders",
      "operations",
      "operation_defects",
      "operation_steps",
      "operation_lines",
      "standard_costs",
      "operation_defect_edit_requests",
      "notifications",
      "audit_logs",
      "sessions",
    ];

    const counts = {};
    for (const table of tables) {
      try {
        const [rows] = await connection.execute(
          `SELECT COUNT(*) as count FROM ${table}`
        );
        counts[table] = rows[0].count;
      } catch (e) {
        counts[table] = 0;
      }
    }

    return counts;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Main synchronization function
async function syncProductionData() {
  const startTime = new Date();
  log("========================================");
  log("Starting Production Data Synchronization (From SQL File)");

  // Log database connection info (without password)
  log(
    `Database: ${DB_CONFIG.user}@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`
  );
  log(
    `Note: Set MYSQL_* environment variables to override database connection settings`
  );

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
    const counts = await getTableCounts();
    const totalRecords = Object.values(counts).reduce(
      (sum, count) => sum + count,
      0
    );

    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;

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
      totalRecords,
      duration,
      inputFile: SQL_INPUT_FILE,
      counts,
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
