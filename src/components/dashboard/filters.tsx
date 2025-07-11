import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SERIES_FILTER_DIGITS } from "@/lib/constants";

export interface DashboardFiltersState {
  year: string;
  month: string;
  line: string; // This is actually lineNo in the database
  series: string;
  status: string;
  poNumber: string;
}

interface DashboardFiltersContextType {
  filters: DashboardFiltersState;
  setFilters: Dispatch<SetStateAction<DashboardFiltersState>>;
  activeFilterCount: number;
}

interface FilterOptions {
  years: number[];
  lines: string[];
  series: string[];
  statuses: string[];
}

export const DashboardFiltersContext =
  createContext<DashboardFiltersContextType>({
    filters: {
      year: new Date().getFullYear().toString(),
      month: "All",
      line: "All",
      series: "All",
      status: "All",
      poNumber: "",
    },
    setFilters: () => {},
    activeFilterCount: 0,
  });

export const useDashboardFilters = () => useContext(DashboardFiltersContext);

export function DashboardFilters() {
  const { filters, setFilters } = useDashboardFilters();
  const [filterInfo, setFilterInfo] = useState<string | null>(null);

  // Track which filters have been loaded
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<FilterOptions>({
    years: [],
    lines: [],
    series: [],
    statuses: [],
  });
  const { getAuthHeaders } = useAuth();

  // Function to fetch filter options from API
  const fetchFilterOptions = useCallback(
    async (year?: string, month?: string) => {
      try {
        setLoading(true);
        console.log("Fetching filter options with params:", { year, month });

        // Build query params
        const params = new URLSearchParams();
        if (year) params.append("year", year);
        if (month) params.append("month", month);

        const response = await fetch(
          `/api/dashboard/filter-options?${params.toString()}`,
          {
            headers: getAuthHeaders(),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch filter options");
        }

        const data = await response.json();
        console.log("Loaded filter options:", data);

        setOptions({
          years: data.years || [],
          lines: data.lines || [],
          series: data.series || [],
          statuses: data.statuses || [],
        });

        // If we don't have a year selected yet, select the most recent year
        if (!filters.year && data.years && data.years.length > 0) {
          setFilters((prev) => ({
            ...prev,
            year: data.years[0].toString(),
          }));
        }
      } catch (error) {
        console.error("Error fetching filter options:", error);
      } finally {
        setLoading(false);
      }
    },
    [filters.year, setFilters, setLoading, setOptions, getAuthHeaders]
  );

  // Load filter options on mount
  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  // Reload dependent options when year/month change
  useEffect(() => {
    if (filters.year) {
      fetchFilterOptions(
        filters.year,
        filters.month !== "All" ? filters.month : undefined
      );
    }
  }, [filters.year, filters.month, fetchFilterOptions]);

  // Set info message when certain filters are selected
  useEffect(() => {
    if (filters.status !== "All") {
      setFilterInfo("Status filter applies to production orders only");
    } else if (filters.series !== "All") {
      setFilterInfo(
        `Series filter uses the first ${SERIES_FILTER_DIGITS} digits of production order item name`
      );
    } else {
      setFilterInfo(null);
    }
  }, [filters.status, filters.series]);

  // Handle filter changes
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = e.target.value;
    console.log("Year changed to:", year);

    // Reset month when year changes
    setFilters({ ...filters, year, month: "All" });
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ ...filters, month: e.target.value });
  };

  const handleLineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ ...filters, line: e.target.value });
  };

  const handleSeriesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ ...filters, series: e.target.value });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ ...filters, status: e.target.value });
  };

  const handlePONumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, poNumber: e.target.value });
  };

  // Calculate how many filters are active
  const isFiltered =
    filters.month !== "All" ||
    filters.line !== "All" ||
    filters.series !== "All" ||
    filters.status !== "All" ||
    filters.poNumber !== "";

  const activeFilters = [
    filters.month !== "All" ? "Month" : null,
    filters.line !== "All" ? "Line" : null,
    filters.series !== "All" ? "Series" : null,
    filters.status !== "All" ? "Status" : null,
    filters.poNumber ? "PO Number" : null,
  ].filter(Boolean);

  const activeFilterCount = activeFilters.length;

  const resetFilters = () => {
    // Keep the current year but reset all other filters
    setFilters({
      year: filters.year, // Keep the current year selection
      month: "All",
      line: "All",
      series: "All",
      status: "All",
      poNumber: "",
    });

    console.log("Filters reset to defaults (keeping selected year)");
  };

  // Generate month options
  const months = [
    { value: "All", label: "All Months" },
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  return (
    <div className="space-y-4 w-full dark:bg-black">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFilterCount} active
            </Badge>
          )}
        </h2>

        {isFiltered && (
          <button
            onClick={resetFilters}
            className="text-sm text-blue-600 hover:text-blue-800 mt-2 sm:mt-2 sm:me-2"
          >
            Reset Filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Year Filter */}
        <div className="flex flex-col h-full">
          <Label htmlFor="year-filter" className="mb-2">
            Year
          </Label>
          <select
            id="year-filter"
            className="h-10 w-full rounded-md border border-gray-300 bg-white dark:bg-black px-3 py-2 text-sm"
            value={filters.year}
            onChange={handleYearChange}
            disabled={loading || options.years.length === 0}
            aria-label="Filter by year"
          >
            {loading ? (
              <option>Loading...</option>
            ) : options.years.length > 0 ? (
              options.years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))
            ) : (
              <option value="">No data available</option>
            )}
          </select>
        </div>

        {/* Month Filter */}
        <div className="flex flex-col h-full">
          <Label htmlFor="month-filter" className="mb-2">
            Month
          </Label>
          <select
            id="month-filter"
            className="h-10 w-full rounded-md border border-gray-300 bg-white dark:bg-black px-3 py-2 text-sm"
            value={filters.month}
            onChange={handleMonthChange}
            disabled={loading || !filters.year}
            aria-label="Filter by month"
          >
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>

        {/* Line Filter - now it's lineNo in the database */}
        <div className="flex flex-col h-full">
          <Label htmlFor="line-filter" className="mb-2">
            Production Line
          </Label>
          <select
            id="line-filter"
            className="h-10 w-full rounded-md border border-gray-300 bg-white dark:bg-black px-3 py-2 text-sm"
            value={filters.line}
            onChange={handleLineChange}
            disabled={loading || options.lines.length === 0}
            aria-label="Filter by production line"
          >
            <option value="All">All Lines</option>
            {options.lines.map((line) => (
              <option key={line} value={line}>
                {line}
              </option>
            ))}
          </select>
        </div>

        {/* Series Filter - comes from itemName in the ProductionOrder model */}
        <div className="flex flex-col h-full">
          <Label htmlFor="series-filter" className="flex items-center mb-2">
            Series
            <Info
              className="ml-1 text-blue-500 h-4 w-4"
              aria-label={`Series filter uses the first ${SERIES_FILTER_DIGITS} digits of production order item name`}
            />
          </Label>
          <select
            id="series-filter"
            className="h-10 w-full rounded-md border border-gray-300 bg-white dark:bg-black px-3 py-2 text-sm"
            value={filters.series}
            onChange={handleSeriesChange}
            disabled={loading || options.series.length === 0}
            aria-label="Filter by product series"
          >
            <option value="All">All Series</option>
            {options.series.map((series) => (
              <option key={series} value={series}>
                {series}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex flex-col h-full">
          <Label htmlFor="status-filter" className="flex items-center mb-2">
            Status
            {filters.status !== "All" && (
              <Info
                className="ml-1 text-blue-500 h-4 w-4"
                aria-label="Status filter applies to production orders only"
              />
            )}
          </Label>
          <select
            id="status-filter"
            className="h-10 w-full rounded-md border border-gray-300 bg-white dark:bg-black px-3 py-2 text-sm"
            value={filters.status}
            onChange={handleStatusChange}
            disabled={loading || options.statuses.length === 0}
            aria-label="Filter by production order status"
          >
            <option value="All">All Statuses</option>
            {options.statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {/* PO Number Filter */}
        <div className="flex flex-col h-full">
          <Label htmlFor="po-filter" className="mb-2">
            PO Number
          </Label>
          <Input
            id="po-filter"
            type="text"
            className="h-10"
            placeholder="Enter PO number"
            value={filters.poNumber}
            onChange={handlePONumberChange}
            aria-label="Filter by production order number"
          />
        </div>
      </div>

      {filterInfo && (
        <div className="text-sm text-blue-600 flex items-center mt-2">
          <Info className="mr-1 h-4 w-4" />
          {filterInfo}
        </div>
      )}
    </div>
  );
}
