#!/usr/bin/env node

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const process = require("process");

// Parse command line arguments
const args = process.argv.slice(2);
const skipTables = new Set();
let fastMode = false;

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === "--help" || arg === "-h") {
    console.log(`
P-Chart Production Data Export Tool

Usage: node scripts/production-data-export.js [options]

Options:
  --fast                     Skip large non-critical tables (audit_logs, sessions, notifications)
  --skip-audit-logs         Skip audit logs table
  --skip-sessions           Skip sessions table  
  --skip-notifications      Skip notifications table
  --skip-edit-requests      Skip operation defect edit requests table
  --skip-tables=table1,table2  Skip specific tables (comma-separated)
  --help, -h                Show this help message

Examples:
  node scripts/production-data-export.js --fast
  node scripts/production-data-export.js --skip-audit-logs --skip-sessions
  node scripts/production-data-export.js --skip-tables=audit_logs,sessions,notifications
`);
    process.exit(0);
  }

  if (arg === "--fast") {
    fastMode = true;
    skipTables.add("audit_logs");
    skipTables.add("sessions");
    skipTables.add("notifications");
  } else if (arg === "--skip-audit-logs") {
    skipTables.add("audit_logs");
  } else if (arg === "--skip-sessions") {
    skipTables.add("sessions");
  } else if (arg === "--skip-notifications") {
    skipTables.add("notifications");
  } else if (arg === "--skip-edit-requests") {
    skipTables.add("operation_defect_edit_requests");
  } else if (arg.startsWith("--skip-tables=")) {
    const tables = arg.split("=")[1].split(",");
    tables.forEach((table) => skipTables.add(table.trim()));
  }
}

// Configuration
const NEON_DATABASE_URL =
  process.env.NEON_DATABASE_URL ||
  "postgresql://neondb_owner:npg_taWfnw1eIpc7@ep-green-poetry-a109oi3r.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

const OUTPUT_FILE = path.join(
  process.cwd(),
  "data",
  "production-data-latest.sql"
);

