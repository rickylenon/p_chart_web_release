const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const prismaClient = new PrismaClient();

// Standard password for all users
const STANDARD_PASSWORD = "P@ssw0rd!123";

// Production safety check - don't seed if real production data exists
async function checkProductionDataExists() {
  try {
    // Check for signs of real production data
    const productionOrderCount = await prismaClient.productionOrder.count();
    const operationCount = await prismaClient.operation.count();
    const realUserCount = await prismaClient.user.count({
      where: {
        AND: [{ username: { not: "admin" } }, { username: { not: "encoder" } }],
      },
    });

    const hasProductionData =
      productionOrderCount > 0 || operationCount > 0 || realUserCount > 0;

    if (hasProductionData) {
      console.log(`⚠️  PRODUCTION DATA DETECTED:`);
      console.log(`   - ${productionOrderCount} production orders`);
      console.log(`   - ${operationCount} operations`);
      console.log(`   - ${realUserCount} real users (non-default)`);
      console.log(`⚠️  SEEDING CANCELLED TO PREVENT DATA LOSS`);
      return true;
    }

    console.log(`✅ No production data found - safe to seed`);
    console.log(`   - ${productionOrderCount} production orders`);
    console.log(`   - ${operationCount} operations`);
    console.log(`   - ${realUserCount} real users`);
    return false;
  } catch (error) {
    console.error("Error checking for production data:", error);
    console.log("⚠️  Safety check failed - proceeding with caution");
    return false; // Continue with seeding if check fails
  }
}

// Function to find a file in multiple possible locations
function findFile(filename: string) {
  // Possible locations to check in priority order
  const possibleLocations = [
    path.join(__dirname, "../data", filename), // ./data/
    path.join(__dirname, "../docs", filename), // ./docs/
    path.join(process.cwd(), "data", filename), // current working dir/data/
    path.join(process.cwd(), "docs", filename), // current working dir/docs/
  ];

  for (const location of possibleLocations) {
    console.log(`Checking for ${filename} at: ${location}`);
    if (fs.existsSync(location)) {
      console.log(`Found ${filename} at: ${location}`);
      return location;
    }
  }

  console.log(`Could not find ${filename} in any of the checked locations`);
  return null;
}

// Create data directory if it doesn't exist
try {
  const dataDir = path.join(__dirname, "../data");
  if (!fs.existsSync(dataDir)) {
    console.log(`Creating data directory at: ${dataDir}`);
    fs.mkdirSync(dataDir, { recursive: true });
  }
} catch (error) {
  console.error("Error creating data directory:", error);
}

