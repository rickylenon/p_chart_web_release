import { useEffect, useState } from "react";
import { useDashboardFilters } from "./filters";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
  BarChart,
  Bar,
} from "recharts";
import {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface POProgressData {
  day: string;
  date: string;
  started: number;
  completed: number;
  total: number;
}

interface POProgressChartProps {
  refreshTrigger?: number;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    const started =
      (payload.find((p) => p.dataKey === "started")?.value as number) || 0;
    const completed =
      (payload.find((p) => p.dataKey === "completed")?.value as number) || 0;
    const total =
      (payload.find((p) => p.dataKey === "total")?.value as number) || 0;

    return (
      <div className="bg-white p-4 border border-gray-200 shadow-md rounded-md">
        <p className="font-bold">{label}</p>
        <p className="text-blue-600">{`Started: ${started} P.O.s`}</p>
        <p className="text-green-600">{`Completed: ${completed} P.O.s`}</p>
        <p className="text-gray-600">{`Total Active: ${total} P.O.s`}</p>
      </div>
    );
  }

  return null;
};

export function POProgressChart({ refreshTrigger = 0 }: POProgressChartProps) {
  console.log("🟢 POProgressChart: Component is rendering!", {
    refreshTrigger,
  });

  const { filters } = useDashboardFilters();
  const { getAuthHeaders } = useAuth();
  const [chartData, setChartData] = useState<POProgressData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log("🟡 POProgressChart: Current filters:", filters);
  console.log(
    "🟡 POProgressChart: getAuthHeaders function:",
    typeof getAuthHeaders
  );

  useEffect(() => {
    console.log("🔵 POProgressChart: useEffect triggered!", {
      filters,
      refreshTrigger,
    });

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log(
          "🚀 POProgressChart: Starting fetch with filters:",
          filters
        );

        // Build query params from filters
        const params = new URLSearchParams();
        if (filters.year) params.append("year", filters.year);
        if (filters.month !== "All") params.append("month", filters.month);
        if (filters.line !== "All") params.append("line", filters.line);
        if (filters.series !== "All") params.append("series", filters.series);
        if (filters.status !== "All") params.append("status", filters.status);
        if (filters.poNumber) params.append("poNumber", filters.poNumber);

        const queryString = params.toString();
        const url = `/api/dashboard/po-progress?${queryString}`;

        console.log("Fetching P.O. progress from URL:", url);
        console.time("poProgressChart");

        const response = await fetch(url, {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("P.O. progress API error:", response.status, errorText);
          throw new Error(
            `Failed to fetch P.O. progress data: ${response.status}`
          );
        }

        const data = await response.json();
        console.timeEnd("poProgressChart");
        console.log("P.O. progress data received:", {
          dataLength: data.progressData?.length || 0,
          dateRange: data.dateRange,
          appliedFilters: data.appliedFilters,
        });

        setChartData(data.progressData || []);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching P.O. progress data:", err);
        setError("Failed to load P.O. progress data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters, refreshTrigger]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-black rounded-lg shadow p-6 h-[450px] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">
          Loading P.O. progress data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-black rounded-lg shadow p-6 h-[450px] flex flex-col items-center justify-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-red-500">
          Failed to load chart
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-black rounded-lg shadow p-6 h-[450px] flex flex-col items-center justify-center">
        <div className="text-gray-400 text-center">
          <p className="mb-2 text-lg">
            No P.O. progress data available for the selected filters
          </p>
          <p className="text-sm">Try adjusting your filter criteria</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Production Order Progress - Monthly View
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Daily view of P.O.s started (OP10 start) and completed (OP40 completion)
        throughout the month
      </p>
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
            <XAxis
              dataKey="day"
              angle={-45}
              textAnchor="end"
              height={60}
              interval={0}
            />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="started" fill="#3b82f6" name="P.O.s Started" />
            <Bar dataKey="completed" fill="#10b981" name="P.O.s Completed" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