// Create Prisma client for NeonDB (source database)
const neonPrisma = new PrismaClient({
  datasources: {
    db: {
      url: NEON_DATABASE_URL,
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

// Check if table should be skipped
function shouldSkipTable(tableName) {
  return skipTables.has(tableName);
}

// Escape SQL string values
function escapeSqlValue(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }

  // Handle Prisma Decimal objects
  if (
    value &&
    typeof value === "object" &&
    value.toString &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  ) {
    const stringValue = value.toString();
    // Check if this looks like a quoted number from Prisma Decimal
    const quotedNumberMatch = stringValue.match(/^"([0-9.-]+)"$/);
    if (quotedNumberMatch) {
      const numericValue = parseFloat(quotedNumberMatch[1]);
      if (!isNaN(numericValue)) {
        return numericValue;
      }
    }
    // If it's a valid number, return as numeric
    if (!isNaN(stringValue) && !isNaN(parseFloat(stringValue))) {
      return parseFloat(stringValue);
    }
  }

  if (typeof value === "string") {
    // Check if string contains a quoted number (fix malformed data)
    const quotedNumberMatch = value.match(/^"([0-9.-]+)"$/);
    if (quotedNumberMatch) {
      // Extract the number from the quotes and return as numeric
      const numericValue = parseFloat(quotedNumberMatch[1]);
      if (!isNaN(numericValue)) {
        return numericValue;
      }
    }
    return `'${value.replace(/'/g, "''")}'`;
  }
  if (typeof value === "number") {
    // Handle numeric values - don't quote them
    return value;
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }
  if (typeof value === "object") {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
  // For any other numeric-like values (like Decimal), convert to number
  if (!isNaN(value) && !isNaN(parseFloat(value))) {
    return parseFloat(value);
  }
  return value;
}

// Generate INSERT statement for a table
function generateInsertStatement(tableName, records, columns) {
  if (!records || records.length === 0) {
    return `-- No data to insert for ${tableName}\n`;
  }

  // Quote column names to handle PostgreSQL case sensitivity
  const quotedColumns = columns.map((col) => `"${col}"`);
  const columnNames = quotedColumns.join(", ");

  let sql = `-- Insert data for ${tableName}\n`;
  sql += `INSERT INTO ${tableName} (${columnNames}) VALUES\n`;

  const values = records
    .map((record) => {
      const valueList = columns
        .map((col) => escapeSqlValue(record[col]))
        .join(", ");
      return `  (${valueList})`;
    })
    .join(",\n");

  sql += values + "\n";
  sql += `ON CONFLICT (id) DO UPDATE SET\n`;

  const updateColumns = columns
    .filter((col) => col !== "id")
    .map((col) => {
      return `  "${col}" = EXCLUDED."${col}"`;
    })
    .join(",\n");

  sql += updateColumns + ";\n\n";

  return sql;
}

// Export functions for each table
async function exportUsers() {
  try {
    log("Exporting users...");
    const users = await neonPrisma.user.findMany({
      orderBy: { id: "asc" },
    });

    const columns = [
      "id",
      "username",
      "password",
      "name",
      "email",
      "role",
      "isActive",
      "createdAt",
      "lastLogin",
      "department",
    ];
    const records = users.map((user) => ({
      id: user.id,
      username: user.username,
      password: user.password,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      department: user.department,
    }));

    log(`Found ${users.length} users to export`);
    return generateInsertStatement("users", records, columns);
  } catch (error) {
    handleError(error, "exportUsers");
    return `-- Error exporting users: ${error.message}\n`;
  }
}

async function exportMasterDefects() {
  try {
    log("Exporting master defects...");
    const defects = await neonPrisma.masterDefect.findMany({
      orderBy: { id: "asc" },
    });

    const columns = [
      "id",
      "name",
      "description",
      "category",
      "applicableOperation",
      "reworkable",
      "machine",
      "isActive",
      "deactivatedAt",
      "deactivatedById",
    ];
    const records = defects.map((defect) => ({
      id: defect.id,
      name: defect.name,
      description: defect.description,
      category: defect.category,
      applicableOperation: defect.applicableOperation,
      reworkable: defect.reworkable,
      machine: defect.machine,
      isActive: defect.isActive,
      deactivatedAt: defect.deactivatedAt,
      deactivatedById: defect.deactivatedById,
    }));

    log(`Found ${defects.length} master defects to export`);
    return generateInsertStatement("master_defects", records, columns);
  } catch (error) {
    handleError(error, "exportMasterDefects");
    return `-- Error exporting master defects: ${error.message}\n`;
  }
}

async function exportProductionOrders() {
  try {
    log("Exporting production orders...");
    const orders = await neonPrisma.productionOrder.findMany({
      orderBy: { id: "asc" },
    });

    const columns = [
      "id",
      "poNumber",
      "lotNumber",
      "poQuantity",
      "itemName",
      "status",
      "currentOperation",
      "currentOperationStartTime",
      "currentOperationEndTime",
      "createdAt",
      "updatedAt",
      "editingUserId",
      "editingUserName",
      "lockedAt",
      "costPerUnit",
      "totalDefectCost",
      "lastCostUpdate",
    ];
    const records = orders.map((order) => ({
      id: order.id,
      poNumber: order.poNumber,
      lotNumber: order.lotNumber,
      poQuantity: order.poQuantity,
      itemName: order.itemName,
      status: order.status,
      currentOperation: order.currentOperation,
      currentOperationStartTime: order.currentOperationStartTime,
      currentOperationEndTime: order.currentOperationEndTime,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      editingUserId: order.editingUserId,
      editingUserName: order.editingUserName,
      lockedAt: order.lockedAt,
      costPerUnit: order.costPerUnit,
      totalDefectCost: order.totalDefectCost,
      lastCostUpdate: order.lastCostUpdate,
    }));

    log(`Found ${orders.length} production orders to export`);
    return generateInsertStatement("production_orders", records, columns);
  } catch (error) {
    handleError(error, "exportProductionOrders");
    return `-- Error exporting production orders: ${error.message}\n`;
  }
}

async function exportOperations() {
  try {
    log("Exporting operations...");
    const operations = await neonPrisma.operation.findMany({
      orderBy: { id: "asc" },
    });

    const columns = [
      "id",
      "productionOrderId",
      "operation",
      "operatorId",
      "startTime",
      "endTime",
      "inputQuantity",
      "outputQuantity",
      "productionHours",
      "accumulatedManHours",
      "rf",
      "lineNo",
      "shift",
      "encodedById",
      "encodedTime",
      "defectCost",
    ];
    const records = operations.map((operation) => ({
      id: operation.id,
      productionOrderId: operation.productionOrderId,
      operation: operation.operation,
      operatorId: operation.operatorId,
      startTime: operation.startTime,
      endTime: operation.endTime,
      inputQuantity: operation.inputQuantity,
      outputQuantity: operation.outputQuantity,
      productionHours: operation.productionHours,
      accumulatedManHours: operation.accumulatedManHours,
      rf: operation.rf,
      lineNo: operation.lineNo,
      shift: operation.shift,
      encodedById: operation.encodedById,
      encodedTime: operation.encodedTime,
      defectCost: operation.defectCost,
    }));

    log(`Found ${operations.length} operations to export`);
    return generateInsertStatement("operations", records, columns);
  } catch (error) {
    handleError(error, "exportOperations");
    return `-- Error exporting operations: ${error.message}\n`;
  }
}

async function exportOperationDefects() {
  try {
    log("Exporting operation defects...");
    const defects = await neonPrisma.operationDefect.findMany({
      orderBy: { id: "asc" },
    });

    const columns = [
      "id",
      "operationId",
      "defect_id",
      "defectName",
      "defectCategory",
      "defectMachine",
      "defectReworkable",
      "quantity",
      "quantityRework",
      "quantityNogood",
      "quantityReplacement",
      "recordedAt",
      "recordedById",
    ];
    const records = defects.map((defect) => ({
      id: defect.id,
      operationId: defect.operationId,
      defect_id: defect.defectId,
      defectName: defect.defectName,
      defectCategory: defect.defectCategory,
      defectMachine: defect.defectMachine,
      defectReworkable: defect.defectReworkable,
      quantity: defect.quantity,
      quantityRework: defect.quantityRework,
      quantityNogood: defect.quantityNogood,
      quantityReplacement: defect.quantityReplacement,
      recordedAt: defect.recordedAt,
      recordedById: defect.recordedById,
    }));

    log(`Found ${defects.length} operation defects to export`);
    return generateInsertStatement("operation_defects", records, columns);
  } catch (error) {
    handleError(error, "exportOperationDefects");
    return `-- Error exporting operation defects: ${error.message}\n`;
  }
}

async function exportOperationSteps() {
  try {
    log("Exporting operation steps...");
    const steps = await neonPrisma.operationStep.findMany({
      orderBy: { id: "asc" },
    });

    const columns = ["id", "label", "operationNumber", "stepOrder"];
    const records = steps.map((step) => ({
      id: step.id,
      label: step.label,
      operationNumber: step.operationNumber,
      stepOrder: step.stepOrder,
    }));

    log(`Found ${steps.length} operation steps to export`);
    return generateInsertStatement("operation_steps", records, columns);
  } catch (error) {
    handleError(error, "exportOperationSteps");
    return `-- Error exporting operation steps: ${error.message}\n`;
  }
}

async function exportOperationLines() {
  try {
    log("Exporting operation lines...");
    const lines = await neonPrisma.operationLine.findMany({
      orderBy: { id: "asc" },
    });

    const columns = ["id", "operationNumber", "lineNumber"];
    const records = lines.map((line) => ({
      id: line.id,
      operationNumber: line.operationNumber,
      lineNumber: line.lineNumber,
    }));

    log(`Found ${lines.length} operation lines to export`);
    return generateInsertStatement("operation_lines", records, columns);
  } catch (error) {
    handleError(error, "exportOperationLines");
    return `-- Error exporting operation lines: ${error.message}\n`;
  }
}

async function exportStandardCosts() {
  try {
    if (shouldSkipTable("standard_costs")) {
      log("Skipping standard costs export (--skip-tables=standard_costs)");
      return `-- Skipped standard_costs table export\n`;
    }

    log("Exporting standard costs...");

    // Check if table exists before trying to export
    try {
      const tableExists = await neonPrisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'standard_costs'
        )
      `;

      if (!tableExists[0].exists) {
        log("WARNING: standard_costs table does not exist in NeonDB", "WARN");
        log("This table may need to be created via Prisma migration", "WARN");
        return `-- WARNING: standard_costs table does not exist in NeonDB\n-- Skipping standard_costs export\n\n`;
      }
    } catch (tableCheckError) {
      log(
        "Could not check if standard_costs table exists, proceeding with export attempt",
        "WARN"
      );
    }

    const costs = await neonPrisma.standardCost.findMany({
      orderBy: { id: "asc" },
    });

    const columns = [
      "id",
      "itemName",
      "description",
      "costPerUnit",
      "currency",
      "isActive",
      "createdAt",
      "updatedAt",
      "createdById",
      "updatedById",
    ];
    const records = costs.map((cost) => ({
      id: cost.id,
      itemName: cost.itemName,
      description: cost.description,
      costPerUnit: cost.costPerUnit,
      currency: cost.currency,
      isActive: cost.isActive,
      createdAt: cost.createdAt,
      updatedAt: cost.updatedAt,
      createdById: cost.createdById,
      updatedById: cost.updatedById,
    }));

    log(`Found ${costs.length} standard costs to export`);
    return generateInsertStatement("standard_costs", records, columns);
  } catch (error) {
    if (error.code === "P2021" || error.message.includes("does not exist")) {
      log("ERROR: standard_costs table does not exist in database", "ERROR");
      log(
        "Please run: npx prisma db push  or  npx prisma migrate deploy",
        "ERROR"
      );
      return `-- ERROR: standard_costs table does not exist in database\n-- Please run Prisma migrations to create missing tables\n\n`;
    }
    handleError(error, "exportStandardCosts");
    return `-- Error exporting standard costs: ${error.message}\n`;
  }
}

async function exportOperationDefectEditRequests() {
  try {
    if (shouldSkipTable("operation_defect_edit_requests")) {
      log(
        "Skipping operation defect edit requests export (--skip-edit-requests)"
      );
      return `-- Skipped operation_defect_edit_requests table export\n`;
    }

    log("Exporting operation defect edit requests...");
    const requests = await neonPrisma.operationDefectEditRequest.findMany({
      orderBy: { id: "asc" },
    });

    const columns = [
      "id",
      "operationDefectId",
      "operationId",
      "productionOrderId",
      "requestedById",
      "requestType",
      "defectId",
      "defectName",
      "defectCategory",
      "defectReworkable",
      "defectMachine",
      "currentQty",
      "currentRw",
      "currentNg",
      "currentReplacement",
      "requestedQty",
      "requestedRw",
      "requestedNg",
      "requestedReplacement",
      "operationCode",
      "reason",
      "status",
      "resolvedById",
      "resolutionNote",
      "createdAt",
      "resolvedAt",
    ];
    const records = requests.map((request) => ({
      id: request.id,
      operationDefectId: request.operationDefectId,
      operationId: request.operationId,
      productionOrderId: request.productionOrderId,
      requestedById: request.requestedById,
      requestType: request.requestType,
      defectId: request.defectId,
      defectName: request.defectName,
      defectCategory: request.defectCategory,
      defectReworkable: request.defectReworkable,
      defectMachine: request.defectMachine,
      currentQty: request.currentQty,
      currentRw: request.currentRw,
      currentNg: request.currentNg,
      currentReplacement: request.currentReplacement,
      requestedQty: request.requestedQty,
      requestedRw: request.requestedRw,
      requestedNg: request.requestedNg,
      requestedReplacement: request.requestedReplacement,
      operationCode: request.operationCode,
      reason: request.reason,
      status: request.status,
      resolvedById: request.resolvedById,
      resolutionNote: request.resolutionNote,
      createdAt: request.createdAt,
      resolvedAt: request.resolvedAt,
    }));

    log(`Found ${requests.length} operation defect edit requests to export`);
    return generateInsertStatement(
      "operation_defect_edit_requests",
      records,
      columns
    );
  } catch (error) {
    handleError(error, "exportOperationDefectEditRequests");
    return `-- Error exporting operation defect edit requests: ${error.message}\n`;
  }
}

async function exportNotifications() {
  try {
    if (shouldSkipTable("notifications")) {
      log(
        "Skipping notifications export (--skip-notifications or --fast mode)"
      );
      return `-- Skipped notifications table export\n`;
    }

    log("Exporting notifications...");
    const notifications = await neonPrisma.notification.findMany({
      orderBy: { id: "asc" },
    });

    const columns = [
      "id",
      "type",
      "title",
      "message",
      "isRead",
      "createdAt",
      "updatedAt",
      "linkUrl",
      "userId",
      "sourceId",
      "sourceType",
      "metadata",
    ];
    const records = notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
      linkUrl: notification.linkUrl,
      userId: notification.userId,
      sourceId: notification.sourceId,
      sourceType: notification.sourceType,
      metadata: notification.metadata,
    }));

    log(`Found ${notifications.length} notifications to export`);
    return generateInsertStatement("notifications", records, columns);
  } catch (error) {
    handleError(error, "exportNotifications");
    return `-- Error exporting notifications: ${error.message}\n`;
  }
}

async function exportAuditLogs() {
  try {
    if (shouldSkipTable("audit_logs")) {
      log("Skipping audit logs export (--skip-audit-logs or --fast mode)");
      return `-- Skipped audit_logs table export\n`;
    }

    log("Exporting audit logs...");
    const auditLogs = await neonPrisma.auditLog.findMany({
      orderBy: { id: "asc" },
    });

    const columns = [
      "id",
      "tableName",
      "recordId",
      "action",
      "oldValues",
      "newValues",
      "userId",
      "timestamp",
      "ipAddress",
      "userAgent",
    ];
    const records = auditLogs.map((log) => ({
      id: log.id,
      tableName: log.tableName,
      recordId: log.recordId,
      action: log.action,
      oldValues: log.oldValues,
      newValues: log.newValues,
      userId: log.userId,
      timestamp: log.timestamp,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
    }));

    log(`Found ${auditLogs.length} audit logs to export`);
    return generateInsertStatement("audit_logs", records, columns);
  } catch (error) {
    handleError(error, "exportAuditLogs");
    return `-- Error exporting audit logs: ${error.message}\n`;
  }
}

async function exportSessions() {
  try {
    if (shouldSkipTable("sessions")) {
      log("Skipping sessions export (--skip-sessions or --fast mode)");
      return `-- Skipped sessions table export\n`;
    }

    log("Exporting sessions...");
    const sessions = await neonPrisma.session.findMany({
      orderBy: { id: "asc" },
    });

    const columns = [
      "id",
      "userId",
      "token",
      "ipAddress",
      "userAgent",
      "createdAt",
      "expiresAt",
      "lastActivity",
    ];
    const records = sessions.map((session) => ({
      id: session.id,
      userId: session.userId,
      token: session.token,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      lastActivity: session.lastActivity,
    }));

    log(`Found ${sessions.length} sessions to export`);
    return generateInsertStatement("sessions", records, columns);
  } catch (error) {
    handleError(error, "exportSessions");
    return `-- Error exporting sessions: ${error.message}\n`;
  }
}

// Main export function
async function exportProductionData() {
  const startTime = new Date();
  log("========================================");
  log("Starting Production Data Export");
  log("✓ Fixed: Using camelCase column names to match database schema");

  // Show configuration
  if (fastMode) {
    log("⚡ Fast mode enabled - skipping large non-critical tables");
  }
  if (skipTables.size > 0) {
    log(`📋 Tables to skip: ${Array.from(skipTables).join(", ")}`);
  }

  log(`Export started at: ${startTime.toISOString()}`);
  log("========================================");

  try {
    // Test connection
    log("Testing NeonDB connection...");
    await neonPrisma.$connect();
    const userCount = await neonPrisma.user.count();
    log(`✓ NeonDB connected successfully (${userCount} users found)`);

    // Ensure data directory exists
    const dataDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      log(`Created data directory: ${dataDir}`);
    }

    // Start building SQL file
    let sqlContent = `-- P-Chart Web Application - Production Data Export\n`;
    sqlContent += `-- Generated: ${new Date().toISOString()}\n`;
    sqlContent += `-- Source Database: ${NEON_DATABASE_URL.replace(
      /password=[^@]+/,
      "password=***"
    )}\n`;
    sqlContent += `\n-- BEGIN TRANSACTION\n`;
    sqlContent += `BEGIN;\n\n`;

    // Export all tables in dependency order
    log("Exporting tables in dependency order...");

    // Independent tables first
    sqlContent += await exportOperationSteps();
    sqlContent += await exportOperationLines();
    sqlContent += await exportMasterDefects();
    sqlContent += await exportStandardCosts();
    sqlContent += await exportUsers();

    // Dependent tables
    sqlContent += await exportProductionOrders();
    sqlContent += await exportOperations();
    sqlContent += await exportOperationDefects();
    sqlContent += await exportOperationDefectEditRequests();
    sqlContent += await exportNotifications();
    sqlContent += await exportAuditLogs();
    sqlContent += await exportSessions();

    // Reset sequences
    sqlContent += `-- Reset sequences to maintain proper ID generation\n`;
    // Exclude notifications from sequence reset since it uses String ID (cuid) not integer sequence
    const allTables = [
      "users",
      "master_defects",
      "production_orders",
      "operations",
      "operation_defects",
      "operation_steps",
      "operation_lines",
      "standard_costs",
      "operation_defect_edit_requests",
      "audit_logs",
      "sessions",
    ];
    const tablesToReset = allTables.filter((table) => !shouldSkipTable(table));

    for (const table of tablesToReset) {
      sqlContent += `SELECT setval('${table}_id_seq', COALESCE((SELECT MAX(id) FROM ${table}), 1), true);\n`;
    }

    if (tablesToReset.length < allTables.length) {
      const skippedTables = allTables.filter((table) => shouldSkipTable(table));
      sqlContent += `-- Skipped sequence reset for: ${skippedTables.join(
        ", "
      )}\n`;
    }

    // Add note about notifications table
    sqlContent += `-- Note: notifications table uses String ID (cuid) - no sequence reset needed\n`;

    sqlContent += `\n-- COMMIT TRANSACTION\n`;
    sqlContent += `COMMIT;\n`;

    // Write to file
    fs.writeFileSync(OUTPUT_FILE, sqlContent, "utf8");

    const endTime = new Date();
    const duration = (endTime - startTime) / 1000; // seconds
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
    await neonPrisma.$disconnect();
    log("NeonDB connection closed");
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