// Function to seed operation lines
async function seedOperationLines() {
  console.log("Seeding operation lines data...");

  // Define operation lines from the Excel data
  const operationLines = [
    // OP10 - Cable Cutting
    { operationNumber: "OP10", lineNumber: "Machine #1" },
    { operationNumber: "OP10", lineNumber: "Machine #2" },
    { operationNumber: "OP10", lineNumber: "Machine #3" },
    { operationNumber: "OP10", lineNumber: "Machine #4" },
    { operationNumber: "OP10", lineNumber: "Machine #5" },
    { operationNumber: "OP10", lineNumber: "Machine #6" },
    { operationNumber: "OP10", lineNumber: "Machine #7" },
    { operationNumber: "OP10", lineNumber: "Machine #8" },
    { operationNumber: "OP10", lineNumber: "Machine #9" },
    { operationNumber: "OP10", lineNumber: "Machine #10" },
    { operationNumber: "OP10", lineNumber: "Machine #11" },
    { operationNumber: "OP10", lineNumber: "Machine #12" },
    { operationNumber: "OP10", lineNumber: "Machine #13" },
    { operationNumber: "OP10", lineNumber: "Machine #14" },
    { operationNumber: "OP10", lineNumber: "Machine #15" },
    { operationNumber: "OP10", lineNumber: "Machine #16" },
    { operationNumber: "OP10", lineNumber: "Machine #17" },
    { operationNumber: "OP10", lineNumber: "Machine #18" },
    { operationNumber: "OP10", lineNumber: "Machine #19" },
    { operationNumber: "OP10", lineNumber: "Machine #20" },
    { operationNumber: "OP10", lineNumber: "Machine #21" },
    { operationNumber: "OP10", lineNumber: "Machine #22" },
    { operationNumber: "OP10", lineNumber: "Machine #23" },
    { operationNumber: "OP10", lineNumber: "Machine #24" },
    { operationNumber: "OP10", lineNumber: "Machine #25" },
    { operationNumber: "OP10", lineNumber: "Machine #26" },
    { operationNumber: "OP10", lineNumber: "MY79 Cable Pre-Process" },

    // OP15 - 1st Side Process
    { operationNumber: "OP15", lineNumber: "MX34 Harness" },
    { operationNumber: "OP15", lineNumber: "MX39 Harness" },
    { operationNumber: "OP15", lineNumber: "MX39B45 Harness" },
    { operationNumber: "OP15", lineNumber: "MX39D Harness" },
    { operationNumber: "OP15", lineNumber: "MX39F Harness" },
    { operationNumber: "OP15", lineNumber: "MX40 Harness" },
    { operationNumber: "OP15", lineNumber: "MX40AB Harness" },
    { operationNumber: "OP15", lineNumber: "MX40D Harness" },
    { operationNumber: "OP15", lineNumber: "MX48 Harness" },
    { operationNumber: "OP15", lineNumber: "MX48 Harness L1" },
    { operationNumber: "OP15", lineNumber: "MX49A Harness L12" },
    { operationNumber: "OP15", lineNumber: "MX49A Harness MPL" },
    { operationNumber: "OP15", lineNumber: "MX49A Harness Offline Process" },
    { operationNumber: "OP15", lineNumber: "MX49AC Harness L1" },
    { operationNumber: "OP15", lineNumber: "MX49AC Harness L2" },
    { operationNumber: "OP15", lineNumber: "MX49AC Harness L3" },
    { operationNumber: "OP15", lineNumber: "MX49AC Harness L4" },
    { operationNumber: "OP15", lineNumber: "MX49AC Harness L5" },
    { operationNumber: "OP15", lineNumber: "MX49AC Harness L6" },
    { operationNumber: "OP15", lineNumber: "MX49AC Harness L7" },
    { operationNumber: "OP15", lineNumber: "MX49E45 Harness" },
    { operationNumber: "OP15", lineNumber: "MX50C Harness" },
    { operationNumber: "OP15", lineNumber: "MX50G1 Harness" },
    { operationNumber: "OP15", lineNumber: "MX50J Harness" },
    { operationNumber: "OP15", lineNumber: "MX50J1 Harness Combi" },
    { operationNumber: "OP15", lineNumber: "MX50C3C Harness" },
    { operationNumber: "OP15", lineNumber: "MX50C3K Harness" },
    { operationNumber: "OP15", lineNumber: "MX54ABD Harness" },
    { operationNumber: "OP15", lineNumber: "MX59BYD Harness" },
    { operationNumber: "OP15", lineNumber: "MX59T Harness" },
    { operationNumber: "OP15", lineNumber: "MX55J Cable Pre-Process FG L1" },
    { operationNumber: "OP15", lineNumber: "MX55J Cable Pre-Process FG L2" },

    // OP20 - 2nd Side Process (not in screenshot but added for completeness)

    // OP30 - Taping Process
    { operationNumber: "OP30", lineNumber: "BURKLE LINE 1A" },
    { operationNumber: "OP30", lineNumber: "BURKLE LINE 2A" },
    { operationNumber: "OP30", lineNumber: "BURKLE LINE 3A" },
    { operationNumber: "OP30", lineNumber: "BURKLE LINE 4A" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 01" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 02" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 03" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 04" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 05" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 06" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 07" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 08" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 09" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 14" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 15" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 16" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 17" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 18" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 19" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 20" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 21" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 22" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 23" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 24" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 25" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 26" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 27" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 28" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 29" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 30" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 31" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 32" },
    { operationNumber: "OP30", lineNumber: "Hilon Yatai Line 33" },

    // OP40 - QC
    { operationNumber: "OP40", lineNumber: "Terminal 1" },
    { operationNumber: "OP40", lineNumber: "Terminal 2" },
    { operationNumber: "OP40", lineNumber: "Terminal 3" },
  ];

  let inserted = 0;
  let errors = 0;

  try {
    for (const line of operationLines) {
      try {
        await prismaClient.operationLine.upsert({
          where: {
            operationNumber_lineNumber: {
              operationNumber: line.operationNumber,
              lineNumber: line.lineNumber,
            },
          },
          update: {}, // No updates needed if it exists
          create: line,
        });
        inserted++;

        if (inserted % 30 === 0) {
          console.log(`Processed ${inserted} operation lines`);
        }
      } catch (error) {
        console.error(
          `Error inserting operation line ${line.operationNumber} - ${line.lineNumber}:`,
          error
        );
        errors++;
      }
    }

    console.log(
      `Operation lines seeded: ${inserted} records inserted, ${errors} errors`
    );
  } catch (error) {
    console.error("Error seeding operation lines:", error);
  }
}

