import { useEffect, useState } from "react";
import { useDashboardFilters } from "./filters";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface StatsCardProps {
  title: string;
  value: string | number;
  description: string;
  trend?: "up" | "down";
  trendValue?: string;
  valueColor?: string;
  isLoading?: boolean;
  hasError?: boolean;
}

interface StatsCardsProps {
  refreshTrigger?: number;
}

function StatsCard({
  title,
  value,
  description,
  valueColor = "text-foreground dark:text-foreground",
  isLoading = false,
  hasError = false,
}: StatsCardProps) {
  return (
    <div className="bg-card rounded-lg shadow p-6 border border-border">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="mt-2 flex items-baseline">
        {isLoading ? (
          <p className="text-3xl font-semibold text-muted-foreground/30 animate-pulse">
            --
          </p>
        ) : hasError ? (
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-destructive mr-1" />
            <p className="text-xl font-semibold text-destructive">Error</p>
          </div>
        ) : (
          <p className={`text-3xl font-semibold ${valueColor}`}>{value}</p>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function StatsCards({ refreshTrigger = 0 }: StatsCardsProps) {
  const { filters } = useDashboardFilters();
  const { getAuthHeaders } = useAuth();
  const [stats, setStats] = useState({
    totalProduction: 0,
    defectRate: 0,
    inProgressPOs: 0,
    machineUtilization: 0,
    filteredStatusCount: null as number | null,
    appliedStatusValue: null as string | null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        console.log("Fetching dashboard stats with filters:", filters);

        // Build query params from filters
        const params = new URLSearchParams();
        if (filters.year) params.append("year", filters.year);
        if (filters.month !== "All") params.append("month", filters.month);
        if (filters.line !== "All") params.append("line", filters.line);
        if (filters.series !== "All") params.append("series", filters.series);
        if (filters.status !== "All") params.append("status", filters.status);
        if (filters.poNumber) params.append("poNumber", filters.poNumber);

        const queryString = params.toString();
        const url = `/api/dashboard/stats${
          queryString ? `?${queryString}` : ""
        }`;

        console.log("Fetching from URL:", url);
        const response = await fetch(url, {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch dashboard stats");
        }
        const data = await response.json();
        console.log("Dashboard stats data:", data);
        setStats(data);
        setError(null);
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Set up polling every 60 seconds to refresh data
    const intervalId = setInterval(fetchStats, 60000);

    return () => clearInterval(intervalId);
  }, [filters, refreshTrigger]);

  // Helper functions to format values
  const formatDefectRate = (rate: number) => {
    return `${(rate * 100).toFixed(2)}%`;
  };

  const formatUtilization = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  const formatLargeNumber = (num: number) => {
    // For numbers less than 1 million, use normal comma formatting
    if (num < 1_000_000) {
      return num.toLocaleString();
    }
    // For millions (6 zeros)
    else if (num < 1_000_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    }
    // For billions (9 zeros)
    else if (num < 1_000_000_000_000) {
      return `${(num / 1_000_000_000).toFixed(1)}B`;
    }
    // For trillions (12 zeros)
    else {
      return `${(num / 1_000_000_000_000).toFixed(1)}T`;
    }
  };

  const getDefectRateColor = (rate: number) => {
    if (rate < 0.01) return "text-green-600 dark:text-green-400"; // Less than 1%
    if (rate < 0.03) return "text-yellow-600 dark:text-yellow-400"; // Less than 3%
    return "text-red-600 dark:text-red-400";
  };

  const getUtilizationColor = (rate: number) => {
    if (rate > 0.8) return "text-green-600 dark:text-green-400"; // More than 80%
    if (rate > 0.5) return "text-yellow-600 dark:text-yellow-400"; // More than 50%
    return "text-red-600 dark:text-red-400";
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-card rounded-lg shadow p-6 border border-border animate-pulse"
          >
            <div className="h-2 bg-muted rounded mb-3 w-1/3"></div>
            <div className="h-6 bg-muted rounded mb-2 w-1/2"></div>
            <div className="h-2 bg-muted rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    console.log("Error displaying stats:", error);
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Production"
          value={formatLargeNumber(stats.totalProduction)}
          description="Sum of production order quantities"
          hasError={!!error}
        />
        <StatsCard
          title="Current Defect Rate"
          value={formatDefectRate(stats.defectRate)}
          description="Today's total defect / total input across completed operations"
          valueColor={getDefectRateColor(stats.defectRate)}
          hasError={!!error}
        />
        <StatsCard
          title={
            stats.appliedStatusValue
              ? `${stats.appliedStatusValue} POs`
              : "In-Progress POs"
          }
          value={
            stats.appliedStatusValue
              ? stats.filteredStatusCount || 0
              : stats.inProgressPOs
          }
          description={
            stats.appliedStatusValue
              ? `Production Orders with status "${stats.appliedStatusValue}"`
              : 'Production Orders with status "IN_PROGRESS"'
          }
          hasError={!!error}
        />
        <StatsCard
          title="Machine Utilization"
          value={formatUtilization(stats.machineUtilization)}
          description="Today's production hours / (machines × 8 hours)"
          valueColor={getUtilizationColor(stats.machineUtilization)}
          hasError={!!error}
        />
      </div>
      {lastUpdated && !error && (
        <div className="text-right text-xs text-muted-foreground">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
