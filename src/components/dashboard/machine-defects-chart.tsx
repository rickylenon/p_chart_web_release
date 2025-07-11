import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";
import { useDashboardFilters } from "./filters";
import { useAuth } from "@/hooks/useAuth";

interface MachineDefect {
  name: string;
  fullName: string;
  defects: number;
}

interface DefectType {
  name: string;
  category: string;
  value: number;
}

interface MachineDefectData {
  name: string;
  fullName: string;
  defects: number;
  total?: number;
}

interface MachineDefectsChartsProps {
  refreshTrigger?: number;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm">
        <p className="text-sm font-medium text-gray-900">
          {data.fullName || `${data.name} (${data.category})`}
        </p>
        <p className="text-sm text-gray-600">{`${payload[0].value} defects`}</p>
      </div>
    );
  }
  return null;
};

const NoDataDisplay = ({ title }: { title: string }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-lg font-medium text-gray-900">{title}</h2>
    <div
      className="flex items-center justify-center"
      style={{ height: "300px" }}
    >
      <p className="text-gray-500">No data available for selected filters</p>
    </div>
  </div>
);

export function MachineDefectsCharts({
  refreshTrigger = 0,
}: MachineDefectsChartsProps) {
  const { filters } = useDashboardFilters();
  const { getAuthHeaders } = useAuth();
  const [machineData, setMachineData] = useState<MachineDefect[]>([]);
  const [defectTypesData, setDefectTypesData] = useState<DefectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        console.log(
          "Fetching machine defects chart data with filters:",
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

        // Add chart parameter to get all chart data in one request
        params.append("chart", "all");

        const queryString = params.toString();
        const url = `/api/dashboard/charts?${queryString}`;

        console.log("Fetching from URL:", url);
        console.time("machineDefectsChart");

        const response = await fetch(url, {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch chart data");
        }
        const data = await response.json();
        console.timeEnd("machineDefectsChart");

        console.log("Machine defects chart data:", data.machineDefectsData);
        console.log("Defect types chart data:", data.defectTypesData);

        // Process machine defects data by calculating totals
        const processedMachineData =
          data.machineDefectsData?.map((machine: MachineDefectData) => ({
            ...machine,
            // If total is not provided in the API response, use defects as the total
            total: machine.total || machine.defects,
          })) || [];

        setMachineData(processedMachineData || []);
        setDefectTypesData(data.defectTypesData || []);
        setError(null);
      } catch (err) {
        console.error("Error fetching chart data:", err);
        setError("Failed to load chart data");
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();

    // Set up polling every 5 minutes
    const intervalId = setInterval(fetchChartData, 300000);

    return () => clearInterval(intervalId);
  }, [filters, refreshTrigger]);

  // Calculate max values for charts
  const maxMachineDefects = Math.max(
    ...machineData.map((item) => item.defects),
    1
  );
  // Round up to nearest 2 for a nicer scale
  const machineYMax = Math.ceil(maxMachineDefects / 2) * 2;

  const maxDefectTypeValue = Math.max(
    ...defectTypesData.map((item) => item.value),
    1
  );
  // Round up to nearest 1 for a nicer scale
  const defectYMax = Math.ceil(maxDefectTypeValue);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900">
              {i === 1 ? "Top Defects per Machine" : "Most Frequent Defects"}
            </h2>
            <div className="mt-4 animate-pulse" style={{ height: "300px" }}>
              <div className="h-full bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    console.log("Error displaying charts:", error);
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {["Top Defects per Machine", "Most Frequent Defects"].map((title) => (
          <div key={title} className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900">{title}</h2>
            <div
              className="flex items-center justify-center"
              style={{ height: "300px" }}
            >
              <p className="text-red-500">Error loading chart data</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {machineData.length === 0 ? (
        <NoDataDisplay title="Top Defects per Machine" />
      ) : (
        <div className="bg-white dark:bg-black rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Top Defects per Machine
          </h2>
          <div className="mt-4" style={{ height: "300px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={machineData}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 40, bottom: 20 }}
                barSize={30}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e5e7eb"
                  horizontal={true}
                />
                <XAxis
                  type="number"
                  domain={[0, machineYMax]}
                  ticks={Array.from(
                    { length: 5 },
                    (_, i) => (i * machineYMax) / 4
                  )}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickLine={{ stroke: "#e5e7eb" }}
                  tick={{ fill: "#6b7280" }}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickLine={{ stroke: "#e5e7eb" }}
                  tick={{ fill: "#6b7280" }}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="defects" fill="#60a5fa" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {defectTypesData.length === 0 ? (
        <NoDataDisplay title="Most Frequent Defects" />
      ) : (
        <div className="bg-white dark:bg-black rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Most Frequent Defects
          </h2>
          <div className="mt-4" style={{ height: "300px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={defectTypesData}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 80, bottom: 20 }}
                barSize={20}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e5e7eb"
                  horizontal={true}
                />
                <XAxis
                  type="number"
                  domain={[0, defectYMax]}
                  ticks={Array.from(
                    { length: Math.min(defectYMax + 1, 6) },
                    (_, i) =>
                      Math.round((i * defectYMax) / Math.min(defectYMax, 5))
                  )}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickLine={{ stroke: "#e5e7eb" }}
                  tick={{ fill: "#6b7280" }}
                  allowDecimals={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickLine={{ stroke: "#e5e7eb" }}
                  tick={{ fill: "#6b7280" }}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#4ade80" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
