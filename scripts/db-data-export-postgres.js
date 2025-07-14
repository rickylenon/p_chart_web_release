#!/usr/bin/env node

const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
const process = require("process");

// Configuration
const DB_CONFIG = {
  host: "localhost",
  port: 5432,
  database: "pchart_web",
  user: "pchart_user",
  password: "pchart_password",
};

const OUTPUT_FILE = path.join(
  process.cwd(),
  "data",
  "production-data-latest.sql"
);

// Parse command line arguments
const args = process.argv.slice(2);
let fastMode = false;
let excludeTables = [];

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === "--help" || arg === "-h") {
    console.log(`
P-Chart Production Data Export Tool

Usage: node scripts/db-data-export-postgres.js [options]

Options:
  --fast                     Skip large non-critical tables (audit_logs, sessions, notifications)
  --skip-audit-logs         Skip audit logs table
  --skip-sessions           Skip sessions table  
  --skip-notifications      Skip notifications table
  --skip-edit-requests      Skip operation defect edit requests table
  --skip-tables=table1,table2  Skip specific tables (comma-separated)
  --help, -h                Show this help message

Examples:
  node scripts/db-data-export-postgres.js --fast
  node scripts/db-data-export-postgres.js --skip-audit-logs --skip-sessions
  node scripts/db-data-export-postgres.js --skip-tables=audit_logs,sessions,notifications
`);
    process.exit(0);
  }

  if (arg === "--fast") {
    fastMode = true;
    excludeTables.push("audit_logs", "sessions", "notifications");
  } else if (arg === "--skip-audit-logs") {
    excludeTables.push("audit_logs");
  } else if (arg === "--skip-sessions") {
    excludeTables.push("sessions");
  } else if (arg === "--skip-notifications") {
    excludeTables.push("notifications");
  } else if (arg === "--skip-edit-requests") {
    excludeTables.push("operation_defect_edit_requests");
  } else if (arg.startsWith("--skip-tables=")) {
    const tables = arg.split("=")[1].split(",");
    excludeTables.push(...tables.map((t) => t.trim()));
  }
}

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
}

// Table definitions in order of dependency
const TABLES = [
  { name: "users", idCol: "id" }, // Users must come first due to foreign key references
  { name: "operation_steps", idCol: "id" },
  { name: "operation_lines", idCol: "id" },
  { name: "master_defects", idCol: "id" },
  { name: "standard_costs", idCol: "id" },
  { name: "production_orders", idCol: "id" },
  { name: "operations", idCol: "id" },
  { name: "operation_defects", idCol: "id" },
  { name: "operation_defect_edit_requests", idCol: "id" },
  { name: "notifications", idCol: "id" },
  { name: "audit_logs", idCol: "id" },
  { name: "sessions", idCol: "id" },
];

// Escape SQL values for MySQL compatibility
function escapeSqlValue(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "string") {
    // Check if string is an ISO date
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
      // Convert ISO date string to MySQL datetime format
      return `'${value.replace("T", " ").replace(/\.\d{3}Z$/, "")}'`;
    }
    // Escape single quotes by doubling them
    return `'${value.replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
  }
  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }
  if (value instanceof Date) {
    // Format Date object to MySQL datetime format
    const pad = (num) => num.toString().padStart(2, "0");
    const year = value.getFullYear();
    const month = pad(value.getMonth() + 1);
    const day = pad(value.getDate());
    const hours = pad(value.getHours());
    const minutes = pad(value.getMinutes());
    const seconds = pad(value.getSeconds());
    return `'${year}-${month}-${day} ${hours}:${minutes}:${seconds}'`;
  }
  if (typeof value === "object") {
    // Properly escape JSON objects
    const jsonStr = JSON.stringify(value);
    return `'${jsonStr.replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
  }
  if (typeof value === "number") {
    return value;
  }
  return value;
}