async function main() {
  console.log("Starting seed process...");
  console.log("Database URL type:", typeof process.env.DATABASE_URL);
  console.log("Database URL exists:", !!process.env.DATABASE_URL);
  console.log("Environment:", process.env.NODE_ENV);
  console.log("Current directory:", process.cwd());
  console.log("Script directory:", __dirname);

  // PRODUCTION SAFETY CHECK - Exit if real data exists
  const hasProductionData = await checkProductionDataExists();
  if (hasProductionData) {
    console.log("");
    console.log("🛑 SEEDING STOPPED FOR SAFETY");
    console.log("   To seed anyway, manually clear production data first");
    console.log(
      "   Or run: npx prisma db push --force-reset && npx prisma db seed"
    );
    await prismaClient.$disconnect();
    process.exit(0);
  }

  console.log("");
  console.log("🌱 Proceeding with database seeding...");

  // Create or update admin user
  try {
    const hashedPassword = await bcrypt.hash(STANDARD_PASSWORD, 10);
    const adminExists = await prismaClient.user.findUnique({
      where: { username: "admin" },
    });

    if (!adminExists) {
      await prismaClient.user.create({
        data: {
          username: "admin",
          password: hashedPassword,
          name: "Admin User",
          email: "admin@example.com",
          role: "Admin",
          department: "IT",
        },
      });
      console.log("Admin user created");
    } else {
      // Update existing admin user with new password
      await prismaClient.user.update({
        where: { username: "admin" },
        data: {
          password: hashedPassword,
          name: "Admin User",
          email: "admin@example.com",
          role: "Admin",
          department: "IT",
        },
      });
      console.log("Admin user updated with standard password");
    }
  } catch (error) {
    console.error("Error creating/updating admin user:", error);
  }

  // Create or update encoder user
  try {
    const hashedPassword = await bcrypt.hash(STANDARD_PASSWORD, 10);
    const encoderExists = await prismaClient.user.findUnique({
      where: { username: "encoder" },
    });

    if (!encoderExists) {
      await prismaClient.user.create({
        data: {
          username: "encoder",
          password: hashedPassword,
          name: "Encoder User",
          email: "encoder@example.com",
          role: "Encoder",
          department: "Production",
        },
      });
      console.log("Encoder user created");
    } else {
      // Update existing encoder user with new password
      await prismaClient.user.update({
        where: { username: "encoder" },
        data: {
          password: hashedPassword,
          name: "Encoder User",
          email: "encoder@example.com",
          role: "Encoder",
          department: "Production",
        },
      });
      console.log("Encoder user updated with standard password");
    }
  } catch (error) {
    console.error("Error creating/updating encoder user:", error);
  }

  // Seed operation steps
  try {
    // Use findFile instead of hardcoded path
    const operationStepsPath = findFile("operation_steps.csv");

    if (operationStepsPath && fs.existsSync(operationStepsPath)) {
      const operationStepsFile = fs.readFileSync(operationStepsPath, "utf8");

      const operationSteps = parse(operationStepsFile, {
        columns: true,
        skip_empty_lines: true,
      });

      console.log(`Found ${operationSteps.length} operation steps in CSV`);

      for (const step of operationSteps) {
        await prismaClient.operationStep.upsert({
          where: { operationNumber: step.operation_number },
          update: {
            label: step.label,
            stepOrder: parseInt(step.step_order),
          },
          create: {
            label: step.label,
            operationNumber: step.operation_number,
            stepOrder: parseInt(step.step_order),
          },
        });
      }
      console.log("Operation steps created from CSV");
    } else {
      console.log("Operation steps CSV not found, creating default steps");

      // Default operation steps if CSV is not available
      const defaultSteps = [
        { label: "Print/Punch", operationNumber: "10", stepOrder: 1 },
        { label: "SMT Process", operationNumber: "20", stepOrder: 2 },
        { label: "Manual Insertion", operationNumber: "30", stepOrder: 3 },
        { label: "Wave Soldering", operationNumber: "40", stepOrder: 4 },
        { label: "Final Assembly", operationNumber: "50", stepOrder: 5 },
        { label: "Testing", operationNumber: "60", stepOrder: 6 },
        { label: "Final QC", operationNumber: "70", stepOrder: 7 },
        { label: "Packing", operationNumber: "80", stepOrder: 8 },
      ];

      for (const step of defaultSteps) {
        await prismaClient.operationStep.upsert({
          where: { operationNumber: step.operationNumber },
          update: {
            label: step.label,
            stepOrder: step.stepOrder,
          },
          create: {
            label: step.label,
            operationNumber: step.operationNumber,
            stepOrder: step.stepOrder,
          },
        });
      }
      console.log("Default operation steps created");
    }
  } catch (error) {
    console.error("Error seeding operation steps:", error);
  }

  // Seed defects
  try {
    // Use findFile instead of hardcoded path
    const defectsPath = findFile("defects_masterlist.csv");

    if (defectsPath && fs.existsSync(defectsPath)) {
      const defectsFile = fs.readFileSync(defectsPath, "utf8");

      const defects = parse(defectsFile, {
        columns: true,
        skip_empty_lines: true,
      });

      // Process defects with unique names
      const uniqueDefects = new Map();
      let count = 0;

      console.log(`Found ${defects.length} defects in CSV`);

      for (const defect of defects) {
        // If we've already seen this defect name, skip it
        if (uniqueDefects.has(defect.name)) continue;

        // Add to our map of processed defects
        uniqueDefects.set(defect.name, defect);

        // Create the defect in the database
        await prismaClient.masterDefect.upsert({
          where: { name: defect.name },
          update: {
            category: defect.category,
            applicableOperation: defect.applicable_operation,
            reworkable: defect.reworkable === "1", // Convert "1" to true
            machine: defect.machine,
            isActive: true,
          },
          create: {
            name: defect.name,
            category: defect.category,
            applicableOperation: defect.applicable_operation,
            reworkable: defect.reworkable === "1", // Convert "1" to true
            machine: defect.machine,
            isActive: true,
          },
        });
        count++;
        if (count % 50 === 0) {
          console.log(`Processed ${count} defects`);
        }
      }
      console.log(`Defects created from CSV: ${count}`);
    } else {
      console.log("Defects CSV not found, creating default defects");

      // Default defects if CSV is not available
      const defaultDefects = [
        {
          name: "Missing Component",
          category: "SMT",
          reworkable: true,
          applicableOperation: "20",
        },
        {
          name: "Solder Bridge",
          category: "Soldering",
          reworkable: true,
          applicableOperation: "40",
        },
        {
          name: "Cold Solder",
          category: "Soldering",
          reworkable: true,
          applicableOperation: "40",
        },
        {
          name: "PCB Damage",
          category: "Material",
          reworkable: false,
          applicableOperation: "10",
        },
        {
          name: "Wrong Component",
          category: "SMT",
          reworkable: true,
          applicableOperation: "20",
        },
        {
          name: "Lifted Lead",
          category: "Assembly",
          reworkable: true,
          applicableOperation: "30",
        },
        {
          name: "Functional Failure",
          category: "Testing",
          reworkable: false,
          applicableOperation: "60",
        },
      ];

      for (const defect of defaultDefects) {
        await prismaClient.masterDefect.upsert({
          where: { name: defect.name },
          update: {
            category: defect.category,
            applicableOperation: defect.applicableOperation,
            reworkable: defect.reworkable,
            isActive: true,
          },
          create: {
            name: defect.name,
            category: defect.category,
            applicableOperation: defect.applicableOperation,
            reworkable: defect.reworkable,
            isActive: true,
          },
        });
      }
      console.log("Default defects created");
    }
  } catch (error) {
    console.error("Error seeding defects:", error);
  }

  // Add operation lines data
  try {
    await seedOperationLines();
  } catch (error) {
    console.error("Error seeding operation lines:", error);
  }

  console.log("Seed data created successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
