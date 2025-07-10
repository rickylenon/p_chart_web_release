const path = require("path");
const fs = require("fs");

// Setup logging
const logFile = path.join(__dirname, "logs", "service.log");
const logDir = path.dirname(logFile);

// Ensure logs directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;

  // Write to log file
  fs.appendFileSync(logFile, logMessage);

  // Also write to console
  console.log(logMessage.trim());
}

function loadEnvironmentVariables() {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    log("Loading environment variables from .env...");
    const envContent = fs.readFileSync(envPath, "utf8");

    envContent.split("\n").forEach((line) => {
      const match = line.match(/^([^#].*?)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        process.env[key.trim()] = value.trim();
      }
    });
    log("Environment variables loaded");
  } else {
    log("No .env file found, using defaults");
    process.env.DATABASE_URL =
      "postgresql://pchart_user:pchart_password@localhost:5432/pchart_web";
    // NEXTAUTH_URL intentionally not set to allow auto-detection from request headers
    // This enables the app to work from any IP address (localhost, network IP, etc.)
  }
}

async function regeneratePrismaClient() {
  try {
    log("Regenerating Prisma client...");
    const { spawn } = require("child_process");

    // For production, check if Prisma client is already generated
    const prismaClientPath = path.join(
      __dirname,
      "node_modules",
      ".prisma",
      "client"
    );
    if (fs.existsSync(prismaClientPath)) {
      log("Prisma client already exists, skipping regeneration in production");
      return;
    }

    // Try different ways to find npx/prisma for Windows service
    const possibleCommands = [
      // Try local node_modules first
      path.join(__dirname, "node_modules", ".bin", "prisma.cmd"),
      path.join(__dirname, "node_modules", ".bin", "prisma"),
      // Try global npm paths
      "npx",
      // Try direct Node.js installation paths
      "C:\\Program Files\\nodejs\\npx.cmd",
      "C:\\Program Files\\nodejs\\npx",
    ];

    let success = false;

    for (const command of possibleCommands) {
      try {
        log(`Trying to regenerate Prisma client with: ${command}`);

        const args = command.includes("prisma")
          ? ["generate"]
          : ["prisma", "generate"];

        await new Promise((resolve, reject) => {
          const prismaProcess = spawn(command, args, {
            cwd: __dirname,
            stdio: "pipe",
            shell: true,
          });

          let output = "";
          let errorOutput = "";

          prismaProcess.stdout.on("data", (data) => {
            output += data.toString();
          });

          prismaProcess.stderr.on("data", (data) => {
            errorOutput += data.toString();
          });

          prismaProcess.on("close", (code) => {
            if (code === 0) {
              log(`Success with: ${command}`);
              success = true;
              resolve();
            } else {
              log(`Failed with: ${command} (code ${code}): ${errorOutput}`);
              reject(new Error(`Exit code ${code}`));
            }
          });

          prismaProcess.on("error", (error) => {
            log(`Error with: ${command} - ${error.message}`);
            reject(error);
          });

          // Timeout after 30 seconds
          setTimeout(() => {
            prismaProcess.kill();
            reject(new Error("Timeout"));
          }, 30000);
        });

        // If we get here, it was successful
        break;
      } catch (cmdError) {
        // Try next command
        continue;
      }
    }

    if (success) {
      log("Prisma client regenerated successfully");
    } else {
      log("All Prisma regeneration attempts failed, but continuing startup...");
      log("Note: Prisma client should already be generated during deployment");
    }
  } catch (error) {
    log(`Error during Prisma regeneration: ${error.message}`);
    log("Continuing without regeneration...");
  }
}

async function startServer() {
  try {
    log("Starting P-Chart Web server...");

    // Set production environment
    process.env.NODE_ENV = "production";
    process.env.PORT = process.env.PORT || "3000";
    process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";

    // Load environment variables
    loadEnvironmentVariables();

    // Regenerate Prisma client
    await regeneratePrismaClient();

    // Change working directory
    process.chdir(__dirname);

    log(`Starting server on port ${process.env.PORT}...`);

    // Load and start the Next.js server
    require("./server.js");

    log("Server started successfully");
  } catch (error) {
    log(`Fatal error starting server: ${error.message}`);
    log(`Stack trace: ${error.stack}`);

    // Log error and exit - Windows Service will restart it
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  log(`Uncaught Exception: ${error.message}`);
  log(`Stack trace: ${error.stack}`);

  // Give time to write log then exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  log(`Unhandled Rejection at: ${promise}`);
  log(`Reason: ${reason}`);

  // Don't exit on unhandled rejection, just log it
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  log("Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  log("Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

// Start the server
log("P-Chart Web Service Wrapper starting...");
startServer();
