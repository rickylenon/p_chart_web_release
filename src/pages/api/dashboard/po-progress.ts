import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth";

interface POProgressData {
  day: string;
  date: string;
  started: number;
  completed: number;
  total: number;
}

export default withAuth(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log(
      "API: P.O. progress auth session validated, user:",
      session?.user?.name
    );
    console.log("Fetching P.O. progress data with query params:", req.query);

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

    // Determine date range for the query
    let startDate: Date;
    let endDate: Date;

    if (month && month !== "All" && year) {
      // Specific month
      const monthStr = Array.isArray(month) ? month[0] : (month as string);
      const monthNum = parseInt(monthStr);
      const yearStr = Array.isArray(year) ? year[0] : (year as string);

      if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
        startDate = new Date(
          `${yearStr}-${monthNum.toString().padStart(2, "0")}-01`
        );
        endDate = new Date(Number(yearStr), monthNum, 0); // Last day of month
        endDate.setHours(23, 59, 59, 999);
      } else {
        console.warn("Invalid month value:", monthStr);
        return res.status(400).json({ error: "Invalid month value" });
      }
    } else {
      // Default to current month when no month specified or month is "All"
      const now = new Date();
      const targetYear = year
        ? parseInt(Array.isArray(year) ? year[0] : year)
        : now.getFullYear();

      startDate = new Date(targetYear, now.getMonth(), 1);
      endDate = new Date(targetYear, now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      console.log(
        `Defaulting to current month (${
          now.getMonth() + 1
        }/${targetYear}): ${startDate.toISOString()} to ${endDate.toISOString()}`
      );
    }

    console.log(
      `Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`
    );

    // Build filter conditions for production orders
    const productionOrderFilter: any = {};

    // Apply item series filter (using itemName)
    if (series && series !== "All") {
      const seriesStr = Array.isArray(series) ? series[0] : (series as string);
      productionOrderFilter.itemName = seriesStr;
      console.log(`Applied series filter (using itemName):`, seriesStr);
    }

    // Apply status filter
    if (status && status !== "All") {
      const statusStr = Array.isArray(status) ? status[0] : (status as string);
      productionOrderFilter.status = statusStr;
      console.log(`Applied status filter:`, statusStr);
    }

    // Apply PO number filter
    if (poNumber) {
      const poNumberStr = Array.isArray(poNumber)
        ? poNumber[0]
        : (poNumber as string);
      productionOrderFilter.poNumber = {
        contains: poNumberStr,
      };
      console.log(`Applied PO number filter:`, poNumberStr);
    }

    // Build operation filter conditions
    const operationFilter: any = {
      startTime: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Apply line filter
    if (line && line !== "All") {
      const lineStr = Array.isArray(line) ? line[0] : (line as string);
      operationFilter.lineNo = lineStr;
      console.log(`Applied line filter:`, lineStr);
    }

    // Apply production order filters to operations
    if (Object.keys(productionOrderFilter).length > 0) {
      operationFilter.productionOrder = productionOrderFilter;
    }

    console.log(
      "Operation filter conditions:",
      JSON.stringify(operationFilter, null, 2)
    );

    // Get OP10 operations that started within the date range (P.O. starts)
    console.time("started-operations-query");
    const startedOperations = await prisma.operation.findMany({
      where: {
        ...operationFilter,
        operation: "OP10", // Only get OP10 operations for P.O. starts
      },
      include: {
        productionOrder: {
          select: {
            poNumber: true,
            itemName: true,
            status: true,
          },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });
    console.timeEnd("started-operations-query");

    // Get OP40 operations that completed within the date range (P.O. completions)
    console.time("completed-operations-query");
    const completedOperations = await prisma.operation.findMany({
      where: {
        ...operationFilter,
        operation: "OP40", // Only get OP40 operations for P.O. completions
        endTime: {
          gte: startDate,
          lte: endDate,
          not: null,
        },
      },
      include: {
        productionOrder: {
          select: {
            poNumber: true,
            itemName: true,
            status: true,
          },
        },
      },
      orderBy: {
        endTime: "asc",
      },
    });
    console.timeEnd("completed-operations-query");

    console.log(
      `Found ${startedOperations.length} operations started in date range`
    );
    console.log(
      `Found ${completedOperations.length} operations completed in date range`
    );

    // Generate all days in the date range
    const progressData: POProgressData[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayStr = currentDate.getDate().toString();
      const dateStr = currentDate.toISOString().split("T")[0];

      // Count P.O.s that had their first operation started on this day
      const startedOnDay = new Set();
      startedOperations.forEach((op) => {
        if (
          op.startTime &&
          op.startTime.toDateString() === currentDate.toDateString()
        ) {
          startedOnDay.add(op.productionOrder.poNumber);
        }
      });

      // Count P.O.s completed on this day (OP40 completion means P.O. completion)
      const completedOnDay = new Set();
      completedOperations.forEach((op) => {
        if (
          op.endTime &&
          op.endTime.toDateString() === currentDate.toDateString()
        ) {
          completedOnDay.add(op.productionOrder.poNumber);
        }
      });

      // Calculate total active P.O.s up to this day
      const activePOs = new Set();
      startedOperations.forEach((op) => {
        if (op.startTime && op.startTime <= currentDate) {
          activePOs.add(op.productionOrder.poNumber);
        }
      });

      progressData.push({
        day: dayStr,
        date: dateStr,
        started: startedOnDay.size,
        completed: completedOnDay.size,
        total: activePOs.size,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log("P.O. progress data generated:", progressData.length, "days");

    // Set Cache-Control header for 5 minutes (300 seconds)
    res.setHeader("Cache-Control", "public, max-age=300");

    return res.status(200).json({
      progressData,
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
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching P.O. progress data:", error);
    return res.status(500).json({
      error: "Failed to fetch P.O. progress data",
      progressData: [],
    });
  }
});
