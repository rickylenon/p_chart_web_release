import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { SERIES_FILTER_DIGITS } from "@/lib/constants";

// Helper to fetch unique values using a more reliable approach
async function getUniqueValues(
  field: string,
  model = "Operation",
  parentField?: string,
  dateField?: string,
  startDate?: Date,
  endDate?: Date
) {
  console.log(`Fetching unique ${field} values from ${model}`, {
    parentField,
    dateField,
    startDate,
    endDate,
  });
  console.time(`unique-${field}-query`);

  try {
    // Use a more reliable approach with groupBy instead of distinct
    if (model === "Operation") {
      // For date filtering
      const whereClause =
        dateField && startDate && endDate
          ? { [dateField]: { gte: startDate, lte: endDate } }
          : {};

      // Direct fields on Operation model
      if (!parentField) {
        // For lineNo (special case for Production Line)
        if (field === "lineNo") {
          const lines = await prisma.operation.groupBy({
            by: ["lineNo"] as Prisma.OperationScalarFieldEnum[],
            where: whereClause,
            orderBy: {
              lineNo: "asc",
            } as any,
          } as any);

          console.timeEnd(`unique-${field}-query`);
          console.log(`Found ${lines.length} unique lines`);
          return lines.filter((l) => l.lineNo !== null).map((l) => l.lineNo);
        }

        // For other direct fields
        const result = await prisma.operation.findMany({
          where: whereClause,
          select: {
            [field]: true,
          },
          distinct: [field] as any,
        });

        console.timeEnd(`unique-${field}-query`);

        const values = result.map((item) => (item as any)[field]);

        // Special case for dates - return years
        if (field === "startTime" || field === "endTime") {
          const years = [
            ...new Set(
              values.map((date) =>
                date instanceof Date ? date.getFullYear() : null
              )
            ),
          ];
          return years.filter(Boolean).sort((a, b) => Number(b) - Number(a)); // Sort years descending
        }

        return [...new Set(values)].filter(Boolean).sort();
      }

      // For fields on related models (like ProductionOrder)
      if (parentField === "productionOrder") {
        // Get the unique IDs first
        const uniqueIds = await prisma.operation.groupBy({
          by: ["productionOrderId"] as Prisma.OperationScalarFieldEnum[],
          where: whereClause,
        });

        // Now fetch the related entities with those IDs
        const productionOrderIds = uniqueIds
          .filter((o) => o.productionOrderId !== null)
          .map((o) => o.productionOrderId);

        // Get statuses from ProductionOrder model
        if (field === "status") {
          const statuses = await prisma.productionOrder.groupBy({
            by: ["status"] as Prisma.ProductionOrderScalarFieldEnum[],
            where: {
              id: {
                in: productionOrderIds,
              },
            },
          });

          console.timeEnd(`unique-${field}-query`);
          console.log(`Found ${statuses.length} unique statuses`);
          return statuses.filter((s) => s.status !== null).map((s) => s.status);
        }

        // Get items from ProductionOrder model (called "itemName" in the schema)
        if (field === "series") {
          const items = await prisma.productionOrder.groupBy({
            by: ["itemName"] as Prisma.ProductionOrderScalarFieldEnum[],
            where: {
              id: {
                in: productionOrderIds,
              },
            },
          });

          console.timeEnd(`unique-${field}-query`);
          console.log(`Found ${items.length} unique items/series`);

          // Extract the first N digits from each item name as series identifier
          const seriesValues = items
            .filter((i) => i.itemName !== null)
            .map((i) => {
              const itemName = i.itemName || "";
              // Extract the first N digits as defined in constants
              const seriesCode = itemName.substring(0, SERIES_FILTER_DIGITS);
              console.log(
                `Extracted series code '${seriesCode}' from item '${itemName}'`
              );
              return seriesCode;
            })
            .filter((series) => series.length === SERIES_FILTER_DIGITS); // Ensure we only get complete series codes

          // Return unique series values
          return [...new Set(seriesValues)].sort();
        }
      }
    }

    // Default empty array if we couldn't handle the specific case
    console.timeEnd(`unique-${field}-query`);
    return [];
  } catch (error) {
    console.error(`Error fetching unique ${field} values:`, error);
    console.timeEnd(`unique-${field}-query`);
    return [];
  }
}

export default withAuth(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  try {
    console.log(
      "API: Dashboard filter options auth session validated, user:",
      session?.user?.name
    );

    console.log("Fetching dashboard filter options");

    // Get query parameters
    const { year, month } = req.query;

    // Configure date range based on year/month filters
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (year) {
      const yearStr = Array.isArray(year) ? year[0] : (year as string);
      const yearNum = parseInt(yearStr);
      startDate = new Date(Date.UTC(yearNum, 0, 1));
      endDate = new Date(Date.UTC(yearNum, 11, 31, 23, 59, 59, 999));

      if (month && month !== "All") {
        const monthStr = Array.isArray(month) ? month[0] : (month as string);
        const monthNum = parseInt(monthStr) - 1; // 0-based month
        startDate = new Date(Date.UTC(yearNum, monthNum, 1));
        endDate = new Date(Date.UTC(yearNum, monthNum + 1, 0, 23, 59, 59, 999));
      }
    }

    console.log("Date range for filter options:", { startDate, endDate });

    // Fetch all filter options
    const [years, lines, series, statuses] = await Promise.all([
      // Years from operation start times
      getUniqueValues("startTime"),

      // Available lines (using lineNo field instead of line)
      getUniqueValues("lineNo"),

      // Available series from production orders (using itemName as the series field)
      getUniqueValues(
        "series",
        "Operation",
        "productionOrder",
        "startTime",
        startDate,
        endDate
      ),

      // Available statuses from production orders
      getUniqueValues(
        "status",
        "Operation",
        "productionOrder",
        "startTime",
        startDate,
        endDate
      ),
    ]);

    console.log("Filter options counts:", {
      years: years.length,
      lines: lines.length,
      series: series.length,
      statuses: statuses.length,
    });

    return res.status(200).json({
      years,
      lines,
      series,
      statuses,
    });
  } catch (error) {
    console.error("Error in filter options API:", error);
    return res.status(500).json({ error: "Failed to fetch filter options" });
  }
});
