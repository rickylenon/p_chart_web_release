#!/usr/bin/env node

/**
 * Export and Bundle Workflow Script
 * 
 * This script automates the process of:
 * 1. Exporting production data from local database
 * 2. Creating deployment bundle with the data included
 * 
 * Run this after successfully syncing production data with production-data-import.js
 */

const { spawn } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

// Configuration
const EXPORT_SCRIPT = 'scripts/production-data-export.js';
const BUNDLE_SCRIPT_PS1 = 'deployment/create-deployment-bundle.ps1';
const BUNDLE_SCRIPT_SH = 'deployment/create-deployment-bundle.sh';

// Logging utility
function log(message, type = "INFO") {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
}

function logError(message) {
  log(message, "ERROR");
}

function logSuccess(message) {
  log(message, "SUCCESS");
}

function logWarning(message) {
  log(message, "WARNING");
}

// Execute command and return promise
function executeCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    log(`Executing: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Check if file exists
function checkFileExists(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Required file not found: ${filePath}`);
  }
  log(`✓ Found: ${filePath}`);
}

// Main workflow
async function exportAndBundle() {
  const startTime = new Date();
  
  log("========================================");
  log("Export and Bundle Workflow");
  log(`Started at: ${startTime.toISOString()}`);
  log("========================================");

  try {
    // Step 1: Check required files
    log("Step 1: Checking required files...");
    checkFileExists(EXPORT_SCRIPT);
    
    // Check if we have bundle creation script
    let bundleScript = null;
    if (existsSync(BUNDLE_SCRIPT_PS1)) {
      bundleScript = { script: BUNDLE_SCRIPT_PS1, isPS1: true };
      log(`✓ Found: ${BUNDLE_SCRIPT_PS1}`);
    } else if (existsSync(BUNDLE_SCRIPT_SH)) {
      bundleScript = { script: BUNDLE_SCRIPT_SH, isPS1: false };
      log(`✓ Found: ${BUNDLE_SCRIPT_SH}`);
    } else {
      logWarning("No automated bundle creation script found");
      logWarning("You will need to manually create the deployment bundle");
    }

    // Step 2: Export production data
    log("");
    log("Step 2: Exporting production data...");
    
    try {
      await executeCommand('node', [EXPORT_SCRIPT]);
      logSuccess("Production data exported successfully");
    } catch (error) {
      throw new Error(`Failed to export production data: ${error.message}`);
    }

    // Verify export was successful
    const exportedFile = path.join(process.cwd(), 'data', 'production-data-latest.sql');
    if (existsSync(exportedFile)) {
      const fs = require('fs');
      const stats = fs.statSync(exportedFile);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      logSuccess(`Export file created: ${exportedFile} (${sizeMB} MB)`);
    } else {
      throw new Error("Export file was not created");
    }

    // Step 3: Create deployment bundle (if available)
    if (bundleScript) {
      log("");
      log("Step 3: Creating deployment bundle...");
      
      try {
        if (bundleScript.isPS1) {
          // PowerShell script
          await executeCommand('powershell', ['-ExecutionPolicy', 'Bypass', '-File', bundleScript.script]);
        } else {
          // Bash script
          await executeCommand('bash', [bundleScript.script]);
        }
        logSuccess("Deployment bundle created successfully");
      } catch (error) {
        logWarning(`Bundle creation failed: ${error.message}`);
        logWarning("You can manually create the bundle later");
      }
    } else {
      log("");
      log("Step 3: Manual bundle creation required");
      log("Please manually copy the following to your deployment bundle:");
      log(`  - data/production-data-latest.sql`);
    }

    // Final summary
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;

    log("");
    log("========================================");
    logSuccess("Export and Bundle Workflow COMPLETED!");
    log(`Duration: ${duration.toFixed(2)} seconds`);
    log(`Completed at: ${endTime.toISOString()}`);
    log("========================================");
    log("");
    log("Next steps:");
    log("1. Locate your deployment bundle (ZIP file)");
    log("2. Transfer the bundle to your production server");
    log("3. Extract and run: .\\deployment\\2-deploy-offline.ps1");
    log("4. The production data will be automatically loaded during deployment");

  } catch (error) {
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;

    log("");
    log("========================================");
    logError("Export and Bundle Workflow FAILED!");
    logError(`Error: ${error.message}`);
    log(`Duration: ${duration.toFixed(2)} seconds`);
    log(`Failed at: ${endTime.toISOString()}`);
    log("========================================");
    
    process.exit(1);
  }
}

// Check command line arguments for help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Export and Bundle Workflow Script

This script automates the process of exporting production data and creating
a deployment bundle for offline deployment.

Prerequisites:
1. You must have already run 'node scripts/production-data-import.js' successfully
2. Your local database should contain the production data to export

Usage:
  node scripts/export-and-bundle.js

What this script does:
1. Exports production data from local database to data/production-data-latest.sql
2. Creates a deployment bundle that includes the production data
3. Provides instructions for deploying to production server

The resulting deployment bundle will automatically load production data
when deployed using the offline deployment scripts.
`);
  process.exit(0);
}

// Run the workflow
if (require.main === module) {
  exportAndBundle();
}

module.exports = {
  exportAndBundle
}; 