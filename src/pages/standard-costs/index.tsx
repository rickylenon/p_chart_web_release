import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState, useCallback, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Head from "next/head";
import { debounce } from "lodash";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { withAdminAuth } from "@/lib/clientAuth";
import { DataTable, Column } from "@/components/shared/DataTable";
import {
  Pencil,
  CheckCircle,
  XCircle,
  Download,
  Upload,
  FileDown,
  FileUp,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StandardCost {
  id: number;
  itemName: string;
  description: string | null;
  costPerUnit: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

function StandardCostsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [standardCosts, setStandardCosts] = useState<StandardCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortField, setSortField] = useState("itemName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isImporting, setIsImporting] = useState(false);
  const [replaceAll, setReplaceAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch standard costs with pagination and filters
  const fetchStandardCosts = useCallback(async () => {
    try {
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter) params.append("active", statusFilter);
      if (sortField) params.append("sortField", sortField);
      if (sortDirection) params.append("sortDirection", sortDirection);

      console.log(
        "Fetching standard costs with params:",
        Object.fromEntries(params.entries())
      );

      const response = await fetch(`/api/standard-costs?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch standard costs");
      }

      const result: PaginatedResult<StandardCost> = await response.json();
      console.log("Fetched standard costs data:", result);

      setStandardCosts(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error("Error fetching standard costs:", err);
      setError("Failed to load standard costs. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchQuery, statusFilter, sortField, sortDirection]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchStandardCosts();
    }
  }, [status, fetchStandardCosts]);

  // Debounced search handler
  const debouncedSearch = useCallback(
    (value: string) => {
      console.log("Debounced search with value:", value);
      setSearchQuery(value);
      setPage(1); // Reset to first page on new search
    },
    [setSearchQuery, setPage]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log("Search input changed:", value);
    setSearchInput(value);
    debounce(() => debouncedSearch(value), 500)();
  };

  const handleFilterChange = (type: string, value: string) => {
    switch (type) {
      case "status":
        setStatusFilter(value);
        break;
      default:
        break;
    }
    setPage(1); // Reset to first page on filter change
  };

  const handleSortChange = (field: string, direction: "asc" | "desc") => {
    console.log(`Sorting by ${field} in ${direction} order`);
    setSortField(field);
    setSortDirection(direction);
  };

  const handleAddStandardCost = () => {
    router.push("/standard-costs/add");
  };

  const handleEditStandardCost = (id: number) => {
    router.push(`/standard-costs/edit/${id}`);
  };

  const handleToggleStandardCostStatus = async (
    id: number,
    currentStatus: boolean
  ) => {
    try {
      const action = currentStatus ? "deactivate" : "activate";

      console.log(
        `Toggling standard cost ${id} status to ${
          !currentStatus ? "active" : "inactive"
        }`
      );

      const response = await fetch(`/api/standard-costs/${id}/${action}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} standard cost`);
      }

      toast.success(`Standard cost ${action}d successfully`);
      fetchStandardCosts();
    } catch (err) {
      console.error(
        `Error ${currentStatus ? "deactivating" : "activating"} standard cost:`,
        err
      );
      toast.error(
        err instanceof Error
          ? err.message
          : `Failed to ${
              currentStatus ? "deactivate" : "activate"
            } standard cost`
      );
    }
  };

  const handleExportToExcel = async () => {
    try {
      const response = await fetch("/api/standard-costs/export", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to export standard costs");
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        response.headers
          .get("Content-Disposition")
          ?.split("filename=")[1]
          ?.replace(/"/g, "") || "standard_costs.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Standard costs exported successfully");
    } catch (error) {
      console.error("Error exporting standard costs:", error);
      toast.error("Failed to export standard costs");
    }
  };

  const handleImportButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch("/api/standard-costs/template", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to download template");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "standard_costs_template.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Excel template downloaded successfully");
    } catch (error) {
      console.error("Error downloading template:", error);
      toast.error("Failed to download template");
    }
  };

  const handleDownloadCSVTemplate = async () => {
    try {
      const response = await fetch("/api/standard-costs/template.csv", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to download CSV template");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "standard_costs_template.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("CSV template downloaded successfully");
    } catch (error) {
      console.error("Error downloading CSV template:", error);
      toast.error("Failed to download CSV template");
    }
  };

  const handleImportFromExcel = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Show confirmation dialog for Replace All mode
    if (replaceAll) {
      const confirmed = window.confirm(
        "⚠️ Replace All Mode\n\nThis will DELETE all existing standard costs and replace them with the imported data.\n\nThis action cannot be undone. Are you sure you want to continue?"
      );
      if (!confirmed) {
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
    }

    try {
      setIsImporting(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("replaceAll", replaceAll.toString());

      const response = await fetch("/api/standard-costs/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import file");
      }

      let successMessage = replaceAll
        ? `Replace completed: ${data.deletedCount} deleted, ${data.successCount} created, ${data.errorCount} errors`
        : `Import completed: ${data.successCount} imported, ${data.errorCount} errors`;

      if (data.productionOrdersUpdated > 0) {
        successMessage += `. Updated ${data.productionOrdersUpdated} production orders.`;
      }
      toast.success(successMessage);

      if (data.errors && data.errors.length > 0) {
        console.log("Import errors:", data.errors);
        // Show first few errors to user if any
        if (data.errorCount > 0) {
          const errorSummary = data.errors.slice(0, 3).join("\n");
          toast.error(
            `Some records failed:\n${errorSummary}${
              data.errorCount > 3 ? "\n...and more" : ""
            }`
          );
        }
      }

      // Refresh the data
      fetchStandardCosts();
    } catch (error) {
      console.error("Error importing file:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to import file"
      );
    } finally {
      setIsImporting(false);
      setReplaceAll(false); // Reset the replace all flag
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Define table columns
  const columns: Column<StandardCost>[] = [
    {
      key: "itemName",
      header: "Item Name",
      sortable: true,
      render: (cost) => <div className="font-medium">{cost.itemName}</div>,
    },
    {
      key: "costPerUnit",
      header: "Cost Per Unit",
      sortable: true,
      render: (cost) => {
        const numericValue =
          typeof cost.costPerUnit === "number"
            ? cost.costPerUnit
            : parseFloat(String(cost.costPerUnit));

        return (
          <div className="font-mono">
            {cost.currency}{" "}
            {isNaN(numericValue) ? "0.0000" : numericValue.toFixed(4)}
          </div>
        );
      },
    },
    {
      key: "currency",
      header: "Currency",
      sortable: true,
      render: (cost) => (
        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
          {cost.currency}
        </span>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      sortable: true,
      render: (cost) => (
        <span
          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            cost.isActive
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {cost.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (cost) => (
        <div className="flex justify-end space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEditStandardCost(cost.id)}
            className="text-blue-600 hover:text-blue-900"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              handleToggleStandardCostStatus(cost.id, cost.isActive)
            }
            className={
              cost.isActive
                ? "text-red-600 hover:text-red-900"
                : "text-green-600 hover:text-green-900"
            }
          >
            {cost.isActive ? (
              <XCircle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Head>
        <title>Standard Costs Management - P-Chart System</title>
      </Head>
      <DashboardLayout>
        <div className="py-6">
          <PageHeader
            title="Standard Costs Management"
            description="Add and manage standard costs for defect cost calculations"
            searchPlaceholder="Search by item name, description, etc."
            searchValue={searchInput}
            onSearchChange={handleSearchChange}
            actions={
              <div className="flex space-x-2">
                <Button
                  onClick={handleExportToExcel}
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                      disabled={isImporting}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isImporting ? "Importing..." : "Import"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[250px]">
                    <div className="p-3 border-b">
                      <label className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={replaceAll}
                          onChange={(e) => setReplaceAll(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-gray-700">
                          Replace all existing records
                        </span>
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        {replaceAll
                          ? "⚠️ This will delete all existing standard costs"
                          : "Update existing records or add new ones"}
                      </p>
                    </div>
                    <DropdownMenuItem onClick={handleImportButtonClick}>
                      <FileUp className="h-4 w-4 mr-2" />
                      Upload Excel/CSV File
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadTemplate}>
                      <FileDown className="h-4 w-4 mr-2" />
                      Download Excel Template
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadCSVTemplate}>
                      <FileDown className="h-4 w-4 mr-2" />
                      Download CSV Template
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleImportFromExcel}
                  aria-label="Import Excel or CSV file"
                />
                <Button
                  onClick={handleAddStandardCost}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Add New Standard Cost
                </Button>
              </div>
            }
          />

          {/* Advanced filters */}
          <div className="mb-6 p-4 bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label
                  htmlFor="statusFilter"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
                >
                  Status
                </label>
                <select
                  id="statusFilter"
                  value={statusFilter}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded shadow-sm"
                  aria-label="Filter by status"
                >
                  <option value="">All Statuses</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <DataTable
            data={standardCosts}
            columns={columns}
            keyField="id"
            isLoading={loading}
            error={error || undefined}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            pagination={{
              currentPage: page,
              totalPages: totalPages,
              totalItems: total,
              itemsPerPage: limit,
              onPageChange: (newPage) => setPage(newPage),
              onItemsPerPageChange: (newLimit) => {
                setLimit(newLimit);
                setPage(1); // Reset to first page when changing limit
              },
            }}
            emptyMessage="No standard costs found matching the current filters."
          />
        </div>
      </DashboardLayout>
    </>
  );
}

export default withAdminAuth(StandardCostsPage);