// Generate INSERT statement for a table
async function generateTableInsert(client, tableName, columns) {
  const result = await client.query(`SELECT * FROM ${tableName} ORDER BY id`);
  if (!result.rows || result.rows.length === 0) {
    return `-- No data to insert for ${tableName}\n`;
  }

  const quotedColumns = columns.map((col) => `\`${col}\``);
  let sql = `-- Insert data for ${tableName}\n`;
  sql += `INSERT INTO ${tableName} (${quotedColumns.join(", ")}) VALUES\n`;

  const values = result.rows
    .map((row, index) => {
      const valueList = columns
        .map((col) => {
          const value = row[col];
          const escapedValue = escapeSqlValue(value);
          return escapedValue;
        })
        .join(", ");
      return `  (${valueList})`;
    })
    .join(",\n");

  sql += values + "\n";
  sql += `ON DUPLICATE KEY UPDATE\n`;

  const updateColumns = columns
    .filter((col) => col !== "id")
    .map((col) => `  \`${col}\` = VALUES(\`${col}\`)`)
    .join(",\n");

  sql += updateColumns + ";\n\n";

  return sql;
}

// Get column names for a table
async function getTableColumns(client, tableName) {
  const result = await client.query(
    `
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = $1 
    ORDER BY ordinal_position
  `,
    [tableName]
  );

  return result.rows.map((row) => row.column_name);
}

// Main export function
async function exportProductionData() {
  const startTime = new Date();
  log("========================================");
  log("Starting Production Data Export");

  // Show configuration
  if (fastMode) {
    log("⚡ Fast mode enabled - skipping large non-critical tables");
  }
  if (excludeTables.length > 0) {
    log(`📋 Tables to skip: ${excludeTables.join(", ")}`);
  }

  log(
    `Database: ${DB_CONFIG.user}@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`
  );
  log(`Export started at: ${startTime.toISOString()}`);
  log("========================================");

  const client = new Client(DB_CONFIG);

  try {
    // Ensure data directory exists
    const dataDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      log(`Created data directory: ${dataDir}`);
    }

    // Connect to database
    log("Connecting to PostgreSQL...");
    await client.connect();
    log("✓ Connected successfully");

    // Start building SQL file
    let sqlContent = `-- P-Chart Web Application - Production Data Export\n`;
    sqlContent += `-- Generated: ${new Date().toISOString()}\n\n`;
    sqlContent += `SET FOREIGN_KEY_CHECKS=0;\n`; // Disable foreign key checks temporarily
    sqlContent += `START TRANSACTION;\n\n`;

    // Export tables in dependency order
    for (const table of TABLES) {
      if (excludeTables.includes(table.name)) {
        log(`Skipping ${table.name} (excluded)`);
        continue;
      }

      log(`Exporting ${table.name}...`);
      const columns = await getTableColumns(client, table.name);
      const insertStatement = await generateTableInsert(
        client,
        table.name,
        columns
      );
      sqlContent += insertStatement;
    }

    // Reset auto_increment values
    sqlContent += `\n-- Reset auto_increment values\n`;
    const tablesToReset = TABLES.filter((t) => !excludeTables.includes(t.name));
    for (const table of tablesToReset) {
      sqlContent += `ALTER TABLE ${table.name} AUTO_INCREMENT = 1;\n`;
    }

    sqlContent += `\nSET FOREIGN_KEY_CHECKS=1;\n`; // Re-enable foreign key checks
    sqlContent += `COMMIT;\n`;

    // Write to file
    fs.writeFileSync(OUTPUT_FILE, sqlContent, "utf8");

    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    const fileSizeMB = (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2);

    log("");
    log("========================================");
    log("Production Data Export COMPLETED Successfully!");
    log(`Export file: ${OUTPUT_FILE}`);
    log(`File size: ${fileSizeMB} MB`);
    log(`Export duration: ${duration.toFixed(2)} seconds`);
    log(`Completed at: ${endTime.toISOString()}`);
    log("========================================");

    return {
      success: true,
      outputFile: OUTPUT_FILE,
      fileSizeMB: parseFloat(fileSizeMB),
      duration: duration,
    };
  } catch (error) {
    handleError(error, "exportProductionData");
    throw error;
  } finally {
    await client.end();
    log("Database connection closed");
  }
}

// Export for use in other scripts
module.exports = {
  exportProductionData,
};

// Run if called directly
if (require.main === module) {
  exportProductionData()
    .then((result) => {
      console.log(`\n✓ Production data export completed successfully!`);
      console.log(`Output file: ${result.outputFile}`);
      console.log(`File size: ${result.fileSizeMB} MB`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n✗ Production data export failed!");
      console.error("Error:", error.message);
      process.exit(1);
    });
}
