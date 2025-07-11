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
    console.log(
      "Fetching dashboard cost chart data with query params:",
      req.query
    );

    // Parse filter parameters - using same pattern as existing charts API
    const { year, month, line, series, status, poNumber } = req.query;

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
      }
    }

    // Apply line filter
    if (line && line !== "All") {
      const lineStr = Array.isArray(line) ? line[0] : (line as string);
      filterConditions.lineNo = lineStr;
      console.log(`Applied line filter:`, lineStr);
    }

    // Apply item series filter
    if (series && series !== "All") {
      const seriesStr = Array.isArray(series) ? series[0] : (series as string);
      productionOrderFilter.itemName = seriesStr;
      console.log(`Applied series filter:`, seriesStr);
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

    // Fetch operations with defects and production order costs
    const operations = await prisma.operation.findMany({
      where: {
        ...filterConditions,
        endTime: { not: null }, // Only completed operations
        operationDefects: {
          some: {}, // Has at least one defect record
        },
      },
      select: {
        id: true,
        operation: true,
        startTime: true,
        productionOrder: {
          select: {
            id: true,
            poNumber: true,
            itemName: true,
            costPerUnit: true,
          },
        },
        operationDefects: {
          select: {
            quantity: true,
            quantityRework: true,
            defectReworkable: true,
          },
        },
      },
      orderBy: {
        startTime: "desc",
      },
    });

    console.log(`Found ${operations.length} operations with defects`);

    // Log some sample data for debugging
    if (operations.length > 0) {
      const sampleOp = operations[0];
      console.log("Sample operation data:", {
        operation: sampleOp.operation,
        costPerUnit: sampleOp.productionOrder.costPerUnit,
        itemName: sampleOp.productionOrder.itemName,
        defectsCount: sampleOp.operationDefects.length,
        sampleDefect: sampleOp.operationDefects[0],
      });
    }

    // Calculate defect costs and group by operation code
    const operationCostData = operations.reduce((acc: any, op) => {
      const key = op.operation || "Unknown";
      const costPerUnit = Number(op.productionOrder.costPerUnit || 0);

      // Calculate effective defect quantity (total defects - reworked defects)
      const effectiveDefects = op.operationDefects.reduce((sum, defect) => {
        const effectiveDefectQty = defect.defectReworkable
          ? Math.max(0, defect.quantity - defect.quantityRework)
          : defect.quantity;
        return sum + effectiveDefectQty;
      }, 0);

      const operationCost = effectiveDefects * costPerUnit;

      if (!acc[key]) {
        acc[key] = {
          operation: key,
          totalCost: 0,
          count: 0,
        };
      }
      acc[key].totalCost += operationCost;
      acc[key].count += 1;
      return acc;
    }, {});

    const operationChartData = Object.values(operationCostData)
      .filter((item: any) => item.totalCost > 0) // Only show operations with costs
      .map((item: any) => ({
        name: item.operation,
        cost: parseFloat(item.totalCost.toFixed(2)),
      }));

    // Calculate daily cost data from the operations we already fetched
    const dailyCostData = operations.reduce((acc: any, op) => {
      if (!op.startTime) return acc; // Skip operations without startTime

      const costPerUnit = Number(op.productionOrder.costPerUnit || 0);

      // Calculate effective defect quantity
      const effectiveDefects = op.operationDefects.reduce((sum, defect) => {
        const effectiveDefectQty = defect.defectReworkable
          ? Math.max(0, defect.quantity - defect.quantityRework)
          : defect.quantity;
        return sum + effectiveDefectQty;
      }, 0);

      const operationCost = effectiveDefects * costPerUnit;

      if (operationCost > 0) {
        const date = op.startTime.toISOString().split("T")[0]; // YYYY-MM-DD format
        if (!acc[date]) {
          acc[date] = {
            date,
            cost: 0,
          };
        }
        acc[date].cost += operationCost;
      }
      return acc;
    }, {});

    const dailyChartData = Object.values(dailyCostData).map((item: any) => ({
      date: item.date,
      cost: parseFloat(item.cost.toFixed(2)),
    }));

    // Calculate total defect cost
    const totalDefectCost = operations.reduce((sum, op) => {
      const costPerUnit = Number(op.productionOrder.costPerUnit || 0);

      const effectiveDefects = op.operationDefects.reduce(
        (defectSum, defect) => {
          const effectiveDefectQty = defect.defectReworkable
            ? Math.max(0, defect.quantity - defect.quantityRework)
            : defect.quantity;
          return defectSum + effectiveDefectQty;
        },
        0
      );

      return sum + effectiveDefects * costPerUnit;
    }, 0);

    console.log(`Total defect cost: $${totalDefectCost.toFixed(2)}`);

    res.status(200).json({
      operationCostData: operationChartData,
      dailyCostData: dailyChartData,
      totalDefectCost: parseFloat(totalDefectCost.toFixed(2)),
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
    console.error("Error fetching cost chart data:", error);
    res.status(500).json({
      error: "Failed to fetch cost chart data",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
