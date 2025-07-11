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
  TooltipProps,
} from "recharts";
import {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ChartData {
  name: string;
  good: number;
  defects: number;
}

interface DefectRatioDataItem {
  date: string;
  ratio: number;
  input: number;
  defects: number;
}

interface DefectRatioChartProps {
  refreshTrigger?: number;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    const good = payload[0].value as number;
    const defects = payload[1].value as number;
    const total = good + defects;
    const defectRate = total > 0 ? (defects / total) * 100 : 0;

    return (
      <div className="bg-white p-4 border border-gray-200 shadow-md rounded-md">
        <p className="font-bold">{label}</p>
        <p className="text-emerald-600">{`Good: ${good.toLocaleString()} units (${(
          100 - defectRate
        ).toFixed(2)}%)`}</p>
        <p className="text-red-600">{`Defects: ${defects.toLocaleString()} units (${defectRate.toFixed(
          2
        )}%)`}</p>
        <p className="text-gray-500">{`Total: ${total.toLocaleString()} units`}</p>
      </div>
    );
  }

  return null;
};

export function DefectRatioChart({
  refreshTrigger = 0,
}: DefectRatioChartProps) {
  const { filters } = useDashboardFilters();
  const { getAuthHeaders } = useAuth();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log("Fetching defect ratio data with filters:", filters);

        // Build query params from filters
        const params = new URLSearchParams();
        if (filters.year) params.append("year", filters.year);
        if (filters.month !== "All") params.append("month", filters.month);
        if (filters.line !== "All") params.append("line", filters.line);
        if (filters.series !== "All") params.append("series", filters.series);
        if (filters.status !== "All") params.append("status", filters.status);
        if (filters.poNumber) params.append("poNumber", filters.poNumber);

        params.append("chart", "defectRatio");

        const queryString = params.toString();
        const url = `/api/dashboard/charts?${queryString}`;

        console.log("Fetching from URL:", url);
        console.time("defectRatioChart");

        const response = await fetch(url, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          throw new Error("Failed to fetch defect ratio data");
        }

        const data = await response.json();
        console.timeEnd("defectRatioChart");
        console.log("Defect ratio data:", data.defectRatioData);

        // Convert defectRatioData to the format expected by our chart
        // Note: item.date now contains operation codes (OP10, OP15, etc.) instead of dates
        const transformedData = data.defectRatioData
          ? data.defectRatioData.map((item: DefectRatioDataItem) => ({
              name: item.date, // This is now operation code like "OP10", "OP15", etc.
              good: item.input - item.defects,
              defects: item.defects,
            }))
          : [];

        setChartData(transformedData);
        setError(null);
      } catch (err) {
        console.error("Error fetching defect ratio data:", err);
        setError("Failed to load defect ratio data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters, refreshTrigger]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 h-[450px] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading chart data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6 h-[450px] flex flex-col items-center justify-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-red-500">
          Failed to load chart
        </h3>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 h-[450px] flex flex-col items-center justify-center">
        <div className="text-gray-400 text-center">
          <p className="mb-2 text-lg">
            No data available for the selected filters
          </p>
          <p className="text-sm">Try adjusting your filter criteria</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Production Output vs. Defects by Operation
      </h3>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 30,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="good" stackId="a" fill="#10b981" name="Good Output" />
            <Bar dataKey="defects" stackId="a" fill="#ef4444" name="Defects" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
