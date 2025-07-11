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
      "API: Dashboard stats auth session validated, user:",
      session?.user?.name
    );

    console.log(
      "[PRISMA_DB] Fetching dashboard stats with query params:",
      req.query
    );

    // Parse filter parameters
    const { year, month, line, series, status, poNumber } = req.query;

    // Validate year parameter
    const yearValue = year as string;
    if (yearValue && !/^\d{4}$/.test(yearValue)) {
      console.warn("[PRISMA_DB] Invalid year format:", yearValue);
      return res
        .status(400)
        .json({ error: "Invalid year format. Expected YYYY." });
    }

    // Build filter conditions
    const filter: any = {};
    const productionOrderFilter: any = {};

    // Log all received parameters
    console.log("[PRISMA_DB] Stats API received filter params:", req.query);

    // Apply year and month filters to operation dates
    if (year) {
      console.log(`Filtering by year: ${year}`);
      const yearStr = Array.isArray(year) ? year[0] : (year as string);
      const yearNum = parseInt(yearStr);

      if (isNaN(yearNum)) {
        return res.status(400).json({ error: "Invalid year parameter" });
      }

      const startDate = new Date(Date.UTC(yearNum, 0, 1));
      const endDate = new Date(Date.UTC(yearNum, 11, 31, 23, 59, 59, 999));

      if (!filter.startTime) filter.startTime = {};
      filter.startTime.gte = startDate;
      filter.startTime.lte = endDate;

      if (month && month !== "All") {
        console.log(`Filtering by month: ${month}`);
        const monthStr = Array.isArray(month) ? month[0] : (month as string);
        const monthNum = parseInt(monthStr) - 1; // Convert to 0-based month index
        const monthStartDate = new Date(Date.UTC(yearNum, monthNum, 1));
        const monthEndDate = new Date(
          Date.UTC(yearNum, monthNum + 1, 0, 23, 59, 59, 999)
        );

        filter.startTime.gte = monthStartDate;
        filter.startTime.lte = monthEndDate;
      }
    }

    // Filter by production line (lineNo field in Operation)
    if (line && line !== "All") {
      console.log(`Filtering by line: ${line}`);
      filter.lineNo = Array.isArray(line) ? line[0] : line;
    }

    // Filter by item series (from productionOrder.itemName)
    if (series && series !== "All") {
      console.log(`Filtering by series: ${series}`);
      productionOrderFilter.itemName = Array.isArray(series)
        ? series[0]
        : series;
    }

    // Filter by productionOrder status
    if (status && status !== "All") {
      console.log(`Filtering by status: ${status}`);
      productionOrderFilter.status = Array.isArray(status) ? status[0] : status;
    }

    // Filter by PO number
    if (poNumber) {
      const poNumberStr = Array.isArray(poNumber)
        ? poNumber[0]
        : (poNumber as string);
      console.log(`[PRISMA_DB] Filtering by PO number: ${poNumberStr}`);

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
            `[PRISMA_DB] No production order found with PO number containing: ${poNumberStr}`
          );
          // Return empty data instead of error
          return res.status(200).json({
            totalProduction: 0,
            defectRate: 0,
            inProgressPOs: 0,
            machineUtilization: 0,
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
        console.error("[PRISMA_DB] Error checking PO existence:", error);
        // Continue execution with the filter - might still find something
        productionOrderFilter.poNumber = {
          contains: poNumberStr,
        };
      }
    }

    // Apply productionOrder filters if any exist
    if (Object.keys(productionOrderFilter).length > 0) {
      filter.productionOrder = {
        is: productionOrderFilter,
      };
    }

    console.log(
      "[PRISMA_DB] Final filter conditions:",
      JSON.stringify(filter, null, 2)
    );

    // For today's metrics - calculate the start of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get total production (sum of production order quantities - NOT operation outputs)
    console.time("[PRISMA_DB] totalProduction-query");

    // Build production order filter for total production calculation
    const poProductionFilter: any = {};

    // Apply year and month filters - we need to check if PO has any operations in the date range
    if (year || month) {
      const dateFilter: any = {};

      if (year) {
        const yearNum = parseInt(
          Array.isArray(year) ? year[0] : (year as string)
        );
        const startDate = new Date(Date.UTC(yearNum, 0, 1));
        const endDate = new Date(Date.UTC(yearNum, 11, 31, 23, 59, 59, 999));

        dateFilter.gte = startDate;
        dateFilter.lte = endDate;

        if (month && month !== "All") {
          const monthNum =
            parseInt(Array.isArray(month) ? month[0] : (month as string)) - 1;
          const monthStartDate = new Date(Date.UTC(yearNum, monthNum, 1));
          const monthEndDate = new Date(
            Date.UTC(yearNum, monthNum + 1, 0, 23, 59, 59, 999)
          );

          dateFilter.gte = monthStartDate;
          dateFilter.lte = monthEndDate;
        }
      }

      // Only include POs that have operations within the date range
      poProductionFilter.operations = {
        some: {
          startTime: dateFilter,
          ...(line && line !== "All" ? { lineNo: line } : {}),
        },
      };
    } else if (line && line !== "All") {
      // If only line filter is applied without date filter
      poProductionFilter.operations = {
        some: {
          lineNo: line,
        },
      };
    }

    // Apply other production order filters
    if (series && series !== "All") {
      poProductionFilter.itemName = series;
    }

    if (status && status !== "All") {
      poProductionFilter.status = status;
    }

    if (poNumber) {
      poProductionFilter.poNumber = {
        contains: poNumber,
      };
    }

    console.log(
      "[PRISMA_DB] Production Order filter for total production:",
      JSON.stringify(poProductionFilter, null, 2)
    );

    const totalProduction = await prisma.productionOrder.aggregate({
      _sum: {
        poQuantity: true,
      },
      where: poProductionFilter,
    });
    console.timeEnd("[PRISMA_DB] totalProduction-query");

    console.log(
      "[PRISMA_DB] Total production data (sum of PO quantities):",
      totalProduction
    );

    // Get current defect rate (today's defects / total input)
    const todayFilters = {
      startTime: { gte: today },
      ...filter,
    };

    console.time("[PRISMA_DB] todaysOperations-query");
    const todaysOperations = await prisma.operation.findMany({
      where: todayFilters,
      include: {
        operationDefects: true,
      },
    });
    console.timeEnd("[PRISMA_DB] todaysOperations-query");

    console.log("[PRISMA_DB] Today's operations:", todaysOperations.length);

    let totalInput = 0;
    let totalDefects = 0;

    todaysOperations.forEach((operation) => {
      totalInput += operation.inputQuantity || 0;
      operation.operationDefects.forEach((defect) => {
        totalDefects += defect.quantity || 0;
      });
    });

    const defectRate = totalInput > 0 ? totalDefects / totalInput : 0;

    console.log("Defect rate calculation:", {
      totalDefects,
      totalInput,
      defectRate,
    });

    // Get in-progress POs with filters
    const poFilters: any = { status: "IN_PROGRESS" };
    let filteredStatusCount = 0;
    let statusFilterApplied = false;
    let appliedStatusValue = null;

    // Create a copy of filters for the filtered status count when a status filter is applied
    const statusFilters: any = {};

    if (year || month || line || series || poNumber) {
      if (series && series !== "All") {
        poFilters.itemName = series;
        statusFilters.itemName = series;
      }

      if (poNumber) {
        poFilters.poNumber = {
          contains: poNumber,
        };
        statusFilters.poNumber = {
          contains: poNumber,
        };
      }

      // For line, we need to find POs that have operations on that line
      if (line && line !== "All") {
        poFilters.operations = {
          some: {
            lineNo: line,
          },
        };
        statusFilters.operations = {
          some: {
            lineNo: line,
          },
        };
      }

      // For status filter, don't override the "In Progress" status in poFilters
      // Instead, use a separate query to count POs with the selected status
      if (status && status !== "All") {
        statusFilterApplied = true;
        appliedStatusValue = Array.isArray(status)
          ? status[0]
          : (status as string);
        statusFilters.status = appliedStatusValue;
      }
    }

    console.time("[PRISMA_DB] inProgressPOs-query");
    const inProgressPOs = await prisma.productionOrder.count({
      where: poFilters,
    });
    console.timeEnd("[PRISMA_DB] inProgressPOs-query");

    console.log("[PRISMA_DB] In-progress POs:", inProgressPOs);

    // If a status filter is applied, count POs with that status
    if (statusFilterApplied) {
      console.time("[PRISMA_DB] filteredStatusPOs-query");
      filteredStatusCount = await prisma.productionOrder.count({
        where: statusFilters,
      });
      console.timeEnd("[PRISMA_DB] filteredStatusPOs-query");

      console.log(`${appliedStatusValue} POs:`, filteredStatusCount);
    }

    // Calculate machine utilization
    console.time("[PRISMA_DB] machineHours-query");
    const machineHours = await prisma.operation.findMany({
      where: {
        startTime: { gte: today },
        endTime: { not: null },
        ...filter,
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });
    console.timeEnd("[PRISMA_DB] machineHours-query");

    console.log("[PRISMA_DB] Machine hours data:", machineHours.length);

    let totalProductionHours = 0;
    machineHours.forEach((op) => {
      if (op.startTime && op.endTime) {
        const hours =
          (op.endTime.getTime() - op.startTime.getTime()) / (1000 * 60 * 60);
        totalProductionHours += hours;
      }
    });

    // Assuming 8-hour workday and a fixed number of machines
    const numMachines = 5; // This should be fetched from a configuration
    const machineUtilization = totalProductionHours / (numMachines * 8);

    console.log("Machine utilization calculation:", {
      totalProductionHours,
      machineUtilization,
    });

    // Set Cache-Control header for 5 minutes (300 seconds)
    res.setHeader("Cache-Control", "public, max-age=300");

    return res.status(200).json({
      totalProduction: totalProduction._sum.poQuantity || 0,
      defectRate,
      inProgressPOs,
      machineUtilization,
      filteredStatusCount: statusFilterApplied ? filteredStatusCount : null,
      appliedStatusValue: statusFilterApplied ? appliedStatusValue : null,
      appliedFilters: {
        year: year || null,
        month: month !== "All" ? month : null,
        line: line !== "All" ? line : null,
        series: series !== "All" ? series : null,
        status: status !== "All" ? status : null,
        poNumber: poNumber || null,
      },
    });
  } catch (error) {
    console.error("[PRISMA_DB] Error fetching dashboard stats:", error);
    console.error(
      "[PRISMA_DB] Dashboard stats error details:",
      JSON.stringify(error, Object.getOwnPropertyNames(error))
    );
    return res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});
