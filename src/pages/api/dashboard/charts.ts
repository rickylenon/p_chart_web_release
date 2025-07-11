import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth";

export default withAuth(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Authentication is already handled by withAuth middleware
    console.log(
      "API: Dashboard charts auth session validated, user:",
      session?.user?.name
    );

    // For development, we'll log additional info
    if (process.env.NODE_ENV !== "production") {
      console.log("API: Development mode - additional auth info:", session);
    }

    console.log("Fetching dashboard chart data with query params:", req.query);

    // Parse filter parameters
    const { year, month, line, series, status, poNumber } = req.query;

    // Validate year parameter
    const yearValue = year as string;
    if (yearValue && !/^\d{4}$/.test(yearValue)) {
      console.warn("Invalid year format:", yearValue);
      return res
        .status(400)
        .json({ error: "Invalid year format. Expected YYYY." });
    }

    // Build filter conditions based on parameters
    const filterConditions: any = {};
    const productionOrderFilter: any = {};

    // Apply year filter
    if (year) {
      const yearStr = Array.isArray(year) ? year[0] : (year as string);
      const yearStart = new Date(`${yearStr}-01-01`);
      const yearEnd = new Date(`${Number(yearStr) + 1}-01-01`);
      yearEnd.setMilliseconds(yearEnd.getMilliseconds() - 1);

      filterConditions.startTime = {
        gte: yearStart,
        lte: yearEnd,
      };

      console.log(`Applied year filter for ${yearStr}:`, {
        yearStart,
        yearEnd,
      });
    }

    // Apply month filter
    if (month && month !== "All") {
      const monthStr = Array.isArray(month) ? month[0] : (month as string);
      const monthNum = parseInt(monthStr);
      if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12 && year) {
        const yearStr = Array.isArray(year) ? year[0] : (year as string);
        const monthStart = new Date(
          `${yearStr}-${monthNum.toString().padStart(2, "0")}-01`
        );

        // Calculate the last day of the month
        const monthEnd = new Date(Number(yearStr), monthNum, 0); // Last day of month
        monthEnd.setHours(23, 59, 59, 999);

        filterConditions.startTime = {
          gte: monthStart,
          lte: monthEnd,
        };

        console.log(`Applied month filter for ${monthStr}:`, {
          monthStart,
          monthEnd,
        });
      } else {
        console.warn("Invalid month value:", monthStr);
      }
    }

    // Apply line filter (using lineNo field)
    if (line && line !== "All") {
      const lineStr = Array.isArray(line) ? line[0] : (line as string);
      filterConditions.lineNo = lineStr;
      console.log(`Applied line filter (using lineNo):`, lineStr);
    }

    // Apply item series filter (using itemName)
    if (series && series !== "All") {
      const seriesStr = Array.isArray(series) ? series[0] : (series as string);
      productionOrderFilter.itemName = seriesStr;
      console.log(`Applied series filter (using itemName):`, seriesStr);
    }

    // Apply status filter - needs to be on productionOrder
    if (status && status !== "All") {
      const statusStr = Array.isArray(status) ? status[0] : (status as string);
      productionOrderFilter.status = statusStr;
      console.log(`Applied status filter to productionOrder:`, statusStr);
    }

    // Apply PO number filter
    if (poNumber) {
      const poNumberStr = Array.isArray(poNumber)
        ? poNumber[0]
        : (poNumber as string);
      console.log(`Filtering by PO number: ${poNumberStr}`);

      // Check if PO exists first
      try {
        const poExists = await prisma.productionOrder.findFirst({
          where: {
            poNumber: {
              contains: poNumberStr,
            },
          },
          select: { id: true },
        });

        if (!poExists) {
          console.log(
            `No production order found with PO number containing: ${poNumberStr}`
          );
          // Return empty datasets instead of error
          return res.status(200).json({
            defectRatioData: [],
            machineDefectsData: [],
            defectTypesData: [],
            appliedFilters: {
              year: year || null,
              month: month !== "All" ? month : null,
              line: line !== "All" ? line : null,
              series: series !== "All" ? series : null,
              status: status !== "All" ? status : null,
              poNumber: poNumberStr,
            },
            noData: true,
          });
        }

        productionOrderFilter.poNumber = {
          contains: poNumberStr,
        };
      } catch (error) {
        console.error("Error checking PO existence:", error);
        // Continue execution with the filter - might still find something
        productionOrderFilter.poNumber = {
          contains: poNumberStr,
        };
      }
    }

    // Apply productionOrder filters if any exist
    if (Object.keys(productionOrderFilter).length > 0) {
      filterConditions.productionOrder = {
        is: productionOrderFilter,
      };
    }

    console.log(
      "Using filter conditions:",
      JSON.stringify(filterConditions, null, 2)
    );

    // For defect ratio chart - get daily ratios for the last 14 days
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    twoWeeksAgo.setHours(0, 0, 0, 0);

    // Combine the date range with other filters
    const operationFilters = {
      startTime: {
        gte: twoWeeksAgo,
        ...(filterConditions.startTime
          ? {
              lte: filterConditions.startTime.lte,
              gte:
                filterConditions.startTime.gte > twoWeeksAgo
                  ? filterConditions.startTime.gte
                  : twoWeeksAgo,
            }
          : {}),
      },
      endTime: { not: null },
      ...(filterConditions.lineNo ? { lineNo: filterConditions.lineNo } : {}),
      ...(filterConditions.productionOrder
        ? { productionOrder: filterConditions.productionOrder }
        : {}),
    };

    try {
      // Get operations grouped by day
      console.time("operations-query");
      const operations = await prisma.operation.findMany({
        where: operationFilters,
        include: {
          operationDefects: true,
        },
        orderBy: {
          startTime: "asc",
        },
      });
      console.timeEnd("operations-query");

      console.log(
        `Found ${operations.length} operations for date range with filters:`,
        operationFilters
      );

      // If no operations found, return empty datasets
      if (operations.length === 0) {
        console.log("No operations found for the applied filters");
        return res.status(200).json({
          defectRatioData: [],
          machineDefectsData: [],
          defectTypesData: [],
          appliedFilters: {
            year: year || null,
            month: month !== "All" ? month : null,
            line: line !== "All" ? line : null,
            series: series !== "All" ? series : null,
            status: status !== "All" ? status : null,
            poNumber: poNumber
              ? Array.isArray(poNumber)
                ? poNumber[0]
                : poNumber
              : null,
          },
          noData: true,
        });
      }

      // Group by operation code
      const operationData: Record<
        string,
        { totalInput: number; totalDefects: number }
      > = {};

      operations.forEach((operation) => {
        const operationCode = operation.operation || "Unknown";

        if (!operationData[operationCode]) {
          operationData[operationCode] = { totalInput: 0, totalDefects: 0 };
        }

        operationData[operationCode].totalInput += operation.inputQuantity || 0;

        operation.operationDefects.forEach((defect) => {
          operationData[operationCode].totalDefects += defect.quantity || 0;
        });
      });

      const defectRatioData = Object.entries(operationData)
        .map(([operationCode, data]) => {
          const ratio =
            data.totalInput > 0 ? data.totalDefects / data.totalInput : 0;
          return {
            date: operationCode, // Keep the field name as 'date' for compatibility with existing frontend
            ratio,
            // Include raw values for tooltip display
            input: data.totalInput,
            defects: data.totalDefects,
          };
        })
        .sort((a, b) => {
          // Sort operation codes numerically (OP10, OP15, OP20, etc.)
          const aNum = parseInt(a.date.replace(/\D/g, "")) || 0;
          const bNum = parseInt(b.date.replace(/\D/g, "")) || 0;
          return aNum - bNum;
        });

      console.log("Defect ratio data:", defectRatioData);

      // Get machine defect data
      const defectFilters = {
        operation: operationFilters,
      };

      console.time("machineDefects-query");
      console.log(
        "Fetching machine defects with filters:",
        JSON.stringify(defectFilters, null, 2)
      );
      const machineDefects = await prisma.operationDefect.findMany({
        where: defectFilters,
        include: {
          operation: true,
          defect: true,
        },
      });
      console.timeEnd("machineDefects-query");

      console.log(
        `Found ${machineDefects.length} defects for machine chart with filters:`,
        defectFilters
      );

      // Group by machine
      const machineData: Record<string, { fullName: string; defects: number }> =
        {};

      // This would need to come from your actual machine data
      const machineNames: Record<string, string> = {
        M1: "Cable Cutting machine",
        M2: "Sleeve Crimping machine",
        M3: "Assembly machine",
      };

      machineDefects.forEach((defect) => {
        // Access machine from defectMachine or from operation
        const machineId = defect.defectMachine || "unknown";

        if (!machineData[machineId]) {
          const fullName = machineNames[machineId] || machineId;
          machineData[machineId] = { fullName, defects: 0 };
        }

        machineData[machineId].defects += defect.quantity || 0;
      });

      const machineDefectsData = Object.entries(machineData)
        .map(([id, data]) => ({
          name: id,
          fullName: data.fullName,
          defects: data.defects,
        }))
        .sort((a, b) => b.defects - a.defects)
        .slice(0, 5); // Top 5 machines

      console.log("Machine defects data:", machineDefectsData);

      // For defect types chart - get most frequent defect types
      const defectTypesMap: Record<
        string,
        { category: string; value: number }
      > = {};

      machineDefects.forEach((defect) => {
        // Add null check before accessing defect.defect.name
        if (!defect.defect) {
          console.log("Skipping defect with null defect reference:", defect.id);
          return;
        }

        const defectName = defect.defect.name;
        const category = defect.defectCategory;

        if (!defectTypesMap[defectName]) {
          defectTypesMap[defectName] = { category, value: 0 };
        }

        defectTypesMap[defectName].value += defect.quantity || 0;
      });

      const defectTypesData = Object.entries(defectTypesMap)
        .map(([name, data]) => ({
          name: name.replace(" ", "\n"),
          category: data.category,
          value: data.value,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // Top 5 defect types

      console.log("Defect types data:", defectTypesData);

      // Set Cache-Control header for 5 minutes (300 seconds)
      res.setHeader("Cache-Control", "public, max-age=300");

      return res.status(200).json({
        defectRatioData,
        machineDefectsData,
        defectTypesData,
        appliedFilters: {
          year: year || null,
          month: month !== "All" ? month : null,
          line: line !== "All" ? line : null,
          series: series !== "All" ? series : null,
          status: status !== "All" ? status : null,
          poNumber: poNumber
            ? Array.isArray(poNumber)
              ? poNumber[0]
              : poNumber
            : null,
        },
      });
    } catch (error) {
      console.error("Error processing chart data:", error);
      // Return empty datasets on error
      return res.status(200).json({
        defectRatioData: [],
        machineDefectsData: [],
        defectTypesData: [],
        appliedFilters: {
          year: year || null,
          month: month !== "All" ? month : null,
          line: line !== "All" ? line : null,
          series: series !== "All" ? series : null,
          status: status !== "All" ? status : null,
          poNumber: poNumber
            ? Array.isArray(poNumber)
              ? poNumber[0]
              : poNumber
            : null,
        },
        error: "Failed to process chart data",
      });
    }
  } catch (error) {
    console.error("Error fetching dashboard chart data:", error);
    // Return empty datasets on general error
    return res.status(200).json({
      defectRatioData: [],
      machineDefectsData: [],
      defectTypesData: [],
      error: "Failed to fetch dashboard chart data",
    });
  }
});
