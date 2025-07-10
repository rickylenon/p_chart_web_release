async function insertOperationLines() {
  console.log("Inserting operation lines data...");

  // Define operation lines from the screenshot
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

  // Insert operation lines
  for (const line of operationLines) {
    try {
      await prisma.operationLine.upsert({
        where: {
          operationNumber_lineNumber: {
            operationNumber: line.operationNumber,
            lineNumber: line.lineNumber,
          },
        },
        update: {},
        create: line,
      });
    } catch (error) {
      console.error(
        `Error inserting operation line ${line.operationNumber} - ${line.lineNumber}:`,
        error
      );
    }
  }

  console.log("Operation lines data inserted successfully.");
}

// Preserve the original module.exports function and add our new function call
const originalExport = module.exports;

module.exports = async function () {
  // First call the original export function if it exists
  if (typeof originalExport === "function") {
    await originalExport();
  }

  // Then add operation lines
  await insertOperationLines();

  console.log("Data loading completed successfully!");
};
