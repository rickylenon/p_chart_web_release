import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState, useMemo, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Head from "next/head";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { DefectRatioChart } from "@/components/dashboard/defect-ratio-chart";
import { MachineDefectsCharts } from "@/components/dashboard/machine-defects-chart";
import { DefectCostChart } from "@/components/dashboard/defect-cost-chart";
import { POProgressChart } from "@/components/dashboard/po-progress-chart";
import {
  DashboardFilters,
  DashboardFiltersContext,
  DashboardFiltersState,
} from "@/components/dashboard/filters";
import { RefreshCw } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { withServerSideAuth } from "@/lib/auth";

// Debug log to verify POProgressChart import
console.log("📦 Dashboard: POProgressChart imported:", typeof POProgressChart);

export default function Dashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [filters, setFilters] = useState<DashboardFiltersState>({
    year: new Date().getFullYear().toString(),
    month: "All",
    line: "All",
    series: "All",
    status: "All",
    poNumber: "",
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Calculate active filter count for context
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.month !== "All") count++;
    if (filters.line !== "All") count++;
    if (filters.series !== "All") count++;
    if (filters.status !== "All") count++;
    if (filters.poNumber) count++;
    return count;
  }, [filters]);

  // Handler to manually refresh data
  const handleRefresh = useCallback(() => {
    console.log("Manually refreshing dashboard data...");
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Log filter changes
  useEffect(() => {
    console.log("Dashboard filters updated:", filters);
    console.log("Active filter count:", activeFilterCount);
  }, [filters, activeFilterCount]);

  return (
    <>
      <Head>
        <title>Dashboard - P-Chart System</title>
      </Head>
      <DashboardFiltersContext.Provider
        value={{ filters, setFilters, activeFilterCount }}
      >
        <DashboardLayout>
          <div className="py-6 space-y-6">
            <PageHeader
              title="Dashboard"
              description="Overview of production metrics and defect analysis"
              actions={
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="icon"
                  className="p-2 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100"
                  aria-label="Refresh dashboard data"
                  title="Refresh dashboard data"
                >
                  <RefreshCw size={20} />
                </Button>
              }
            />

            {/* Search and Filters */}
            <div className="bg-white dark:bg-black shadow rounded-lg p-6">
              <DashboardFilters />
            </div>

            {/* Stats Cards */}
            <StatsCards refreshTrigger={refreshTrigger} />

            {/* Charts */}
            <div className="space-y-6">
              <POProgressChart refreshTrigger={refreshTrigger} />
              <DefectRatioChart refreshTrigger={refreshTrigger} />
              <MachineDefectsCharts refreshTrigger={refreshTrigger} />
              <DefectCostChart refreshTrigger={refreshTrigger} />
            </div>
          </div>
        </DashboardLayout>
      </DashboardFiltersContext.Provider>
    </>
  );
}

// Add server-side authentication
export const getServerSideProps = withServerSideAuth(async (context, auth) => {
  console.log("[Dashboard] Server-side props with user:", auth.user?.name);

  // We don't need to fetch any data here, just ensuring authentication
  return {
    props: {},
  };
});
