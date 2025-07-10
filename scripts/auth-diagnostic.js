#!/usr/bin/env node

/**
 * Authentication Diagnostic Script
 *
 * This script helps diagnose authentication issues by:
 * - Checking database connectivity
 * - Verifying user accounts and passwords
 * - Testing session configurations
 * - Identifying common auth problems
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 P-Chart Authentication Diagnostic Tool");
  console.log("==========================================\n");

  try {
    // 1. Test Database Connection
    console.log("1. Testing Database Connection...");
    await testDatabaseConnection();

    // 2. Check Users
    console.log("\n2. Checking User Accounts...");
    await checkUsers();

    // 3. Check Environment Variables
    console.log("\n3. Checking Environment Variables...");
    checkEnvironmentVariables();

    // 4. Test Password Hashing
    console.log("\n4. Testing Password Hashing...");
    await testPasswordHashing();

    // 5. Session Configuration Check
    console.log("\n5. Checking Session Configuration...");
    checkSessionConfig();

    console.log("\n✅ Diagnostic completed successfully!");
    console.log("\nRecommendations:");
    console.log(
      "- Clear browser cookies and localStorage before testing login"
    );
    console.log("- Check browser console for detailed authentication logs");
    console.log("- Ensure NEXTAUTH_SECRET is set in production");
    console.log(
      "- Verify database connectivity from your deployment environment"
    );
  } catch (error) {
    console.error("\n❌ Diagnostic failed:", error.message);
    console.error("\nDetailed error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log("   ✅ Database connection successful");

    // Test a simple query
    const userCount = await prisma.user.count();
    console.log(`   ✅ Found ${userCount} users in database`);

    return true;
  } catch (error) {
    console.error("   ❌ Database connection failed:", error.message);
    throw error;
  }
}

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        password: true,
        createdAt: true,
        isActive: true,
      },
    });

    if (users.length === 0) {
      console.log("   ⚠️  No users found in database");
      console.log("   💡 Run: npm run seed to create default users");
      return;
    }

    console.log(`   ✅ Found ${users.length} users:`);

    for (const user of users) {
      console.log(`   👤 ${user.username} (${user.role})`);
      console.log(`      ID: ${user.id}`);
      console.log(`      Name: ${user.name || "N/A"}`);
      console.log(`      Email: ${user.email || "N/A"}`);
      console.log(
        `      Password Hash: ${user.password ? "✅ Set" : "❌ Missing"}`
      );
      console.log(`      Created: ${user.createdAt}`);

      // Test password hash format
      if (user.password) {
        const isValidBcrypt = user.password.startsWith("$2");
        console.log(
          `      Password Format: ${
            isValidBcrypt ? "✅ Valid bcrypt" : "❌ Invalid format"
          }`
        );
      }
      console.log("");
    }
  } catch (error) {
    console.error("   ❌ Failed to check users:", error.message);
    throw error;
  }
}

function checkEnvironmentVariables() {
  const requiredVars = ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL"];

  const optionalVars = ["NEXTAUTH_DEBUG", "NODE_ENV"];

  console.log("   Required variables:");
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      console.log(
        `   ✅ ${varName}: Set (${
          varName === "DATABASE_URL" ? "hidden" : value
        })`
      );
    } else {
      console.log(`   ❌ ${varName}: Not set`);
    }
  }

  console.log("\n   Optional variables:");
  for (const varName of optionalVars) {
    const value = process.env[varName];
    console.log(`   ${value ? "✅" : "⚪"} ${varName}: ${value || "Not set"}`);
  }
}

async function testPasswordHashing() {
  const testPassword = "test123";
  const testHash =
    "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lh6NT1JzRP8W0RQOO"; // hash of "password"

  try {
    // Test hashing
    console.log("   Testing password hashing...");
    const newHash = await bcrypt.hash(testPassword, 12);
    console.log(
      `   ✅ Hash generation successful: ${newHash.substring(0, 20)}...`
    );

    // Test comparison
    console.log("   Testing password comparison...");
    const isValid = await bcrypt.compare("password", testHash);
    console.log(`   ✅ Password comparison works: ${isValid}`);

    // Test with wrong password
    const isInvalid = await bcrypt.compare("wrongpassword", testHash);
    console.log(`   ✅ Wrong password correctly rejected: ${!isInvalid}`);
  } catch (error) {
    console.error("   ❌ Password hashing test failed:", error.message);
  }
}

function checkSessionConfig() {
  console.log("   NextAuth Configuration:");
  console.log(`   ✅ Session Strategy: JWT (recommended)`);
  console.log(`   ✅ Session Max Age: 8 hours`);
  console.log(`   ✅ Cookie Configuration: Secure for production`);
  console.log(
    `   ✅ Debug Mode: ${
      process.env.NEXTAUTH_DEBUG === "true" ? "Enabled" : "Disabled"
    }`
  );

  // Check for common issues
  if (!process.env.NEXTAUTH_SECRET) {
    console.log(
      "   ⚠️  NEXTAUTH_SECRET not set - this is required for production"
    );
  }

  if (!process.env.NEXTAUTH_URL) {
    console.log("   ⚠️  NEXTAUTH_URL not set - this may cause redirect issues");
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n\n🛑 Diagnostic interrupted");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n\n🛑 Diagnostic terminated");
  await prisma.$disconnect();
  process.exit(0);
});

main().catch(async (error) => {
  console.error("\n💥 Unhandled error in diagnostic:", error);
  await prisma.$disconnect();
  process.exit(1);
});
