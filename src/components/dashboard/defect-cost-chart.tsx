import { useEffect, useState } from "react";
import { useDashboardFilters } from "./filters";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  TooltipProps,
} from "recharts";
import {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import { AlertCircle, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface OperationCostData {
  name: string;
  cost: number;
}

interface DailyCostData {
  date: string;
  cost: number;
}

interface DefectCostChartProps {
  refreshTrigger?: number;
}

const CostTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    const cost = payload[0].value as number;

    return (
      <div className="bg-white p-4 border border-gray-200 shadow-md rounded-md">
        <p className="font-bold">{label}</p>
        <p className="text-red-600">{`Defect Cost: $${cost.toFixed(2)}`}</p>
      </div>
    );
  }

  return null;
};

export function DefectCostChart({ refreshTrigger = 0 }: DefectCostChartProps) {
  const { filters } = useDashboardFilters();
  const { getAuthHeaders } = useAuth();
  const [operationCostData, setOperationCostData] = useState<
    OperationCostData[]
  >([]);
  const [dailyCostData, setDailyCostData] = useState<DailyCostData[]>([]);
  const [totalDefectCost, setTotalDefectCost] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log("Fetching defect cost data with filters:", filters);

        // Build query params from filters
        const params = new URLSearchParams();
        if (filters.year) params.append("year", filters.year);
        if (filters.month !== "All") params.append("month", filters.month);
        if (filters.line !== "All") params.append("line", filters.line);
        if (filters.series !== "All") params.append("series", filters.series);
        if (filters.status !== "All") params.append("status", filters.status);
        if (filters.poNumber) params.append("poNumber", filters.poNumber);

        const queryString = params.toString();
        const url = `/api/dashboard/cost-charts?${queryString}`;

        console.log("Fetching from URL:", url);
        console.time("defectCostChart");

        const response = await fetch(url, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          throw new Error("Failed to fetch defect cost data");
        }

        const data = await response.json();
        console.timeEnd("defectCostChart");
        console.log("Defect cost data:", data);

        setOperationCostData(data.operationCostData || []);
        setDailyCostData(data.dailyCostData || []);
        setTotalDefectCost(data.totalDefectCost || 0);
        setError(null);
      } catch (err) {
        console.error("Error fetching defect cost data:", err);
        setError("Failed to load defect cost data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters, refreshTrigger]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-black rounded-lg shadow p-6 h-[450px] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading cost data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-black rounded-lg shadow p-6 h-[450px] flex flex-col items-center justify-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-red-500">
          Failed to load cost chart
        </h3>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  const hasData = operationCostData.length > 0 || dailyCostData.length > 0;

  if (!hasData) {
    return (
      <div className="bg-white dark:bg-black rounded-lg shadow p-6 h-[450px] flex flex-col items-center justify-center">
        <DollarSign className="h-12 w-12 text-gray-400 mb-4" />
        <div className="text-gray-400 text-center">
          <p className="mb-2 text-lg">No defect cost data available</p>
          <p className="text-sm">
            Try adjusting your filter criteria or ensure operations have cost
            data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Total Cost Summary */}
      {totalDefectCost > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-8 w-8 text-red-600" />
              <div>
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
                  Total Defect Cost
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Based on current filters
                </p>
              </div>
            </div>
            <div className="text-3xl font-bold text-red-600">
              ${totalDefectCost.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Operation Cost Chart */}
      {operationCostData.length > 0 && (
        <div className="bg-white dark:bg-black rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Defect Cost by Operation
          </h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={operationCostData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 30,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <Tooltip content={<CostTooltip />} />
                <Legend />
                <Bar dataKey="cost" fill="#ef4444" name="Defect Cost ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Daily Cost Trend Chart */}
      {dailyCostData.length > 0 && (
        <div className="bg-white dark:bg-black rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Daily Defect Cost Trend (Last 30 Days)
          </h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dailyCostData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 30,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <Tooltip
                  content={<CostTooltip />}
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString();
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: "#ef4444", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Daily Defect Cost ($)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
